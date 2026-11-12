import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { computeStats, type StatsPeriod } from "../lib/safety";
import type { DoseLog, Medication } from "../types";
import { DailyFrequencyPainChart } from "./DailyFrequencyPainChart";

Chart.register(...registerables);

interface StatsViewProps {
  logs: DoseLog[];
  medications: Medication[];
}

const CUSTOM_PERIODS: { id: Extract<StatsPeriod, string>; label: string }[] = [
  { id: "3m", label: "3개월" },
  { id: "6m", label: "6개월" },
  { id: "1y", label: "1년" },
  { id: "2y", label: "2년" }
];

function formatPeriodLabel(period: StatsPeriod): string {
  if (period === 7) return "최근 7일";
  if (period === 30) return "최근 30일";
  return `최근 ${CUSTOM_PERIODS.find((p) => p.id === period)?.label ?? ""}`;
}

export function StatsView({ logs, medications }: StatsViewProps) {
  const [period, setPeriod] = useState<StatsPeriod>(7);
  const [customMenuOpen, setCustomMenuOpen] = useState(false);
  const customMenuRef = useRef<HTMLDivElement | null>(null);
  const ratioCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stats = computeStats(logs, medications, period);
  const isCustomPeriod = typeof period === "string";
  const selectedCustom = CUSTOM_PERIODS.find((p) => p.id === period) ?? null;

  useEffect(() => {
    if (!customMenuOpen) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (customMenuRef.current && !customMenuRef.current.contains(event.target as Node)) {
        setCustomMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [customMenuOpen]);

  useEffect(() => {
    let ratioChart: Chart | null = null;

    if (ratioCanvasRef.current && stats.byMedication.length > 0) {
      ratioChart = new Chart(ratioCanvasRef.current, {
        type: "doughnut",
        data: {
          labels: stats.byMedication.map((m) => m.name),
          datasets: [
            {
              data: stats.byMedication.map((m) => m.count),
              backgroundColor: ["#3f8f6b", "#6ab394", "#a3d4b8", "#3b82c4", "#7dd3fc"],
              borderColor: "#ffffff",
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: { color: "#334155", boxWidth: 10, padding: 8, font: { size: 11 } }
            }
          }
        }
      });
    }

    return () => {
      ratioChart?.destroy();
    };
  }, [stats.byMedication]);

  return (
    <div className="flex flex-1 flex-col justify-between gap-3.5">
      <div className="zen-card relative z-20 flex flex-wrap items-center justify-between gap-1.5 rounded-2xl px-3.5 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">패턴 통계</h2>
          <p className="text-[10px] text-slate-500">{formatPeriodLabel(period)}</p>
        </div>

        <div className="inline-flex items-center rounded-full bg-slate-100 p-0.5">
          {([7, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => {
                setPeriod(days);
                setCustomMenuOpen(false);
              }}
              className={`rounded-full px-2 py-1 text-[11px] font-medium transition ${
                period === days ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              최근 {days}일
            </button>
          ))}

          <div ref={customMenuRef} className="relative">
            <button
              type="button"
              aria-expanded={customMenuOpen}
              aria-haspopup="listbox"
              onClick={() => setCustomMenuOpen((prev) => !prev)}
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-medium transition ${
                isCustomPeriod ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{selectedCustom ? selectedCustom.label : "사용자 지정"}</span>
              <svg
                className={`h-3 w-3 transition-transform ${customMenuOpen ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {customMenuOpen && (
              <div
                role="listbox"
                aria-label="사용자 지정 기간 선택"
                className="absolute right-0 top-full z-30 mt-2 w-28 overflow-hidden rounded-2xl border border-emerald-100 bg-white/95 p-1.5 shadow-xl backdrop-blur"
              >
                {CUSTOM_PERIODS.map((option) => {
                  const active = period === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setPeriod(option.id);
                        setCustomMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                        active
                          ? "bg-emerald-50 font-semibold text-emerald-800"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{option.label}</span>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="zen-card rounded-2xl px-3 py-2">
          <p className="text-[10px] text-slate-500">총 투약</p>
          <p className="mt-0.5 text-base font-semibold text-emerald-700">{stats.totalCount}회</p>
        </div>
        <div className="zen-card rounded-2xl px-3 py-2">
          <p className="text-[10px] text-slate-500">평균 통증</p>
          <p className="mt-0.5 text-base font-semibold text-amber-600">
            {stats.avgPainScale !== null ? `${stats.avgPainScale}` : "—"}
          </p>
        </div>
        <div className="zen-card rounded-2xl px-3 py-2">
          <p className="text-[10px] text-slate-500">최다 복용</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
            {stats.topMedicationName || "—"}
          </p>
        </div>
      </div>

      <div className="zen-card rounded-2xl px-4 py-3">
        <h3 className="mb-2 text-xs font-medium text-slate-700">일자별 투약 빈도 & 평균 통증</h3>
        <div className="h-44 sm:h-48">
          <DailyFrequencyPainChart dailySeries={stats.dailySeries} compact />
        </div>
      </div>

      <div className="zen-card rounded-2xl px-4 py-3">
        <h3 className="mb-2 text-xs font-medium text-slate-700">약물별 복용 비율</h3>
        {stats.byMedication.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-400">해당 기간 데이터가 없습니다.</p>
        ) : (
          <div className="h-44 sm:h-48">
            <canvas ref={ratioCanvasRef} />
          </div>
        )}
      </div>
    </div>
  );
}
