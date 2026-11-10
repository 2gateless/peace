import { stringify } from "csv-stringify/sync";

export const MEDICATION_KINDS = ["abortive", "oxygen", "preventive", "other"];
export const MEDICATION_UNITS = ["mg", "mcg", "g", "ml", "L/min", "IU", "units", "puffs", "sprays", "tablets"];
export const MEDICATION_COLORS = [
  "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899",
  "#6366f1", "#14b8a6", "#84cc16", "#f97316", "#64748b", "#a855f7"
];
export const MEDICATION_FREQUENCIES = ["as_needed", "daily", "twice_daily", "weekly", "monthly", "quarterly"];
export const EFFECTIVENESS_OPTIONS = ["helped", "no_effect", "made_worse"];

const INTERVAL_DAYS = {
  daily: 1,
  twice_daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90
};

export function inferMedicationKind(name) {
  const lower = String(name || "").toLowerCase();
  if (/\b(oxygen|o2)\b/.test(lower) || lower.includes("산소")) return "oxygen";
  if (/(verapamil|lithium|topiramate|prednisone|prednisolone|galcanezumab|emgality|melatonin|valproate)/.test(lower)) {
    return "preventive";
  }
  if (/(sumatriptan|zolmitriptan|imitrex|triptan|lidocaine|octreotide|dhe)/.test(lower)) {
    return "abortive";
  }
  return "other";
}

function defaultColorFor(name, kind) {
  if (kind === "oxygen") return "#0ea5e9";
  let hash = 0;
  for (const ch of String(name || "").toLowerCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return MEDICATION_COLORS[hash % MEDICATION_COLORS.length];
}

export function formatAmount(amount) {
  if (amount === null || amount === undefined || amount === "") return null;
  const num = Number(amount);
  if (!Number.isFinite(num)) return null;
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(2)));
}

export function formatDoseLabel(dose, medicationName) {
  const parts = [medicationName];
  if (dose.amount !== null && dose.amount !== undefined) {
    const amountLabel = [formatAmount(dose.amount), dose.unit].filter(Boolean).join(" ");
    if (amountLabel) parts.push(amountLabel);
  }
  if (dose.duration_minutes) parts.push(`${dose.duration_minutes} min`);
  return parts.join(" ");
}

export function listMedications(db, userId, { includeArchived = false } = {}) {
  const sql = includeArchived
    ? "SELECT * FROM medications WHERE user_id = ? ORDER BY LOWER(name) ASC"
    : "SELECT * FROM medications WHERE user_id = ? AND archived_at IS NULL ORDER BY LOWER(name) ASC";
  return db.prepare(sql).all(userId);
}

export function getMedication(db, userId, id) {
  return db.prepare("SELECT * FROM medications WHERE user_id = ? AND id = ?").get(userId, id) || null;
}

export function resolveMedication(db, userId, rawName, requestedKind = null) {
  const name = String(rawName || "").trim().replace(/\s+/g, " ");
  if (!name) return null;

  const existing = db
    .prepare("SELECT * FROM medications WHERE user_id = ? AND LOWER(TRIM(name)) = LOWER(?)")
    .get(userId, name);
  if (existing) return existing;

  const kind = MEDICATION_KINDS.includes(requestedKind) ? requestedKind : inferMedicationKind(name);
  const unit = kind === "oxygen" ? "L/min" : null;
  const color = defaultColorFor(name, kind);

  const info = db
    .prepare(
      `INSERT INTO medications (user_id, name, kind, unit, color) VALUES (?, ?, ?, ?, ?)`
    )
    .run(userId, name, kind, unit, color);

  return db.prepare("SELECT * FROM medications WHERE id = ?").get(info.lastInsertRowid);
}

export function isMedicationDue(db, med, todayIso) {
  if (!med || med.archived_at || med.frequency === "as_needed") return false;
  const days = INTERVAL_DAYS[med.frequency];
  if (!days) return false;

  const latest = db
    .prepare("SELECT taken_at FROM medication_doses WHERE medication_id = ? ORDER BY taken_at DESC LIMIT 1")
    .get(med.id);
  if (!latest) return true;

  if (med.frequency === "daily" || med.frequency === "twice_daily") {
    const todayCount = db
      .prepare("SELECT COUNT(*) as c FROM medication_doses WHERE medication_id = ? AND substr(taken_at, 1, 10) = ?")
      .get(med.id, todayIso).c;
    return med.frequency === "twice_daily" ? todayCount < 2 : todayCount < 1;
  }

  const lastDate = new Date(`${latest.taken_at.slice(0, 10)}T00:00:00Z`);
  const todayDate = new Date(`${todayIso}T00:00:00Z`);
  const elapsedDays = Math.round((todayDate - lastDate) / 86400000);
  return elapsedDays >= days;
}

