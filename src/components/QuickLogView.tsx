import { formatElapsed, getMedicationSafetyStatus, getStartOfTodayMs, painScaleColor } from "../lib/safety";
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

  return (
    <div className="flex min-h-[calc(100vh-9.5rem)] flex-col justify-between gap-6">
      {/* Upper calm summary zone */}
      <section className="zen-card rounded-3xl p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#84a98c]">Today Overview</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
              오늘 투약 <span className="text-[#84a98c]">{todayLogs.length}회</span>
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {latestLog
                ? `최근 기록: ${latestLog.medicationName} · ${formatElapsed(nowMs - latestLog.timestamp)}`
                : "아직 기록된 투약이 없습니다. 아래 버튼을 눌러 가볍게 기록하세요."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={onOpenMedSettings}
              className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 transition hover:border-[#84a98c]/50 hover:text-white"
            >
              약물 설정
            </button>
            <button
              type="button"
              onClick={onOpenHeadacheOnly}
              className="rounded-full border border-[#52796f]/50 bg-[#52796f]/15 px-3 py-1.5 text-xs font-medium text-[#cad2c5] transition hover:bg-[#52796f]/25"
            >
              + 통증/과거 시간
            </button>
          </div>
        </div>

        {latestLog?.painScale !== null && latestLog?.painScale !== undefined && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#090d16]/60 px-3.5 py-2 text-xs text-slate-300">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: painScaleColor(latestLog.painScale) }}
            />
            <span>최근 통증 강도 {latestLog.painScale}/10</span>
            {latestLog.notes && <span className="truncate text-slate-500">· {latestLog.notes}</span>}
          </div>
        )}
      </section>

      {/* Lower Thumb Zone: 5 Capsule Buttons */}
      <section aria-label="원클릭 투약 기록" className="space-y-3 pb-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-slate-400">원클릭 투약 (터치 즉시 기록)</span>
          <span className="text-[11px] text-slate-500">안전 간격 자동 체크</span>
        </div>

        <div className="space-y-2.5">
          {medications.map((med) => {
            const status = getMedicationSafetyStatus(logs, med, nowMs);
            const isHerb = med.category === "herb";

            return (
              <div
                key={med.id}
                className={`zen-capsule flex items-stretch justify-between overflow-hidden rounded-full ${
                  status.needsWarning ? "border-amber-500/45" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => onQuickTap(med)}
                  className="flex flex-1 items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          isHerb ? "bg-[#84a98c]" : "bg-sky-400"
                        }`}
                      />
                      <span className="truncate text-base font-semibold text-slate-100">{med.name}</span>
                      <span className="rounded-full bg-slate-800/90 px-2 py-0.5 text-[10px] text-slate-400">
                        {isHerb ? "허브" : "진통제"}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                      <span className="truncate">{med.subtitle}</span>
                      <span>·</span>
                      <span className={status.formattedElapsed ? "text-[#cad2c5]" : "text-slate-500"}>
                        {status.formattedElapsed ? `${status.formattedElapsed} 복용` : "기록 없음"}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        status.isAtDailyLimit
                          ? "bg-rose-500/20 text-rose-300"
                          : status.dailyCount > 0
                            ? "bg-[#84a98c]/20 text-[#cad2c5]"
                            : "bg-slate-800/80 text-slate-400"
                      }`}
                    >
                      오늘 {status.dailyCount}/{med.dailyMaxLimit}
                    </span>

                    {status.isWithinInterval && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        간격 주의 · {status.formattedRemaining}
                      </span>
                    )}
                    {!status.isWithinInterval && status.isAtDailyLimit && (
                      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                        일일 권장 초과
                      </span>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDetailed(med)}
                  title="통증 척도/과거 시간과 함께 기록"
                  className="border-l border-slate-800/80 px-4 text-xs font-medium text-slate-400 transition hover:bg-[#84a98c]/10 hover:text-[#cad2c5]"
                >
                  상세
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
