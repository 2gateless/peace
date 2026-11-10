import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";
import { requireAuth, setFlash } from "../auth.js";
import { computeCycles } from "../domain/cycles.js";
import {
  attachDosesAndPhotosToLogs,
  computeChartData,
  filterHeadacheLogs,
  importLogsFromCsv,
  logsToCsv
} from "../domain/headache_logs.js";
import {
  computeMedicationInsights,
  getDueMedications,
  listMedications,
  resolveMedication,
  syncHeadacheLogMedicationText
} from "../domain/medications.js";
import { generatePdfReport } from "../domain/pdf_report.js";
import { localWallClockNow, todayIsoDate } from "../i18n.js";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  }
});

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

function parseDoseEntries(body) {
  const names = [].concat(body.dose_medication_name || []);
  const medIds = [].concat(body.dose_medication_id || []);
  const kinds = [].concat(body.dose_medication_kind || []);
  const takenAts = [].concat(body.dose_taken_at || []);
  const amounts = [].concat(body.dose_amount || []);
  const units = [].concat(body.dose_unit || []);
  const durations = [].concat(body.dose_duration_minutes || []);
  const doseIds = [].concat(body.dose_id || []);
  const destroys = [].concat(body.dose_destroy || []);

  const len = Math.max(names.length, medIds.length, takenAts.length, doseIds.length);
  const items = [];
  for (let i = 0; i < len; i++) {
    items.push({
      id: doseIds[i] ? Number(doseIds[i]) : null,
      destroy: destroys[i] === "1",
      medication_id: medIds[i] ? Number(medIds[i]) : null,
      medication_name: String(names[i] || "").trim(),
      medication_kind: String(kinds[i] || "").trim() || null,
      taken_at: String(takenAts[i] || "").trim(),
      amount: amounts[i] !== undefined && amounts[i] !== "" ? Number(amounts[i]) : null,
      unit: String(units[i] || "").trim() || null,
      duration_minutes: durations[i] ? Number(durations[i]) : null
    });
  }
  return items;
}