export function getDueMedications(db, userId, todayIso) {
  const scheduled = db
    .prepare("SELECT * FROM medications WHERE user_id = ? AND archived_at IS NULL AND frequency != 'as_needed' ORDER BY LOWER(name) ASC")
    .all(userId);
  return scheduled.filter((med) => isMedicationDue(db, med, todayIso));
}

export function syncHeadacheLogMedicationText(db, headacheLogId) {
  if (!headacheLogId) return;
  const doses = db
    .prepare(
      `SELECT d.*, m.name AS medication_name
       FROM medication_doses d
       JOIN medications m ON m.id = d.medication_id
       WHERE d.headache_log_id = ?
       ORDER BY d.taken_at ASC, d.id ASC`
    )
    .all(headacheLogId);

  const text = doses.map((d) => formatDoseLabel(d, d.medication_name)).join(", ") || null;
  db.prepare("UPDATE headache_logs SET medication = ?, updated_at = datetime('now') WHERE id = ?").run(text, headacheLogId);
}

export function attachOngoingAttackId(db, userId, takenAt, medKind) {
  if (medKind === "preventive") return null;
  const takenDate = new Date(takenAt.replace(" ", "T"));
  if (Number.isNaN(takenDate.getTime())) return null;
  const windowStart = new Date(takenDate.getTime() - 12 * 3600000).toISOString().slice(0, 16);

  const ongoing = db
    .prepare(
      `SELECT id FROM headache_logs
       WHERE user_id = ? AND end_time IS NULL AND start_time <= ? AND start_time >= ?
       ORDER BY start_time DESC LIMIT 1`
    )
    .get(userId, takenAt.slice(0, 16), windowStart);

  return ongoing ? ongoing.id : null;
}

export function mergeMedications(db, userId, sourceId, targetId) {
  const source = getMedication(db, userId, sourceId);
  const target = getMedication(db, userId, targetId);
  if (!source || !target || source.id === target.id) return false;

  const affectedLogs = db
    .prepare("SELECT DISTINCT headache_log_id FROM medication_doses WHERE medication_id = ? AND headache_log_id IS NOT NULL")
    .all(source.id)
    .map((r) => r.headache_log_id);

  db.prepare("UPDATE medication_doses SET medication_id = ?, updated_at = datetime('now') WHERE medication_id = ? AND user_id = ?")
    .run(target.id, source.id, userId);
  db.prepare("DELETE FROM medications WHERE id = ? AND user_id = ?").run(source.id, userId);

  for (const logId of affectedLogs) {
    syncHeadacheLogMedicationText(db, logId);
  }
  return true;
}

