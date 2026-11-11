import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { computeStats } from "../lib/safety";
import type { DoseLog, Medication } from "../types";

Chart.register(...registerables);

interface StatsViewProps {
  logs: DoseLog[];
  medications: Medication[];
}

export function StatsView({ logs, medications }: StatsViewProps) {
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const ratioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dailyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stats = computeStats(logs, medications, windowDays);

  useEffect(() => {
    let ratioChart: Chart | null = null;
    let dailyChart: Chart | null = null;

    if (ratioCanvasRef.current && stats.byMedication.length > 0) {
      ratioChart = new Chart(ratioCanvasRef.current, {
        type: "doughnut",
        data: {
          labels: stats.byMedication.map((m) => m.name),
          datasets: [
            {
              data: stats.byMedication.map((m) => m.count),
              backgroundColor: ["#84a98c", "#52796f", "#cad2c5", "#38bdf8", "#818cf8"],
              borderColor: "#0f172a",
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { color: "#cbd5e1", boxWidth: 12 } }
          }
        }
      });
    }

    if (dailyCanvasRef.current) {
      dailyChart = new Chart(dailyCanvasRef.current, {
        type: "bar",
        data: {
          labels: stats.dailySeries.map((d) => d.label),
          datasets: [
            {
              label: "투약 횟수",
              data: stats.dailySeries.map((d) => d.count),
              backgroundColor: "rgba(132, 169, 140, 0.55)",
              borderColor: "#84a98c",
              borderWidth: 1,
              borderRadius: 6
            },
            {
              type: "line",
              label: "평균 통증",
              data: stats.dailySeries.map((d) => d.avgPain),
              borderColor: "#f59e0b",
              backgroundColor: "#f59e0b",
              spanGaps: true,
              tension: 0.3,
              yAxisID: "yPain"
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: "#94a3b8", maxRotation: 0 }, grid: { display: false } },
            y: {
              beginAtZero: true,
              ticks: { color: "#94a98c", stepSize: 1 },
              grid: { color: "rgba(148, 163, 184, 0.1)" }
            },
            yPain: {
              position: "right",
              min: 0,
              max: 10,
              ticks: { color: "#f59e0b" },
              grid: { display: false }
            }
          },
          plugins: {
            legend: { labels: { color: "#cbd5e1", boxWidth: 12 } }
          }
        }
      });
    }

    return () => {
      ratioChart?.destroy();
      dailyChart?.destroy();
    };
  }, [stats.byMedication, stats.dailySeries]);

  return (
    <div className="space-y-4">
      <div className="zen-card flex items-center justify-between rounded-2xl p-4">
        <h2 className="text-base font-semibold text-slate-100">간이 패턴 통계</h2>
        <div className="inline-flex rounded-full bg-slate-900 p-1">
          {([7, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setWindowDays(days)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                windowDays === days ? "bg-[#52796f] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              최근 {days}일
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="zen-card rounded-2xl p-3.5">
          <p className="text-[11px] text-slate-400">총 투약</p>
          <p className="mt-1 text-xl font-semibold text-[#84a98c]">{stats.totalCount}회</p>
        </div>
        <div className="zen-card rounded-2xl p-3.5">
          <p className="text-[11px] text-slate-400">평균 통증</p>
          <p className="mt-1 text-xl font-semibold text-amber-300">
            {stats.avgPainScale !== null ? `${stats.avgPainScale}` : "—"}
          </p>
        </div>
        <div className="zen-card rounded-2xl p-3.5">
          <p className="text-[11px] text-slate-400">최다 복용</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-100">
            {stats.topMedicationName || "—"}
          </p>
        </div>
      </div>

      <div className="zen-card rounded-3xl p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-200">일자별 투약 빈도 & 평균 통증</h3>
        <div className="h-56">
          <canvas ref={dailyCanvasRef} />
        </div>
      </div>

      <div className="zen-card rounded-3xl p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-200">약물별 복용 비율</h3>
        {stats.byMedication.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-500">해당 기간 데이터가 없습니다.</p>
        ) : (
          <div className="h-56">
            <canvas ref={ratioCanvasRef} />
          </div>
        )}
      </div>
    </div>
  );
}
