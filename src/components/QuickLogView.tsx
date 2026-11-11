import { computeStats, formatElapsed, getMedicationSafetyStatus, getStartOfTodayMs } from "../lib/safety";
import type { DoseLog, Medication } from "../types";
import { DailyFrequencyPainChart } from "./DailyFrequencyPainChart";

interface QuickLogViewProps {
  medications: Medication[];
  logs: DoseLog[];
  nowMs: number;
  onQuickTap: (med: Medication) => void;
  onOpenDetailed: (med: Medication) => void;
  onOpenHeadacheOnly: () => void;
  onOpenMedSettings: () => void;
}

export function QuickLogView({
  medications,
  logs,
  nowMs,
  onQuickTap,
  onOpenDetailed,
  onOpenHeadacheOnly,
  onOpenMedSettings
}: QuickLogViewProps) {
  const startOfToday = getStartOfTodayMs(nowMs);
  const todayLogs = logs.filter((l) => l.timestamp >= startOfToday);
  const latestLog = [...logs].sort((a, b) => b.timestamp - a.timestamp)[0] ?? null;
  const weeklyStats = computeStats(logs, medications, 7, nowMs);

  const herbs = medications.filter((m) => m.category === "herb");
  const painkillers = medications.filter((m) => m.category !== "herb");

  const renderTile = (med: Medication, compact: boolean) => {
    const status = getMedicationSafetyStatus(logs, med, nowMs);
    const isHerb = med.category === "herb";

    return (
      <div
        key={med.id}
        className={`zen-tile relative flex flex-col justify-between overflow-hidden rounded-xl ${
          status.needsWarning ? "border-amber-400/80 bg-amber-50/75" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => onQuickTap(med)}
          className={`flex w-full flex-1 flex-col justify-between text-left ${
            compact ? "px-2 py-2" : "px-2.5 py-2"
          }`}
        >
          <div className="flex w-full items-start justify-between gap-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isHerb ? "bg-emerald-600" : "bg-sky-600"
                  }`}
                />
                <span className="truncate text-[13px] font-semibold leading-tight text-slate-800">
                  {med.name}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-500">{med.subtitle}</p>
            </div>
          </div>

          <div className="mt-2 flex w-full items-end justify-between gap-1">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium leading-tight text-slate-600">
                {status.formattedElapsed || "기록 없음"}
              </p>
              {status.isWithinInterval && (
                <p className="mt-0.5 truncate text-[9.5px] font-semibold leading-tight tracking-tight text-amber-700">
                  {status.formattedRemaining} 남음
                </p>
              )}
              {!status.isWithinInterval && status.isAtDailyLimit && (
                <p className="mt-0.5 truncate text-[9.5px] font-semibold leading-tight text-orange-700">
                  한도 도달
                </p>
              )}
            </div>

            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                status.isAtDailyLimit
                  ? "bg-orange-100 text-orange-800"
                  : status.dailyCount > 0
                    ? isHerb
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-sky-100 text-sky-800"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {status.dailyCount}/{med.dailyMaxLimit}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenDetailed(med)}
          className="border-t border-slate-200/70 bg-white/50 py-1 text-center text-[10px] font-medium text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800"
        >
          상세
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-9.5rem)] flex-col justify-between gap-2.5">
      {/* Compact peaceful overview */}
      <section className="zen-card rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-emerald-700">오늘의 평온</p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-800">
              오늘 투약 <span className="text-emerald-700">{todayLogs.length}회</span>
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {latestLog
                ? `최근: ${latestLog.medicationName} · ${formatElapsed(nowMs - latestLog.timestamp)}`
                : "아래 버튼을 가볍게 눌러 기록하세요."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={onOpenMedSettings}
              className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-emerald-400 hover:text-slate-900"
            >
              설정
            </button>
            <button
              type="button"
              onClick={onOpenHeadacheOnly}
              className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[11px] font-medium text-emerald-800 transition hover:bg-emerald-600/20"
            >
              + 상세 기록
            </button>
          </div>
        </div>
      </section>

      {/* Mid-screen daily chart (~1.5x larger, gentle breathing room) */}
      <section aria-label="일자별 투약 빈도 및 평균 통증" className="my-auto py-1">
        <div className="zen-card rounded-2xl px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium text-slate-700">일자별 투약 빈도 & 평균 통증</h2>
            <span className="text-[10px] text-slate-400">최근 7일</span>
          </div>
          <div className="h-44 sm:h-48">
            <DailyFrequencyPainChart dailySeries={weeklyStats.dailySeries} compact />
          </div>
        </div>
      </section>

      {/* Thumb Zone: Row 1 (Herbs 3 in a row) + Row 2 (Painkillers 2 in a row) */}
      <section aria-label="원클릭 투약 기록" className="space-y-2 pb-1">
        {herbs.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {herbs.map((med) => renderTile(med, true))}
          </div>
        )}

        {painkillers.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {painkillers.map((med) => renderTile(med, false))}
          </div>
        )}
      </section>
    </div>
  );
}
