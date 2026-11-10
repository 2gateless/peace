import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { resolveMedication, syncHeadacheLogMedicationText } from "./medications.js";

const PRESSURE_BAND_WIDTH = 5;
const PRESSURE_CHANGE_WINDOW_MS = 24 * 3600000;

export function filterHeadacheLogs(db, userId, params = {}, order = "DESC") {
  const dir = order === "ASC" ? "ASC" : "DESC";
  const clauses = ["user_id = ?"];
  const args = [userId];

  if (params.start_time) {
    clauses.push("substr(start_time, 1, 10) >= ?");
    args.push(String(params.start_time).slice(0, 10));
  }
  if (params.end_time) {
    clauses.push("(end_time IS NULL OR substr(end_time, 1, 10) <= ?)");
    args.push(String(params.end_time).slice(0, 10));
  }

  let logs = db
    .prepare(`SELECT * FROM headache_logs WHERE ${clauses.join(" AND ")} ORDER BY start_time ${dir}`)
    .all(...args);

  if (params.triggers) {
    const q = String(params.triggers).trim().toLowerCase();
    logs = logs.filter((l) => String(l.triggers || "").toLowerCase().includes(q));
  }
  if (params.medication) {
    const q = String(params.medication).trim().toLowerCase();
    logs = logs.filter((l) => String(l.medication || "").toLowerCase().includes(q));
  }

  return logs;
}