function saveDoseEntriesForLog(db, userId, logId, defaultTakenAt, entries) {
  for (const item of entries) {
    if (item.id) {
      if (item.destroy) {
        db.prepare("DELETE FROM medication_doses WHERE id = ? AND user_id = ? AND headache_log_id = ?").run(
          item.id,
          userId,
          logId
        );
      } else {
        db.prepare(
          `UPDATE medication_doses
           SET taken_at = ?, amount = ?, unit = ?, duration_minutes = ?, updated_at = datetime('now')
           WHERE id = ? AND user_id = ? AND headache_log_id = ?`
        ).run(
          item.taken_at || defaultTakenAt,
          Number.isFinite(item.amount) ? item.amount : null,
          item.unit,
          Number.isFinite(item.duration_minutes) ? item.duration_minutes : null,
          item.id,
          userId,
          logId
        );
      }
      continue;
    }

    if (item.destroy) continue;
    let medId = item.medication_id;
    if (!medId && item.medication_name) {
      const resolved = resolveMedication(db, userId, item.medication_name, item.medication_kind);
      medId = resolved?.id;
    }
    if (!medId) continue;

    db.prepare(
      `INSERT INTO medication_doses (user_id, medication_id, headache_log_id, taken_at, amount, unit, duration_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      medId,
      logId,
      item.taken_at || defaultTakenAt,
      Number.isFinite(item.amount) ? item.amount : null,
      item.unit,
      Number.isFinite(item.duration_minutes) ? item.duration_minutes : null
    );
  }

  syncHeadacheLogMedicationText(db, logId);
}

function savePhotosForLog(db, userId, logId, files) {
  if (!files || files.length === 0) return;
  const stmt = db.prepare(
    `INSERT INTO headache_photos (headache_log_id, user_id, filename, original_name, mime_type, size)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const file of files) {
    stmt.run(logId, userId, file.filename, file.originalname, file.mimetype, file.size);
  }
}

export function deleteLogPhotoFiles(db, userId, logId = null) {
  const rows = logId
    ? db.prepare("SELECT filename FROM headache_photos WHERE user_id = ? AND headache_log_id = ?").all(userId, logId)
    : db.prepare("SELECT filename FROM headache_photos WHERE user_id = ?").all(userId);
  for (const row of rows) {
    const filePath = path.join(UPLOAD_DIR, path.basename(row.filename));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

export function headacheLogRoutes(db) {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/headache_logs", (req, res) => {
    const today = todayIsoDate(res.locals.tzOffsetMinutes);
    const rawLogs = filterHeadacheLogs(db, req.user.id, req.query, "DESC");
    const logs = attachDosesAndPhotosToLogs(db, rawLogs);
    const cycles = computeCycles(logs, today);
    const dueMedications = getDueMedications(db, req.user.id, today);

    const allUserLogs = db
      .prepare("SELECT * FROM headache_logs WHERE user_id = ? ORDER BY start_time DESC")
      .all(req.user.id);
    const awaitingReview = attachDosesAndPhotosToLogs(db, allUserLogs.filter((l) => l.end_time))
      .map((l) => ({
        ...l,
        unrated_doses: l.doses.filter((d) => !d.effectiveness && d.medication_kind !== "preventive")
      }))
      .filter((l) => l.unrated_doses.length > 0)
      .slice(0, 3);

    const todayCount = logs.filter((l) => String(l.start_time).slice(0, 10) === today).length;
    const avgIntensity =
      logs.length > 0
        ? Number((logs.reduce((s, l) => s + Number(l.intensity), 0) / logs.length).toFixed(1))
        : 0;

    res.render("headache_logs/index", {
      title: res.locals.t("logs.title"),
      navbarTitle: res.locals.t("logs.title"),
      logs,
      cycles,
      dueMedications,
      awaitingReview,
      todayCount,
      avgIntensity,
      medications: listMedications(db, req.user.id),
      filters: req.query
    });
  });

  router.get("/headache_logs/new", (req, res) => {
    if (req.query.quick) {
      const currentAttack = db
        .prepare("SELECT * FROM headache_logs WHERE user_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1")
        .get(req.user.id);
      return res.render("headache_logs/quick", {
        title: res.locals.t("current_attack.title"),
        navbarTitle: res.locals.t("current_attack.title"),
        hideOngoingBanner: true,
        attack: currentAttack || null,
        medications: listMedications(db, req.user.id)
      });
    }

    res.render("headache_logs/form", {
      title: res.locals.t("logs.new_title"),
      navbarTitle: res.locals.t("logs.new_title"),
      log: {
        start_time: localWallClockNow(res.locals.tzOffsetMinutes),
        end_time: "",
        intensity: 5,
        triggers: "",
        notes: "",
        barometric_pressure: "",
        doses: [],
        photos: []
      },
      medications: listMedications(db, req.user.id),
      isEdit: false
    });
  });

  router.post("/headache_logs", photoUpload.array("photos", 5), (req, res) => {
    const startTime = String(req.body.start_time || "").trim() || localWallClockNow(res.locals.tzOffsetMinutes);
    const endTime = String(req.body.end_time || "").trim() || null;
    const intensity = Math.min(10, Math.max(1, parseInt(req.body.intensity || "5", 10) || 5));
    const triggers = String(req.body.triggers || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ") || null;
    const notes = String(req.body.notes || "").trim() || null;
    const rawPressure = parseFloat(req.body.barometric_pressure);
    const pressure =
      Number.isFinite(rawPressure) && rawPressure >= 870 && rawPressure <= 1085 ? rawPressure : null;

    const info = db
      .prepare(
        `INSERT INTO headache_logs (user_id, start_time, end_time, intensity, triggers, notes, barometric_pressure)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(req.user.id, startTime, endTime, intensity, triggers, notes, pressure);

    const logId = info.lastInsertRowid;
    saveDoseEntriesForLog(db, req.user.id, logId, startTime, parseDoseEntries(req.body));
    savePhotosForLog(db, req.user.id, logId, req.files);

    setFlash(res, "notice", res.locals.t("logs.created"));
    res.redirect("/headache_logs");
  });

  router.get("/headache_logs/:id", (req, res) => {
    const raw = db
      .prepare("SELECT * FROM headache_logs WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!raw) return res.status(404).send("Not found");
    const [log] = attachDosesAndPhotosToLogs(db, [raw]);

    res.render("headache_logs/show", {
      title: res.locals.t("logs.detail_title"),
      navbarTitle: res.locals.t("logs.detail_title"),
      log
    });
  });

  router.get("/headache_logs/:id/edit", (req, res) => {
    const raw = db
      .prepare("SELECT * FROM headache_logs WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!raw) return res.status(404).send("Not found");
    const [log] = attachDosesAndPhotosToLogs(db, [raw]);

    res.render("headache_logs/form", {
      title: res.locals.t("logs.edit_title"),
      navbarTitle: res.locals.t("logs.edit_title"),
      log,
      medications: listMedications(db, req.user.id),
      isEdit: true
    });
  });

  router.post("/headache_logs/:id", photoUpload.array("photos", 5), (req, res) => {
    const existing = db
      .prepare("SELECT * FROM headache_logs WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!existing) return res.status(404).send("Not found");

    const startTime = String(req.body.start_time || "").trim() || existing.start_time;
    const endTime = String(req.body.end_time || "").trim() || null;
    const intensity = Math.min(10, Math.max(1, parseInt(req.body.intensity || "5", 10) || 5));
    const triggers = String(req.body.triggers || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ") || null;
    const notes = String(req.body.notes || "").trim() || null;
    const rawPressure = parseFloat(req.body.barometric_pressure);
    const pressure =
      Number.isFinite(rawPressure) && rawPressure >= 870 && rawPressure <= 1085 ? rawPressure : null;

    db.prepare(
      `UPDATE headache_logs
       SET start_time = ?, end_time = ?, intensity = ?, triggers = ?, notes = ?, barometric_pressure = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(startTime, endTime, intensity, triggers, notes, pressure, existing.id, req.user.id);

    saveDoseEntriesForLog(db, req.user.id, existing.id, startTime, parseDoseEntries(req.body));
    savePhotosForLog(db, req.user.id, existing.id, req.files);

    setFlash(res, "notice", res.locals.t("logs.updated"));
    res.redirect("/headache_logs");
  });

  router.post("/headache_logs/:id/delete", (req, res) => {
    const existing = db
      .prepare("SELECT id FROM headache_logs WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!existing) return res.status(404).send("Not found");

    deleteLogPhotoFiles(db, req.user.id, existing.id);
    db.prepare("DELETE FROM headache_logs WHERE id = ? AND user_id = ?").run(existing.id, req.user.id);

    setFlash(res, "notice", res.locals.t("logs.deleted"));
    res.redirect("/headache_logs");
  });

  router.get("/headache_logs/:logId/photos/:photoId", (req, res) => {
    const photo = db
      .prepare("SELECT * FROM headache_photos WHERE id = ? AND headache_log_id = ? AND user_id = ?")
      .get(req.params.photoId, req.params.logId, req.user.id);
    if (!photo) return res.status(404).send("Not found");
    const filePath = path.join(UPLOAD_DIR, path.basename(photo.filename));
    if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
    res.type(photo.mime_type).sendFile(filePath);
  });

  router.post("/headache_logs/:logId/photos/:photoId/delete", (req, res) => {
    const photo = db
      .prepare("SELECT * FROM headache_photos WHERE id = ? AND headache_log_id = ? AND user_id = ?")
      .get(req.params.photoId, req.params.logId, req.user.id);
    if (!photo) return res.status(404).send("Not found");
    const filePath = path.join(UPLOAD_DIR, path.basename(photo.filename));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare("DELETE FROM headache_photos WHERE id = ? AND user_id = ?").run(photo.id, req.user.id);
    res.redirect(`/headache_logs/${req.params.logId}`);
  });

  router.get("/current_attack", (req, res) => {
    const attack = db
      .prepare("SELECT * FROM headache_logs WHERE user_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1")
      .get(req.user.id);
    res.render("current_attacks/show", {
      title: res.locals.t("current_attack.title"),
      navbarTitle: res.locals.t("current_attack.title"),
      hideOngoingBanner: true,
      attack: attack || null,
      medications: listMedications(db, req.user.id)
    });
  });

  router.post("/current_attack", (req, res) => {
    const existing = db
      .prepare("SELECT * FROM headache_logs WHERE user_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1")
      .get(req.user.id);
    if (!existing) {
      const intensity = Math.min(10, Math.max(1, parseInt(req.body.intensity || "7", 10) || 7));
      db.prepare("INSERT INTO headache_logs (user_id, start_time, intensity) VALUES (?, ?, ?)").run(
        req.user.id,
        localWallClockNow(res.locals.tzOffsetMinutes),
        intensity
      );
    }
    res.redirect("/current_attack");
  });

  router.post("/current_attack/end", (req, res) => {
    const existing = db
      .prepare("SELECT * FROM headache_logs WHERE user_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1")
      .get(req.user.id);
    if (existing) {
      db.prepare("UPDATE headache_logs SET end_time = ?, updated_at = datetime('now') WHERE id = ?").run(
        localWallClockNow(res.locals.tzOffsetMinutes),
        existing.id
      );
      setFlash(res, "notice", res.locals.t("current_attack.ended_notice"));
    }
    const returnTo = String(req.body.return_to || "").startsWith("/") ? req.body.return_to : "/headache_logs";
    res.redirect(returnTo);
  });

  router.get("/headache_log_export.csv", (req, res) => {
    const logs = filterHeadacheLogs(db, req.user.id, req.query, "DESC");
    const csv = logsToCsv(logs);
    const dateStr = todayIsoDate(res.locals.tzOffsetMinutes);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="headache_logs-${dateStr}.csv"`);
    res.send(csv);
  });

  router.post("/headache_log_import", csvUpload.single("file"), (req, res) => {
    if (!req.file) {
      setFlash(res, "warning", "Please select a CSV file.");
      return res.redirect("/settings");
    }
    try {
      const { imported, skipped } = importLogsFromCsv(db, req.user.id, req.file.buffer);
      setFlash(res, "notice", res.locals.t("settings.import_done", { imported, skipped }));
    } catch (err) {
      console.error("CSV import error:", err);
      setFlash(res, "error", "Failed to import CSV file.");
    }
    res.redirect("/headache_logs");
  });

  router.get("/headache_log_print", (req, res) => {
    const today = todayIsoDate(res.locals.tzOffsetMinutes);
    const rawLogs = filterHeadacheLogs(db, req.user.id, req.query, "DESC");
    const logs = attachDosesAndPhotosToLogs(db, rawLogs);
    const cycles = computeCycles(logs, today);
    const chartData = computeChartData(logs);
    const insights = computeMedicationInsights(db, req.user.id, logs, req.query, today);
    const avgIntensity =
      logs.length > 0
        ? Number((logs.reduce((s, l) => s + Number(l.intensity), 0) / logs.length).toFixed(1))
        : 0;
    const todayCount = logs.filter((l) => String(l.start_time).slice(0, 10) === today).length;

    res.render("headache_logs/print", {
      title: res.locals.t("logs.print"),
      navbarTitle: res.locals.t("logs.print"),
      logs,
      cycles,
      chartData,
      insights,
      avgIntensity,
      todayCount,
      medications: listMedications(db, req.user.id),
      filters: req.query
    });
  });

  router.get("/headache_log_print.pdf", async (req, res) => {
    const today = todayIsoDate(res.locals.tzOffsetMinutes);
    const rawLogs = filterHeadacheLogs(db, req.user.id, req.query, "ASC");
    const logs = attachDosesAndPhotosToLogs(db, rawLogs);
    const cycles = computeCycles(logs, today);
    const pdfBuffer = await generatePdfReport({
      logs,
      cycles,
      patientName: req.query.patient_name || req.user.name || req.user.email,
      preparedFor: req.query.prepared_for || null,
      filters: req.query
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="headache-report-${today}.pdf"`);
    res.send(pdfBuffer);
  });

  return router;
}

