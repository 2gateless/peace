import express from "express";
import { requireAuth, setFlash } from "../auth.js";
import {
  attachOngoingAttackId,
  computeMedicationInsights,
  dosesToCsv,
  getMedication,
  listMedications,
  MEDICATION_COLORS,
  MEDICATION_FREQUENCIES,
  MEDICATION_KINDS,
  MEDICATION_UNITS,
  mergeMedications,
  resolveMedication,
  syncHeadacheLogMedicationText,
  EFFECTIVENESS_OPTIONS
} from "../domain/medications.js";
import { buildTimeline } from "../domain/timeline.js";
import { localWallClockNow, todayIsoDate } from "../i18n.js";

export function medicationRoutes(db) {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/medications", (req, res) => {
    const all = listMedications(db, req.user.id, { includeArchived: true });
    const active = all.filter((m) => !m.archived_at);
    const archived = all.filter((m) => m.archived_at);

    res.render("medications/index", {
      title: res.locals.t("medications.title"),
      navbarTitle: res.locals.t("medications.title"),
      medications: active,
      archivedMedications: archived
    });
  });

  router.get("/medications/new", (req, res) => {
    res.render("medications/form", {
      title: res.locals.t("medications.new"),
      navbarTitle: res.locals.t("medications.new"),
      medication: {
        name: "",
        kind: "abortive",
        default_dose: "",
        unit: "",
        frequency: "as_needed",
        schedule_note: "",
        color: MEDICATION_COLORS[0],
        archived_at: null
      },
      isEdit: false,
      otherMedications: [],
      kinds: MEDICATION_KINDS,
      units: MEDICATION_UNITS,
      frequencies: MEDICATION_FREQUENCIES,
      colors: MEDICATION_COLORS
    });
  });

  router.post("/medications", (req, res) => {
    const name = String(req.body.name || "").trim().replace(/\s+/g, " ");
    const kind = MEDICATION_KINDS.includes(req.body.kind) ? req.body.kind : "abortive";
    const defaultDose = req.body.default_dose !== "" ? Number(req.body.default_dose) : null;
    const unit = String(req.body.unit || "").trim() || (kind === "oxygen" ? "L/min" : null);
    const frequency = MEDICATION_FREQUENCIES.includes(req.body.frequency) ? req.body.frequency : "as_needed";
    const scheduleNote = String(req.body.schedule_note || "").trim() || null;
    const color = /^#[0-9a-fA-F]{6}$/.test(String(req.body.color || "")) ? req.body.color.toLowerCase() : MEDICATION_COLORS[0];

    if (!name) {
      setFlash(res, "error", "Medication name is required.");
      return res.redirect("/medications/new");
    }

    const dup = db
      .prepare("SELECT id FROM medications WHERE user_id = ? AND LOWER(TRIM(name)) = LOWER(?)")
      .get(req.user.id, name);
    if (dup) {
      setFlash(res, "warning", "Medication with that name already exists.");
      return res.redirect(`/medications/${dup.id}`);
    }

    db.prepare(
      `INSERT INTO medications (user_id, name, kind, default_dose, unit, frequency, schedule_note, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(req.user.id, name, kind, Number.isFinite(defaultDose) ? defaultDose : null, unit, frequency, scheduleNote, color);

    res.redirect("/medications");
  });

  router.get("/medications/:id", (req, res) => {
    const med = getMedication(db, req.user.id, req.params.id);
    if (!med) return res.status(404).send("Not found");

    const doses = db
      .prepare(
        `SELECT d.*, h.intensity AS attack_intensity
         FROM medication_doses d
         LEFT JOIN headache_logs h ON h.id = d.headache_log_id
         WHERE d.medication_id = ? AND d.user_id = ?
         ORDER BY d.taken_at DESC`
      )
      .all(med.id, req.user.id);

    const logs = db.prepare("SELECT * FROM headache_logs WHERE user_id = ?").all(req.user.id);
    const insights = computeMedicationInsights(db, req.user.id, logs, {}, todayIsoDate(res.locals.tzOffsetMinutes));
    const summary = insights.summaries.find((s) => s.medication.id === med.id) || null;

    res.render("medications/show", {
      title: med.name,
      navbarTitle: med.name,
      medication: med,
      doses,
      summary
    });
  });

  router.get("/medications/:id/edit", (req, res) => {
    const med = getMedication(db, req.user.id, req.params.id);
    if (!med) return res.status(404).send("Not found");
    const otherMedications = listMedications(db, req.user.id, { includeArchived: true }).filter((m) => m.id !== med.id);

    res.render("medications/form", {
      title: `${res.locals.t("medications.edit")}: ${med.name}`,
      navbarTitle: med.name,
      medication: med,
      isEdit: true,
      otherMedications,
      kinds: MEDICATION_KINDS,
      units: MEDICATION_UNITS,
      frequencies: MEDICATION_FREQUENCIES,
      colors: MEDICATION_COLORS
    });
  });

  router.post("/medications/:id", (req, res) => {
    const med = getMedication(db, req.user.id, req.params.id);
    if (!med) return res.status(404).send("Not found");

    const name = String(req.body.name || "").trim().replace(/\s+/g, " ") || med.name;
    const kind = MEDICATION_KINDS.includes(req.body.kind) ? req.body.kind : med.kind;
    const defaultDose = req.body.default_dose !== "" ? Number(req.body.default_dose) : null;
    const unit = String(req.body.unit || "").trim() || null;
    const frequency = MEDICATION_FREQUENCIES.includes(req.body.frequency) ? req.body.frequency : med.frequency;
    const scheduleNote = String(req.body.schedule_note || "").trim() || null;
    const color = /^#[0-9a-fA-F]{6}$/.test(String(req.body.color || "")) ? req.body.color.toLowerCase() : med.color;
    const archivedAt = req.body.archived === "1" ? med.archived_at || new Date().toISOString() : null;

    db.prepare(
      `UPDATE medications
       SET name = ?, kind = ?, default_dose = ?, unit = ?, frequency = ?, schedule_note = ?, color = ?, archived_at = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(name, kind, Number.isFinite(defaultDose) ? defaultDose : null, unit, frequency, scheduleNote, color, archivedAt, med.id, req.user.id);

    res.redirect(`/medications/${med.id}`);
  });

  router.post("/medications/:id/merge", (req, res) => {
    mergeMedications(db, req.user.id, Number(req.params.id), Number(req.body.target_id));
    res.redirect(`/medications/${req.body.target_id}`);
  });

  router.post("/medications/:id/delete", (req, res) => {
    const affectedLogs = db
      .prepare("SELECT DISTINCT headache_log_id FROM medication_doses WHERE medication_id = ? AND user_id = ? AND headache_log_id IS NOT NULL")
      .all(req.params.id, req.user.id)
      .map((r) => r.headache_log_id);
    db.prepare("DELETE FROM medications WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    for (const logId of affectedLogs) syncHeadacheLogMedicationText(db, logId);
    res.redirect("/medications");
  });

  router.get("/medication_doses/new", (req, res) => {
    const medications = listMedications(db, req.user.id);
    res.render("medication_doses/new", {
      title: res.locals.t("medications.log_dose"),
      navbarTitle: res.locals.t("medications.log_dose"),
      medications,
      units: MEDICATION_UNITS,
      effectivenessOptions: EFFECTIVENESS_OPTIONS,
      nowStr: localWallClockNow(res.locals.tzOffsetMinutes)
    });
  });

  router.post("/medication_doses", (req, res) => {
    let med = req.body.medication_id ? getMedication(db, req.user.id, req.body.medication_id) : null;
    if (!med && req.body.medication_name) {
      med = resolveMedication(db, req.user.id, req.body.medication_name);
    }
    if (!med) return res.redirect("/medication_doses/new");

    const takenAt = String(req.body.taken_at || "").trim() || localWallClockNow(res.locals.tzOffsetMinutes);
    const amount = req.body.amount !== "" && req.body.amount !== undefined ? Number(req.body.amount) : med.default_dose;
    const unit = String(req.body.unit || "").trim() || med.unit;
    const durationMinutes = req.body.duration_minutes ? Number(req.body.duration_minutes) : null;
    const effectiveness = EFFECTIVENESS_OPTIONS.includes(req.body.effectiveness) ? req.body.effectiveness : null;
    const minutesToRelief = req.body.minutes_to_relief !== "" && req.body.minutes_to_relief !== undefined ? Number(req.body.minutes_to_relief) : null;

    const headacheLogId = req.body.headache_log_id
      ? Number(req.body.headache_log_id)
      : attachOngoingAttackId(db, req.user.id, takenAt, med.kind);

    db.prepare(
      `INSERT INTO medication_doses (user_id, medication_id, headache_log_id, taken_at, amount, unit, duration_minutes, effectiveness, minutes_to_relief)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.user.id,
      med.id,
      headacheLogId || null,
      takenAt,
      Number.isFinite(amount) ? amount : null,
      unit || null,
      Number.isFinite(durationMinutes) ? durationMinutes : null,
      effectiveness,
      Number.isFinite(minutesToRelief) ? minutesToRelief : null
    );

    if (headacheLogId) syncHeadacheLogMedicationText(db, headacheLogId);

    const returnTo = String(req.body.return_to || "").startsWith("/") ? req.body.return_to : "/timeline";
    res.redirect(returnTo);
  });

  router.get("/medication_doses/:id/edit", (req, res) => {
    const dose = db
      .prepare(
        `SELECT d.*, m.name AS medication_name
         FROM medication_doses d
         JOIN medications m ON m.id = d.medication_id
         WHERE d.id = ? AND d.user_id = ?`
      )
      .get(req.params.id, req.user.id);
    if (!dose) return res.status(404).send("Not found");

    res.render("medication_doses/edit", {
      title: dose.medication_name,
      navbarTitle: dose.medication_name,
      dose,
      medications: listMedications(db, req.user.id, { includeArchived: true }),
      units: MEDICATION_UNITS,
      effectivenessOptions: EFFECTIVENESS_OPTIONS
    });
  });

  router.post("/medication_doses/:id", (req, res) => {
    const dose = db
      .prepare("SELECT * FROM medication_doses WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!dose) return res.status(404).send("Not found");

    const medicationId = req.body.medication_id ? Number(req.body.medication_id) : dose.medication_id;
    const takenAt = String(req.body.taken_at || "").trim() || dose.taken_at;
    const amount = req.body.amount !== undefined ? (req.body.amount === "" ? null : Number(req.body.amount)) : dose.amount;
    const unit = req.body.unit !== undefined ? String(req.body.unit || "").trim() || null : dose.unit;
    const durationMinutes =
      req.body.duration_minutes !== undefined
        ? req.body.duration_minutes === ""
          ? null
          : Number(req.body.duration_minutes)
        : dose.duration_minutes;
    const effectiveness =
      req.body.effectiveness !== undefined
        ? EFFECTIVENESS_OPTIONS.includes(req.body.effectiveness)
          ? req.body.effectiveness
          : null
        : dose.effectiveness;
    const minutesToRelief =
      req.body.minutes_to_relief !== undefined
        ? req.body.minutes_to_relief === ""
          ? null
          : Number(req.body.minutes_to_relief)
        : dose.minutes_to_relief;

    db.prepare(
      `UPDATE medication_doses
       SET medication_id = ?, taken_at = ?, amount = ?, unit = ?, duration_minutes = ?, effectiveness = ?, minutes_to_relief = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(
      medicationId,
      takenAt,
      Number.isFinite(amount) ? amount : null,
      unit,
      Number.isFinite(durationMinutes) ? durationMinutes : null,
      effectiveness,
      Number.isFinite(minutesToRelief) ? minutesToRelief : null,
      dose.id,
      req.user.id
    );

    if (dose.headache_log_id) syncHeadacheLogMedicationText(db, dose.headache_log_id);

    const returnTo = String(req.body.return_to || "").startsWith("/") ? req.body.return_to : "/timeline";
    res.redirect(returnTo);
  });

  router.post("/medication_doses/:id/delete", (req, res) => {
    const dose = db
      .prepare("SELECT * FROM medication_doses WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!dose) return res.status(404).send("Not found");

    db.prepare("DELETE FROM medication_doses WHERE id = ? AND user_id = ?").run(dose.id, req.user.id);
    if (dose.headache_log_id) syncHeadacheLogMedicationText(db, dose.headache_log_id);
    res.redirect("/timeline");
  });

  router.get("/medication_dose_export.csv", (req, res) => {
    const csv = dosesToCsv(db, req.user.id);
    const dateStr = todayIsoDate(res.locals.tzOffsetMinutes);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medication_doses-${dateStr}.csv"`);
    res.send(csv);
  });

  router.get("/timeline", (req, res) => {
    const timeline = buildTimeline(db, req.user.id, { before: req.query.before || null });
    res.render("timelines/show", {
      title: res.locals.t("medications.timeline_title"),
      navbarTitle: res.locals.t("medications.timeline_title"),
      timeline
    });
  });

  return router;
}

