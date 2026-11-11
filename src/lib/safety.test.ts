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
});