export function computeMedicationInsights(db, userId, logs, filters = {}, todayIso = new Date().toISOString().slice(0, 10)) {
  const meds = listMedications(db, userId, { includeArchived: true });
  if (meds.length === 0) return { summaries: [], adherenceByWeek: [] };

  const logIds = logs.map((l) => l.id);
  const logById = new Map(logs.map((l) => [l.id, l]));

  const attackDoses = logIds.length
    ? db
        .prepare(
          `SELECT * FROM medication_doses WHERE user_id = ? AND headache_log_id IN (${logIds.map(() => "?").join(",")})`
        )
        .all(userId, ...logIds)
    : [];

  const toIso = filters.end_time ? filters.end_time.slice(0, 10) : todayIso;
  const firstDoseRow = db.prepare("SELECT MIN(taken_at) AS min_t FROM medication_doses WHERE user_id = ?").get(userId);
  const earliest = firstDoseRow?.min_t ? firstDoseRow.min_t.slice(0, 10) : toIso;
  const oneYearAgoDate = new Date(`${toIso}T00:00:00Z`);
  oneYearAgoDate.setUTCDate(oneYearAgoDate.getUTCDate() - 364);
  const oneYearAgoIso = oneYearAgoDate.toISOString().slice(0, 10);
  const fromIso = filters.start_time ? filters.start_time.slice(0, 10) : earliest > oneYearAgoIso ? earliest : oneYearAgoIso;

  const periodDoses = db
    .prepare("SELECT * FROM medication_doses WHERE user_id = ? AND substr(taken_at, 1, 10) BETWEEN ? AND ?")
    .all(userId, fromIso, toIso);

  const attackDosesByMed = new Map();
  for (const d of attackDoses) {
    if (!attackDosesByMed.has(d.medication_id)) attackDosesByMed.set(d.medication_id, []);
    attackDosesByMed.get(d.medication_id).push(d);
  }

  const periodDosesByMed = new Map();
  for (const d of periodDoses) {
    if (!periodDosesByMed.has(d.medication_id)) periodDosesByMed.set(d.medication_id, []);
    periodDosesByMed.get(d.medication_id).push(d);
  }

  const summaries = [];
  for (const med of meds) {
    const aDoses = attackDosesByMed.get(med.id) || [];
    const pDoses = periodDosesByMed.get(med.id) || [];
    if (aDoses.length === 0 && pDoses.length === 0) continue;

    const rated = aDoses.filter((d) => d.effectiveness);
    const helped = rated.filter((d) => d.effectiveness === "helped").length;
    const noEffect = rated.filter((d) => d.effectiveness === "no_effect").length;
    const madeWorse = rated.filter((d) => d.effectiveness === "made_worse").length;
    const severe = rated.filter((d) => (logById.get(d.headache_log_id)?.intensity || 0) >= 8);
    const severeHelped = severe.filter((d) => d.effectiveness === "helped").length;
    const reliefMins = aDoses.map((d) => d.minutes_to_relief).filter((v) => v !== null && v !== undefined);

    const uniqueDoseIds = new Set([...aDoses.map((d) => d.id), ...pDoses.map((d) => d.id)]);

    let adherence = null;
    if (med.frequency !== "as_needed" && pDoses.length > 0) {
      const takenDays = new Set(pDoses.map((d) => d.taken_at.slice(0, 10)));
      const totalDays = Math.max(1, Math.round((new Date(`${toIso}T00:00:00Z`) - new Date(`${fromIso}T00:00:00Z`)) / 86400000) + 1);
      const expected = Math.max(1, Math.round(totalDays / (INTERVAL_DAYS[med.frequency] || 1)));
      adherence = Math.min(100, Math.round((takenDays.size / expected) * 100));
    }

    summaries.push({
      medication: med,
      doses_count: uniqueDoseIds.size,
      rated_count: rated.length,
      helped_count: helped,
      no_effect_count: noEffect,
      made_worse_count: madeWorse,
      success_rate: rated.length > 0 ? Math.round((helped * 100) / rated.length) : null,
      severe_success_rate: severe.length > 0 ? Math.round((severeHelped * 100) / severe.length) : null,
      average_minutes_to_relief:
        reliefMins.length > 0 ? Math.round(reliefMins.reduce((a, b) => a + b, 0) / reliefMins.length) : null,
      adherence
    });
  }

  return { summaries, adherenceByWeek: [] };
}

export function dosesToCsv(db, userId) {
  const rows = db
    .prepare(
      `SELECT d.taken_at, m.name AS medication, m.kind, d.amount, d.unit, d.duration_minutes,
              d.effectiveness, d.minutes_to_relief, d.headache_log_id
       FROM medication_doses d
       JOIN medications m ON m.id = d.medication_id
       WHERE d.user_id = ?
       ORDER BY d.taken_at DESC`
    )
    .all(userId);

  return stringify(
    rows.map((r) => [
      r.taken_at,
      r.medication,
      r.kind,
      r.amount ?? "",
      r.unit ?? "",
      r.duration_minutes ?? "",
      r.effectiveness ?? "",
      r.minutes_to_relief ?? "",
      r.headache_log_id ?? ""
    ]),
    {
      header: true,
      columns: [
        "taken_at",
        "medication",
        "kind",
        "amount",
        "unit",
        "duration_minutes",
        "effectiveness",
        "minutes_to_relief",
        "headache_log_id"
      ]
    }
  );
}

