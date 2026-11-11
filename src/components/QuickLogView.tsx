import { formatElapsed, getMedicationSafetyStatus, getStartOfTodayMs } from "../lib/safety";
import type { DoseLog, Medication } from "../types";

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

  const herbs = medications.filter((m) => m.category === "herb");
  const painkillers = medications.filter((m) => m.category !== "herb");

  const renderTile = (med: Medication, compact: boolean) => {
    const status = getMedicationSafetyStatus(logs, med, nowMs);
    const isHerb = med.category === "herb";

    return (
      <div
        key={med.id}
        className={`zen-tile relative flex flex-col justify-between overflow-hidden rounded-2xl ${
          status.needsWarning ? "border-amber-400/80 bg-amber-50/75" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => onQuickTap(med)}
          className={`flex w-full flex-1 flex-col justify-between text-left ${
            compact ? "p-3" : "p-3.5"
          }`}
        >
          <div className="flex w-full items-start justify-between gap-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    isHerb ? "bg-emerald-600" : "bg-sky-600"
                  }`}
                />
                <span className="truncate text-sm font-semibold text-slate-800">{med.name}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">{med.subtitle}</p>
            </div>
          </div>

          <div className="mt-3 flex w-full items-end justify-between gap-1">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-slate-600">
                {status.formattedElapsed || "기록 없음"}
              </p>
              {status.isWithinInterval && (
                <p className="mt-0.5 truncate text-[10px] font-semibold text-amber-700">
                  {status.formattedRemaining} 남음
                </p>
              )}
              {!status.isWithinInterval && status.isAtDailyLimit && (
                <p className="mt-0.5 truncate text-[10px] font-semibold text-orange-700">
                  한도 도달
                </p>
              )}
            </div>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
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
          className="border-t border-slate-200/70 bg-white/50 py-1.5 text-center text-[11px] font-medium text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800"
        >
          상세
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-9.5rem)] flex-col justify-between gap-5">
      {/* Simple peaceful overview */}
      <section className="zen-card rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-emerald-700">오늘의 평온</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-800">
              오늘 투약 <span className="text-emerald-700">{todayLogs.length}회</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {latestLog
                ? `최근: ${latestLog.medicationName} · ${formatElapsed(nowMs - latestLog.timestamp)}`
                : "아래 버튼을 가볍게 눌러 기록하세요."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={onOpenMedSettings}
              className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600 transition hover:border-emerald-400 hover:text-slate-900"
            >
              설정
            </button>
            <button
              type="button"
              onClick={onOpenHeadacheOnly}
              className="rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-600/20"
            >
              + 상세 기록
            </button>
          </div>
        </div>
      </section>

      {/* Thumb Zone: Row 1 (Herbs 3 in a row) + Row 2 (Painkillers 2 in a row) */}
      <section aria-label="원클릭 투약 기록" className="space-y-2.5 pb-2">
        {herbs.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {herbs.map((med) => renderTile(med, true))}
          </div>
        )}

        {painkillers.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {painkillers.map((med) => renderTile(med, false))}
          </div>
        )}
      </section>
    </div>
  );
}
