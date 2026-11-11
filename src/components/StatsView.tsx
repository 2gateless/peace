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
            legend: { position: "bottom", labels: { color: "#334155", boxWidth: 12 } }
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
              backgroundColor: "rgba(63, 143, 107, 0.55)",
              borderColor: "#3f8f6b",
              borderWidth: 1,
              borderRadius: 6
            },
            {
              type: "line",
              label: "평균 통증",
              data: stats.dailySeries.map((d) => d.avgPain),
              borderColor: "#d97706",
              backgroundColor: "#d97706",
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
            x: { ticks: { color: "#475569", maxRotation: 0 }, grid: { display: false } },
            y: {
              beginAtZero: true,
              ticks: { color: "#3f8f6b", stepSize: 1 },
              grid: { color: "rgba(100, 116, 139, 0.12)" }
            },
            yPain: {
              position: "right",
              min: 0,
              max: 10,
              ticks: { color: "#d97706" },
              grid: { display: false }
            }
          },
          plugins: {
            legend: { labels: { color: "#334155", boxWidth: 12 } }
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
        <h2 className="text-base font-semibold text-slate-800">패턴 통계</h2>
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {([7, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setWindowDays(days)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                windowDays === days ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              최근 {days}일
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="zen-card rounded-2xl p-3.5">
          <p className="text-[11px] text-slate-500">총 투약</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700">{stats.totalCount}회</p>
        </div>
        <div className="zen-card rounded-2xl p-3.5">
          <p className="text-[11px] text-slate-500">평균 통증</p>
          <p className="mt-1 text-xl font-semibold text-amber-600">
            {stats.avgPainScale !== null ? `${stats.avgPainScale}` : "—"}
          </p>
        </div>
        <div className="zen-card rounded-2xl p-3.5">
          <p className="text-[11px] text-slate-500">최다 복용</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800">
            {stats.topMedicationName || "—"}
          </p>
        </div>
      </div>

      <div className="zen-card rounded-3xl p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-700">일자별 투약 빈도 & 평균 통증</h3>
        <div className="h-56">
          <canvas ref={dailyCanvasRef} />
        </div>
      </div>

      <div className="zen-card rounded-3xl p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-700">약물별 복용 비율</h3>
        {stats.byMedication.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-400">해당 기간 데이터가 없습니다.</p>
        ) : (
          <div className="h-56">
            <canvas ref={ratioCanvasRef} />
          </div>
        )}
      </div>
    </div>
  );
}
