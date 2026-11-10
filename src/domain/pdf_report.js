import PDFDocument from "pdfkit";
import { computeCycles } from "./cycles.js";
import { formatDurationBetween } from "../i18n.js";

export function generatePdfReport({ logs, cycles = null, patientName = null, preparedFor = null, filters = {} }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 45 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const chronological = [...logs].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const computedCycles = cycles || computeCycles(chronological);

    doc.fontSize(20).fillColor("#111827").text("Peace — Cluster Headache Report");
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#4b5563").text(`Generated on ${new Date().toISOString().slice(0, 10)}`);

    if (patientName) doc.text(`Patient: ${patientName}`);
    if (preparedFor) doc.text(`Prepared for: ${preparedFor}`);
    if (filters.start_time || filters.end_time) {
      doc.text(`Period: ${filters.start_time || "..."} to ${filters.end_time || "..."}`);
    }

    doc.moveDown(1);
    doc.fontSize(13).fillColor("#111827").text("Summary");
    doc.moveDown(0.3);

    const count = chronological.length;
    const avgIntensity =
      count > 0 ? (chronological.reduce((s, l) => s + Number(l.intensity), 0) / count).toFixed(1) : "—";
    const maxIntensity = count > 0 ? Math.max(...chronological.map((l) => Number(l.intensity))) : "—";

    doc.fontSize(10).fillColor("#1f2937");
    doc.text(`Total attacks: ${count}`);
    doc.text(`Attack days: ${computedCycles.total_attack_days}`);
    doc.text(`Average intensity: ${avgIntensity} / 10 (Max: ${maxIntensity})`);
    doc.text(`Cycles detected: ${computedCycles.cycles.length}`);
    if (computedCycles.average_cycle_length) {
      doc.text(`Average cycle length: ${computedCycles.average_cycle_length} days`);
    }

    // Medication & Trigger tally
    const medCounts = {};
    const triggerCounts = {};
    for (const log of chronological) {
      for (const m of String(log.medication || "").split(",").map((s) => s.trim()).filter(Boolean)) {
        medCounts[m] = (medCounts[m] || 0) + 1;
      }
      for (const t of String(log.triggers || "").split(",").map((s) => s.trim()).filter(Boolean)) {
        triggerCounts[t] = (triggerCounts[t] || 0) + 1;
      }
    }

    const topMeds = Object.entries(medCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (topMeds.length > 0) {
      doc.moveDown(0.8);
      doc.fontSize(13).fillColor("#111827").text("Medications Used");
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor("#1f2937");
      for (const [name, c] of topMeds) {
        doc.text(`• ${name}: ${c} attacks`);
      }
    }

    const topTriggers = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (topTriggers.length > 0) {
      doc.moveDown(0.8);
      doc.fontSize(13).fillColor("#111827").text("Reported Triggers");
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor("#1f2937");
      for (const [name, c] of topTriggers) {
        doc.text(`• ${name}: ${c}`);
      }
    }

    doc.moveDown(1);
    doc.fontSize(13).fillColor("#111827").text("Detailed Attack Log");
    doc.moveDown(0.4);

    if (chronological.length === 0) {
      doc.fontSize(10).fillColor("#6b7280").text("No headache logs recorded.");
    } else {
      for (const log of [...chronological].reverse()) {
        const dur = log.end_time ? formatDurationBetween(log.start_time, log.end_time, "en") : "Ongoing";
        const line = `${log.start_time.replace("T", " ")} | Intensity: ${log.intensity}/10 | Duration: ${dur}`;
        doc.fontSize(10).fillColor("#111827").text(line);
        const details = [];
        if (log.medication) details.push(`Med: ${log.medication}`);
        if (log.triggers) details.push(`Triggers: ${log.triggers}`);
        if (log.barometric_pressure) details.push(`Pressure: ${log.barometric_pressure} hPa`);
        if (log.notes) details.push(`Notes: ${log.notes}`);
        if (details.length > 0) {
          doc.fontSize(9).fillColor("#4b5563").text(`  ${details.join(" | ")}`);
        }
        doc.moveDown(0.35);
      }
    }

    doc.end();
  });
}

