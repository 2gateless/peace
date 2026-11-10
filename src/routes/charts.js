import express from "express";
import { requireAuth } from "../auth.js";
import { computeCycles } from "../domain/cycles.js";
import { attachDosesAndPhotosToLogs, computeChartData, filterHeadacheLogs } from "../domain/headache_logs.js";
import { computeMedicationInsights, listMedications } from "../domain/medications.js";
import { todayIsoDate } from "../i18n.js";

export function chartRoutes(db) {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/charts", (req, res) => {
    const today = todayIsoDate(res.locals.tzOffsetMinutes);
    const rawLogs = filterHeadacheLogs(db, req.user.id, req.query, "ASC");
    const logs = attachDosesAndPhotosToLogs(db, rawLogs);
    const cycles = computeCycles(logs, today);
    const chartData = computeChartData(logs);
    const insights = computeMedicationInsights(db, req.user.id, logs, req.query, today);

    const todayCount = logs.filter((l) => String(l.start_time).slice(0, 10) === today).length;
    const avgIntensity =
      logs.length > 0
        ? Number((logs.reduce((s, l) => s + Number(l.intensity), 0) / logs.length).toFixed(1))
        : 0;

    res.render("charts/index", {
      title: res.locals.t("charts.title"),
      navbarTitle: res.locals.t("charts.title"),
      logs,
      cycles,
      chartData,
      insights,
      todayCount,
      avgIntensity,
      medications: listMedications(db, req.user.id),
      filters: req.query
    });
  });

  return router;
}

