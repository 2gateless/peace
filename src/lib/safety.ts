import type { DoseLog, Medication } from "../types";

export interface MedicationSafetyStatus {
  lastLog: DoseLog | null;
  elapsedMs: number | null;
  formattedElapsed: string | null;
  isWithinInterval: boolean;
  remainingMs: number;
  formattedRemaining: string;
  dailyCount: number;
  rolling24hCount: number;
  isAtDailyLimit: boolean;
  needsWarning: boolean;
}

export interface DayGroup {
  dateKey: string;
  label: string;
  logs: DoseLog[];
}

export interface StatsSummary {
  totalCount: number;
  avgPainScale: number | null;
  topMedicationName: string | null;
  byMedication: { name: string; count: number; category: string }[];
  dailySeries: { date: string; label: string; count: number; avgPain: number | null }[];
}

export function getStartOfTodayMs(nowMs = Date.now()): number {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatLocalDateKey(timestampMs: number): string {
  const d = new Date(timestampMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatElapsed(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  if (totalMinutes < 1) return "방금 전";
  if (totalMinutes < 60) return `${totalMinutes}분 전`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}시간 ${mins}분 전` : `${hours}시간 전`;
  }
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function formatRemaining(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

export function getTodayCount(logs: DoseLog[], medicationId: string, nowMs = Date.now()): number {
  const startOfDay = getStartOfTodayMs(nowMs);
  return logs.filter((l) => l.medicationId === medicationId && l.timestamp >= startOfDay).length;
}

export function getRolling24hCount(logs: DoseLog[], medicationId: string, nowMs = Date.now()): number {
  const cutoffMs = nowMs - 24 * 3600000;
  return logs.filter((l) => l.medicationId === medicationId && l.timestamp > cutoffMs).length;
}

export function getMedicationSafetyStatus(
  logs: DoseLog[],
  medication: Medication,
  nowMs = Date.now()
): MedicationSafetyStatus {
  const medLogs = logs
    .filter((l) => l.medicationId === medication.id)
    .sort((a, b) => b.timestamp - a.timestamp);
  const lastLog = medLogs[0] ?? null;
  const elapsedMs = lastLog ? Math.max(0, nowMs - lastLog.timestamp) : null;
  const minIntervalMs = medication.minIntervalHours * 3600000;
  const isWithinInterval = elapsedMs !== null && medication.minIntervalHours > 0 && elapsedMs < minIntervalMs;
  const remainingMs = isWithinInterval && elapsedMs !== null ? minIntervalMs - elapsedMs : 0;
  const dailyCount = getTodayCount(logs, medication.id, nowMs);
  const rolling24hCount = getRolling24hCount(logs, medication.id, nowMs);
  const isAtDailyLimit = medication.dailyMaxLimit > 0 && rolling24hCount >= medication.dailyMaxLimit;

  return {
    lastLog,
    elapsedMs,
    formattedElapsed: elapsedMs !== null ? formatElapsed(elapsedMs) : null,
    isWithinInterval,
    remainingMs,
    formattedRemaining: isWithinInterval ? formatRemaining(remainingMs) : "",
    dailyCount,
    rolling24hCount,
    isAtDailyLimit,
    needsWarning: isWithinInterval || isAtDailyLimit
  };
}

export function groupLogsByDay(logs: DoseLog[]): DayGroup[] {
  const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  const map = new Map<string, DoseLog[]>();
  for (const log of sorted) {
    const key = formatLocalDateKey(log.timestamp);
    const list = map.get(key) ?? [];
    list.push(log);
    map.set(key, list);
  }

  const fmt = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });

  return Array.from(map.entries()).map(([dateKey, dayLogs]) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    return {
      dateKey,
      label: fmt.format(new Date(y, m - 1, d)),
      logs: dayLogs
    };
  });
}

export type StatsPeriod = 7 | 30 | "3m" | "6m" | "1y" | "2y";

function resolvePeriodStart(nowMs: number, period: StatsPeriod): Date {
  const startDay = new Date(nowMs);
  startDay.setHours(0, 0, 0, 0);

  if (typeof period === "number") {
    startDay.setDate(startDay.getDate() - (period - 1));
    return startDay;
  }

  switch (period) {
    case "3m":
      startDay.setMonth(startDay.getMonth() - 3);
      break;
    case "6m":
      startDay.setMonth(startDay.getMonth() - 6);
      break;
    case "1y":
      startDay.setFullYear(startDay.getFullYear() - 1);
      break;
    case "2y":
      startDay.setFullYear(startDay.getFullYear() - 2);
      break;
  }
  return startDay;
}

export function computeStats(
  logs: DoseLog[],
  medications: Medication[],
  period: StatsPeriod = 7,
  nowMs = Date.now()
): StatsSummary {
  const endDay = new Date(nowMs);
  endDay.setHours(23, 59, 59, 999);
  const startDay = resolvePeriodStart(nowMs, period);

  const windowLogs = logs.filter((l) => l.timestamp >= startDay.getTime() && l.timestamp <= endDay.getTime());

  const painValues = windowLogs
    .map((l) => l.painScale)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const avgPainScale =
    painValues.length > 0
      ? Number((painValues.reduce((sum, v) => sum + v, 0) / painValues.length).toFixed(1))
      : null;

  const medById = new Map(medications.map((m) => [m.id, m]));
  const countsMap = new Map<string, { name: string; count: number; category: string }>();
  for (const log of windowLogs) {
    const name = medById.get(log.medicationId)?.name || log.medicationName;
    const category = medById.get(log.medicationId)?.category || log.category;
    const entry = countsMap.get(name) ?? { name, count: 0, category };
    entry.count += 1;
    countsMap.set(name, entry);
  }
  const byMedication = Array.from(countsMap.values()).sort((a, b) => b.count - a.count);

  const dayMap = new Map<string, DoseLog[]>();
  for (const log of windowLogs) {
    const key = formatLocalDateKey(log.timestamp);
    const list = dayMap.get(key) ?? [];
    list.push(log);
    dayMap.set(key, list);
  }

  const endYear = endDay.getFullYear();
  const spansMultipleYears = startDay.getFullYear() !== endYear;
  const dailySeries: { date: string; label: string; count: number; avgPain: number | null }[] = [];
  const cursor = new Date(startDay);
  while (cursor.getTime() <= endDay.getTime()) {
    const key = formatLocalDateKey(cursor.getTime());
    const dayLogs = dayMap.get(key) ?? [];
    const dayPains = dayLogs
      .map((l) => l.painScale)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const dateLabel =
      spansMultipleYears && cursor.getFullYear() !== endYear
        ? `${String(cursor.getFullYear()).slice(-2)}.${cursor.getMonth() + 1}/${cursor.getDate()}`
        : `${cursor.getMonth() + 1}/${cursor.getDate()}`;
    dailySeries.push({
      date: key,
      label: dateLabel,
      count: dayLogs.length,
      avgPain:
        dayPains.length > 0
          ? Number((dayPains.reduce((s, v) => s + v, 0) / dayPains.length).toFixed(1))
          : null
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    totalCount: windowLogs.length,
    avgPainScale,
    topMedicationName: byMedication[0]?.name ?? null,
    byMedication,
    dailySeries
  };
}

function escapeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportLogsToCsv(logs: DoseLog[]): string {
  const header = ["id", "timestamp", "datetime", "medicationId", "medicationName", "category", "dose", "painScale", "notes"];
  const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  const rows = sorted.map((l) => [
    l.id,
    l.timestamp,
    new Date(l.timestamp).toISOString(),
    l.medicationId,
    l.medicationName,
    l.category,
    l.dose ?? "",
    l.painScale ?? "",
    l.notes ?? ""
  ]);

  return "\uFEFF" + [header, ...rows].map((r) => r.map(escapeCsvCell).join(",")).join("\n");
}

export function exportLogsToJson(logs: DoseLog[], medications: Medication[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      medications,
      logs: [...logs].sort((a, b) => b.timestamp - a.timestamp)
    },
    null,
    2
  );
}

export function painScaleColor(scale: number): string {
  if (scale <= 3) return "#3f8f6b";
  if (scale <= 6) return "#d97706";
  return "#c2410c";
}

