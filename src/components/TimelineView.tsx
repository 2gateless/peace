import { exportLogsToCsv, exportLogsToJson, groupLogsByDay, painScaleColor } from "../lib/safety";
import type { DoseLog, Medication } from "../types";

interface TimelineViewProps {
  logs: DoseLog[];
  medications: Medication[];
  onEditLog: (log: DoseLog) => void;
  onDeleteLog: (logId: string) => void;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function TimelineView({ logs, medications, onEditLog, onDeleteLog }: TimelineViewProps) {
  const dayGroups = groupLogsByDay(logs);
  const timeFmt = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

  const handleExportCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(`peace-logs-${today}.csv`, exportLogsToCsv(logs), "text/csv;charset=utf-8;");
  };

  const handleExportJson = () => {
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `peace-logs-${today}.json`,
      exportLogsToJson(logs, medications),
      "application/json;charset=utf-8;"
    );
  };

  return (
    <div className="space-y-5">
      <div className="zen-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">투약 & 두통 타임라인</h2>
          <p className="text-xs text-slate-400">총 {logs.length}건의 기록</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="rounded-full border border-[#84a98c]/35 bg-[#84a98c]/10 px-3 py-1.5 text-xs font-medium text-[#cad2c5] transition hover:bg-[#84a98c]/20 disabled:opacity-40"
          >
            CSV 내보내기
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={logs.length === 0}
            className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 disabled:opacity-40"
          >
            JSON
          </button>
        </div>
      </div>

      {dayGroups.length === 0 ? (
        <div className="zen-card rounded-3xl p-10 text-center">
          <p className="text-sm text-slate-400">아직 기록된 타임라인이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dayGroups.map((group) => (
            <section key={group.dateKey} className="space-y-2.5">
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-[#84a98c]">
                {group.label}
              </h3>
              <ol className="space-y-2 border-l border-slate-800 pl-4">
                {group.logs.map((log) => (
                  <li key={log.id} className="zen-card relative rounded-2xl p-3.5">
                    <span
                      className={`absolute -left-[21px] top-5 h-2.5 w-2.5 rounded-full ring-4 ring-[#090d16] ${
                        log.category === "herb" ? "bg-[#84a98c]" : "bg-sky-400"
                      }`}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">
                            {timeFmt.format(new Date(log.timestamp))}
                          </span>
                          <span className="text-sm font-semibold text-slate-100">{log.medicationName}</span>
                          {log.dose && (
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                              {log.dose}
                            </span>
                          )}
                          {log.painScale !== null && log.painScale !== undefined && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#090d16]"
                              style={{ backgroundColor: painScaleColor(log.painScale) }}
                            >
                              통증 {log.painScale}/10
                            </span>
                          )}
                        </div>
                        {log.notes && <p className="text-xs text-slate-400">{log.notes}</p>}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditLog(log)}
                          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLog(log.id)}
                          className="rounded-lg px-2 py-1 text-xs text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