export function attachDosesAndPhotosToLogs(db, logs) {
  if (logs.length === 0) return [];
  const ids = logs.map((l) => l.id);
  const placeholders = ids.map(() => "?").join(",");

  const doses = db
    .prepare(
      `SELECT d.*, m.name AS medication_name, m.color AS medication_color, m.kind AS medication_kind
       FROM medication_doses d
       JOIN medications m ON m.id = d.medication_id
       WHERE d.headache_log_id IN (${placeholders})
       ORDER BY d.taken_at ASC, d.id ASC`
    )
    .all(...ids);

  const photos = db
    .prepare(`SELECT * FROM headache_photos WHERE headache_log_id IN (${placeholders}) ORDER BY id ASC`)
    .all(...ids);

  const dosesByLog = new Map();
  for (const d of doses) {
    if (!dosesByLog.has(d.headache_log_id)) dosesByLog.set(d.headache_log_id, []);
    dosesByLog.get(d.headache_log_id).push(d);
  }

  const photosByLog = new Map();
  for (const p of photos) {
    if (!photosByLog.has(p.headache_log_id)) photosByLog.set(p.headache_log_id, []);
    photosByLog.get(p.headache_log_id).push(p);
  }

  return logs.map((log) => ({
    ...log,
    doses: dosesByLog.get(log.id) || [],
    photos: photosByLog.get(log.id) || [],
    trigger_list: String(log.triggers || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }));
}

export function computeChartData(logsWithRelations) {
  const chronological = [...logsWithRelations].sort((a, b) => a.start_time.localeCompare(b.start_time));

  const intensityData = chronological.map((log) => ({
    x: log.start_time,
    y: Number(log.intensity)
  }));

  const triggerCounts = {};
  for (const log of chronological) {
    for (const trig of log.trigger_list || []) {
      triggerCounts[trig] = (triggerCounts[trig] || 0) + 1;
    }
  }
  const triggerData = Object.fromEntries(
    Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  );

  const medCounts = {};
  const medColors = {};
  for (const log of chronological) {
    if (log.doses?.length) {
      for (const d of log.doses) {
        medCounts[d.medication_name] = (medCounts[d.medication_name] || 0) + 1;
        medColors[d.medication_name] = d.medication_color;
      }
    } else if (log.medication) {
      for (const name of log.medication.split(",").map((s) => s.trim()).filter(Boolean)) {
        medCounts[name] = (medCounts[name] || 0) + 1;
      }
    }
  }
  const medicationData = Object.fromEntries(
    Object.entries(medCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  );

  const hourlyBuckets = Array.from({ length: 12 }, (_, idx) => ({
    start_hour: idx * 2,
    count: 0,
    total_intensity: 0
  }));
  for (const log of chronological) {
    const hour = Number(log.start_time.slice(11, 13)) || 0;
    const bucket = hourlyBuckets[Math.min(11, Math.floor(hour / 2))];
    bucket.count += 1;
    bucket.total_intensity += Number(log.intensity);
  }
  const hourlyData = hourlyBuckets.map((b) => ({
    start_hour: b.start_hour,
    frequency: b.count,
    avg_intensity: b.count > 0 ? Number((b.total_intensity / b.count).toFixed(2)) : 0
  }));

  const perDayCounts = {};
  for (const log of chronological) {
    const day = log.start_time.slice(0, 10);
    perDayCounts[day] = (perDayCounts[day] || 0) + 1;
  }
  const attacksPerDayData = Object.entries(perDayCounts).map(([x, y]) => ({ x, y }));

  const durationData = chronological
    .filter((l) => l.end_time)
    .map((l) => {
      const hours = (new Date(l.end_time.replace(" ", "T")) - new Date(l.start_time.replace(" ", "T"))) / 3600000;
      return {
        x: l.start_time,
        y: Number(Math.max(0, hours).toFixed(2)),
        intensity: Number(l.intensity)
      };
    });

  const pressureReadings = chronological.filter((l) => l.barometric_pressure !== null && l.barometric_pressure !== undefined);
  let pressureData = [];
  if (pressureReadings.length > 0) {
    const bands = new Map();
    for (const log of pressureReadings) {
      const band = Math.floor(Number(log.barometric_pressure) / PRESSURE_BAND_WIDTH) * PRESSURE_BAND_WIDTH;
      if (!bands.has(band)) bands.set(band, []);
      bands.get(band).push(log);
    }
    const minBand = Math.min(...bands.keys());
    const maxBand = Math.max(...bands.keys());
    for (let b = minBand; b <= maxBand; b += PRESSURE_BAND_WIDTH) {
      const list = bands.get(b) || [];
      pressureData.push({
        label: `${b}–${b + PRESSURE_BAND_WIDTH}`,
        frequency: list.length,
        avg_intensity: list.length > 0 ? Number((list.reduce((s, l) => s + l.intensity, 0) / list.length).toFixed(2)) : 0
      });
    }
  }

  const pressureChangeData = [];
  for (let i = 1; i < pressureReadings.length; i++) {
    const prev = pressureReadings[i - 1];
    const curr = pressureReadings[i];
    const elapsed = new Date(curr.start_time.replace(" ", "T")) - new Date(prev.start_time.replace(" ", "T"));
    if (elapsed > 0 && elapsed <= PRESSURE_CHANGE_WINDOW_MS) {
      pressureChangeData.push({
        x: curr.start_time,
        y: Number((Number(curr.barometric_pressure) - Number(prev.barometric_pressure)).toFixed(1)),
        pressure: Number(curr.barometric_pressure),
        hours: Number((elapsed / 3600000).toFixed(1)),
        intensity: Number(curr.intensity)
      });
    }
  }

  return {
    intensity_data: intensityData,
    trigger_data: triggerData,
    medication_data: medicationData,
    medication_colors: medColors,
    hourly_data: hourlyData,
    attacks_per_day_data: attacksPerDayData,
    duration_data: durationData,
    pressure_data: pressureData,
    pressure_change_data: pressureChangeData
  };
}

export function logsToCsv(logs) {
  return stringify(
    logs.map((l) => [
      l.start_time.replace("T", " ").slice(0, 19),
      l.end_time ? l.end_time.replace("T", " ").slice(0, 19) : "",
      l.intensity,
      l.medication || "",
      l.triggers || "",
      l.notes || "",
      l.barometric_pressure ?? ""
    ]),
    {
      header: true,
      columns: ["start_time", "end_time", "intensity", "medication", "triggers", "notes", "barometric_pressure"]
    }
  );
}

function normalizeTimeValue(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const parsed = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return null;
  // Preserve YYYY-MM-DDTHH:MM if already formatted cleanly
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (m) return `${m[1]}T${m[2]}`;
  const y = parsed.getFullYear();
  const mo = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mm = String(parsed.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${hh}:${mm}`;
}

export function importLogsFromCsv(db, userId, csvBuffer) {
  const text = Buffer.isBuffer(csvBuffer) ? csvBuffer.toString("utf8") : String(csvBuffer);
  const rows = parse(text, {
    columns: (headers) => headers.map((h) => String(h).trim().toLowerCase().replace(/\s+/g, "_")),
    skip_empty_lines: true,
    bom: true
  });

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    // Support both native headers and Migraine Buddy headers
    const startTime = normalizeTimeValue(row.start_time || row.started || row.start);
    const endTime = normalizeTimeValue(row.end_time || row.ended || row.end);
    const intensity = Math.min(10, Math.max(1, parseInt(row.intensity || row.pain_level || "5", 10) || 5));
    const medicationText = String(row.medication || row.medications || "").trim() || null;
    const triggers = String(row.triggers || "").trim() || null;
    const notes = String(row.notes || "").trim() || null;
    const rawPressure = parseFloat(row.barometric_pressure);
    const pressure =
      Number.isFinite(rawPressure) && rawPressure >= 870 && rawPressure <= 1085 ? rawPressure : null;

    if (!startTime) {
      skipped++;
      continue;
    }

    const dup = db
      .prepare("SELECT id FROM headache_logs WHERE user_id = ? AND substr(start_time, 1, 16) = ?")
      .get(userId, startTime);
    if (dup) {
      skipped++;
      continue;
    }

    const info = db
      .prepare(
        `INSERT INTO headache_logs (user_id, start_time, end_time, intensity, medication, triggers, notes, barometric_pressure)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(userId, startTime, endTime, intensity, medicationText, triggers, notes, pressure);

    if (medicationText) {
      for (const medName of medicationText.split(",").map((s) => s.trim()).filter(Boolean)) {
        const med = resolveMedication(db, userId, medName);
        if (med) {
          db.prepare(
            "INSERT INTO medication_doses (user_id, medication_id, headache_log_id, taken_at) VALUES (?, ?, ?, ?)"
          ).run(userId, med.id, info.lastInsertRowid, startTime);
        }
      }
      syncHeadacheLogMedicationText(db, info.lastInsertRowid);
    }

    imported++;
  }

  return { imported, skipped };
}

