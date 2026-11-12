import { describe, expect, it } from "vitest";
import {
  computeStats,
  exportLogsToCsv,
  exportLogsToJson,
  formatElapsed,
  getMedicationSafetyStatus,
  getTodayCount,
  groupLogsByDay
} from "./safety";
import { DEFAULT_MEDICATIONS, type DoseLog } from "../types";

describe("peace safety & analytics helpers", () => {
  const med = DEFAULT_MEDICATIONS[3]; // 진통제 1 (4h interval, max 4/day)

  it("formats elapsed durations clearly in Korean", () => {
    expect(formatElapsed(20 * 1000)).toBe("방금 전");
    expect(formatElapsed(15 * 60 * 1000)).toBe("15분 전");
    expect(formatElapsed(2 * 3600 * 1000)).toBe("2시간 전");
    expect(formatElapsed((3 * 3600 + 20 * 60) * 1000)).toBe("3시간 20분 전");
  });

  it("triggers interval warning within minIntervalHours and clears after", () => {
    const now = new Date(2026, 10, 11, 14, 0, 0).getTime();
    const recentLogs: DoseLog[] = [
      {
        id: "1",
        timestamp: now - 2 * 3600 * 1000, // 2h ago (< 4h)
        medicationId: med.id,
        medicationName: med.name,
        category: med.category
      }
    ];

    const status = getMedicationSafetyStatus(recentLogs, med, now);
    expect(status.dailyCount).toBe(1);
    expect(status.isWithinInterval).toBe(true);
    expect(status.formattedRemaining).toBe("2시간");
    expect(status.needsWarning).toBe(true);

    const laterStatus = getMedicationSafetyStatus(recentLogs, med, now + 3 * 3600 * 1000);
    expect(laterStatus.isWithinInterval).toBe(false);
    expect(laterStatus.needsWarning).toBe(false);
  });

  it("counts today doses since midnight and flags dailyMaxLimit", () => {
    const now = new Date(2026, 10, 11, 20, 0, 0).getTime();
    const yesterday = new Date(2026, 10, 10, 23, 30, 0).getTime();
    const todayBase = new Date(2026, 10, 11, 1, 0, 0).getTime();

    const logs: DoseLog[] = [
      { id: "y", timestamp: yesterday, medicationId: med.id, medicationName: med.name, category: med.category },
      { id: "t1", timestamp: todayBase, medicationId: med.id, medicationName: med.name, category: med.category },
      { id: "t2", timestamp: todayBase + 4 * 3600000, medicationId: med.id, medicationName: med.name, category: med.category },
      { id: "t3", timestamp: todayBase + 8 * 3600000, medicationId: med.id, medicationName: med.name, category: med.category },
      { id: "t4", timestamp: todayBase + 12 * 3600000, medicationId: med.id, medicationName: med.name, category: med.category }
    ];

    expect(getTodayCount(logs, med.id, now)).toBe(4);
    const status = getMedicationSafetyStatus(logs, med, now);
    expect(status.isAtDailyLimit).toBe(true);
    expect(status.needsWarning).toBe(true);
  });

  it("groups logs by day and computes weekly stats and CSV/JSON exports", () => {
    const now = new Date(2026, 10, 11, 12, 0, 0).getTime();
    const logs: DoseLog[] = [
      {
        id: "a",
        timestamp: now - 3600000,
        medicationId: "herb_1",
        medicationName: "허브 1",
        category: "herb",
        painScale: 6,
        notes: "뒷목 긴장"
      },
      {
        id: "b",
        timestamp: now - 86400000,
        medicationId: "painkiller_1",
        medicationName: "진통제 1",
        category: "painkiller",
        painScale: 8
      }
    ];

    const groups = groupLogsByDay(logs);
    expect(groups.length).toBe(2);
    expect(groups[0].logs[0].id).toBe("a");

    const stats = computeStats(logs, DEFAULT_MEDICATIONS, 7, now);
    expect(stats.totalCount).toBe(2);
    expect(stats.avgPainScale).toBe(7);
    expect(stats.dailySeries.length).toBe(7);

    const csv = exportLogsToCsv(logs);
    expect(csv).toContain("medicationName");
    expect(csv).toContain("뒷목 긴장");

    const json = JSON.parse(exportLogsToJson(logs, DEFAULT_MEDICATIONS));
    expect(json.logs.length).toBe(2);
  });

  it("computes custom multi-month and multi-year statistics accurately", () => {
    const now = new Date(2026, 10, 11, 12, 0, 0).getTime(); // 2026-11-11
    const makeLog = (id: string, year: number, monthIndex: number, day: number, painScale: number): DoseLog => ({
      id,
      timestamp: new Date(year, monthIndex, day, 10, 0, 0).getTime(),
      medicationId: "herb_1",
      medicationName: "허브 1",
      category: "herb",
      painScale
    });

    const logs: DoseLog[] = [
      makeLog("in-3m", 2026, 8, 15, 2), // 2026-09-15 (~2m ago)
      makeLog("in-6m", 2026, 5, 10, 4), // 2026-06-10 (~5m ago)
      makeLog("in-1y", 2025, 11, 1, 6), // 2025-12-01 (~11m ago)
      makeLog("in-2y", 2024, 11, 1, 8), // 2024-12-01 (~23m ago)
      makeLog("too-old", 2024, 9, 1, 10) // 2024-10-01 (>2y ago)
    ];

    expect(computeStats(logs, DEFAULT_MEDICATIONS, "3m", now).totalCount).toBe(1);
    expect(computeStats(logs, DEFAULT_MEDICATIONS, "6m", now).totalCount).toBe(2);

    const oneYear = computeStats(logs, DEFAULT_MEDICATIONS, "1y", now);
    expect(oneYear.totalCount).toBe(3);
    expect(oneYear.avgPainScale).toBe(4);
    expect(oneYear.dailySeries[0].label).toContain("25.");

    const twoYears = computeStats(logs, DEFAULT_MEDICATIONS, "2y", now);
    expect(twoYears.totalCount).toBe(4);
    expect(twoYears.avgPainScale).toBe(5);
  });

  it("enforces dailyMaxLimit over a rolling 24-hour window across midnight", () => {
    const prevEvening = new Date(2026, 10, 10, 20, 0, 0).getTime();
    const afterMidnight = new Date(2026, 10, 11, 5, 0, 0).getTime(); // 9h later, past 4h interval

    const logs: DoseLog[] = [
      { id: "n1", timestamp: prevEvening, medicationId: med.id, medicationName: med.name, category: med.category },
      { id: "n2", timestamp: prevEvening + 1 * 3600000, medicationId: med.id, medicationName: med.name, category: med.category },
      { id: "n3", timestamp: prevEvening + 2 * 3600000, medicationId: med.id, medicationName: med.name, category: med.category },
      { id: "n4", timestamp: prevEvening + 3.5 * 3600000, medicationId: med.id, medicationName: med.name, category: med.category }
    ];

    const status = getMedicationSafetyStatus(logs, med, afterMidnight);
    expect(status.dailyCount).toBe(0);
    expect(status.rolling24hCount).toBe(4);
    expect(status.isWithinInterval).toBe(false);
    expect(status.isAtDailyLimit).toBe(true);
    expect(status.needsWarning).toBe(true);

    const nextNight = prevEvening + 24 * 3600000;
    const clearedStatus = getMedicationSafetyStatus(logs, med, nextNight);
    expect(clearedStatus.rolling24hCount).toBe(3);
    expect(clearedStatus.isAtDailyLimit).toBe(false);
  });
});

