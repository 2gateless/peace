import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import type { StatsSummary } from "../lib/safety";

Chart.register(...registerables);

interface DailyFrequencyPainChartProps {
  dailySeries: StatsSummary["dailySeries"];
  compact?: boolean;
}

/** Combined bar (dose count) and line (average pain) daily chart. */
export function DailyFrequencyPainChart({ dailySeries, compact = false }: DailyFrequencyPainChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const tickSize = compact ? 10 : 12;
    const chart = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: dailySeries.map((d) => d.label),
        datasets: [
          {
            label: "투약 횟수",
            data: dailySeries.map((d) => d.count),
            backgroundColor: "rgba(63, 143, 107, 0.55)",
            borderColor: "#3f8f6b",
            borderWidth: 1,
            borderRadius: compact ? 4 : 6,
            barPercentage: compact ? 0.55 : 0.7
          },
          {
            type: "line",
            label: "평균 통증",
            data: dailySeries.map((d) => d.avgPain),
            borderColor: "#d97706",
            backgroundColor: "#d97706",
            pointRadius: compact ? 2.5 : 3,
            borderWidth: compact ? 1.75 : 2,
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
          x: {
            ticks: { color: "#475569", maxRotation: 0, font: { size: tickSize } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#3f8f6b", stepSize: 1, font: { size: tickSize } },
            grid: { color: "rgba(100, 116, 139, 0.12)" }
          },
          yPain: {
            position: "right",
            min: 0,
            max: 10,
            ticks: { color: "#d97706", stepSize: compact ? 5 : undefined, font: { size: tickSize } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: "#334155",
              boxWidth: compact ? 9 : 12,
              padding: compact ? 8 : 12,
              font: { size: compact ? 10 : 12 }
            }
          }
        }
      }
    });

    return () => {
      chart.destroy();
    };
  }, [dailySeries, compact]);

  return <canvas ref={canvasRef} />;
}
