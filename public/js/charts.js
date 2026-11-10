(() => {
  const root = document.getElementById("charts-root");
  if (!root || !window.Chart) return;

  const payload = JSON.parse(root.dataset.chartsPayload || "{}");
  const locale = document.documentElement.lang || "ko";
  const loc = locale === "ko" ? "ko-KR" : "en-US";
  const hour12 = document.body.dataset.hourCycle === "h12";

  const formatDay = (v) =>
    new Intl.DateTimeFormat(loc, { month: "short", day: "numeric" }).format(new Date(v));
  const formatFullDay = (v) =>
    new Intl.DateTimeFormat(loc, { year: "numeric", month: "short", day: "numeric" }).format(new Date(v));
  const formatHourRange = (h) => {
    const s = new Date(2000, 0, 1, h, 0);
    const e = new Date(2000, 0, 1, h + 1, 59);
    const fmt = new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit", hour12 });
    return `${fmt.format(s)} – ${fmt.format(e)}`;
  };

  const DAY = 86400000;
  const startOfDay = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  };

  const remissions = payload.remissions || [];
  const remissionBands = {
    id: "remissionBands",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales: { x } } = chart;
      if (!x || remissions.length === 0) return;
      ctx.save();
      remissions.forEach(({ from, to, days }) => {
        const left = Math.max(x.getPixelForValue(startOfDay(from)), chartArea.left);
        const right = Math.min(x.getPixelForValue(startOfDay(to) + DAY), chartArea.right);
        if (right <= left) return;
        ctx.fillStyle = "rgba(127, 127, 127, 0.12)";
        ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
        const label = locale === "ko" ? `${days}일 관해` : `${days}d remission`;
        ctx.font = `12px ${Chart.defaults.font.family}`;
        if (ctx.measureText(label).width + 12 <= right - left) {
          ctx.fillStyle = Chart.defaults.color;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(label, (left + right) / 2, chartArea.top + 6);
        }
      });
      ctx.restore();
    }
  };

  const draw = (id, config) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    new Chart(canvas.getContext("2d"), {
      ...config,
      options: {
        ...config.options,
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeInOutQuart" }
      }
    });
  };

  const timeAxis = {
    type: "time",
    time: { unit: "day" },
    ticks: { callback: formatDay, autoSkip: true, maxTicksLimit: 12, maxRotation: 0 }
  };

  if (payload.intensity_data?.length) {
    draw("intensityChart", {
      type: "scatter",
      plugins: [remissionBands],
      data: {
        datasets: [
          {
            label: locale === "ko" ? "강도" : "Intensity",
            data: payload.intensity_data,
            borderColor: "rgb(13, 148, 136)",
            backgroundColor: "rgba(13, 148, 136, 0.5)",
            pointRadius: 5,
            pointHoverRadius: 8
          }
        ]
      },
      options: {
        scales: {
          x: timeAxis,
          y: {
            min: 0.5,
            max: 10.5,
            afterBuildTicks: (axis) => {
              axis.ticks = Array.from({ length: 10 }, (_, i) => ({ value: i + 1 }));
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => (items.length ? formatFullDay(items[0].parsed.x) : ""),
              label: (ctx) => `${locale === "ko" ? "강도" : "Intensity"}: ${ctx.parsed.y}/10`
            }
          }
        }
      }
    });
  }

  if (payload.attacks_per_day_data?.length) {
    draw("attacksPerDayChart", {
      type: "bar",
      plugins: [remissionBands],
      data: {
        datasets: [
          {
            label: locale === "ko" ? "일별 발작 수" : "Attacks per day",
            data: payload.attacks_per_day_data,
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            borderColor: "rgb(54, 162, 235)",
            borderWidth: 1
          }
        ]
      },
      options: {
        scales: {
          x: timeAxis,
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  if (payload.duration_data?.length) {
    const maxDur = Math.max(...payload.duration_data.map((d) => d.y));
    draw("durationChart", {
      type: "scatter",
      plugins: [remissionBands],
      data: {
        datasets: [
          {
            label: locale === "ko" ? "지속 시간(시간)" : "Duration (h)",
            data: payload.duration_data,
            borderColor: "rgb(147, 51, 234)",
            backgroundColor: "rgba(147, 51, 234, 0.5)",
            pointRadius: 6,
            pointHoverRadius: 8
          }
        ]
      },
      options: {
        scales: {
          x: timeAxis,
          y: {
            type: maxDur > 1 ? "logarithmic" : "linear",
            min: 0,
            suggestedMax: maxDur > 0 ? maxDur * 1.1 : 1
          }
        }
      }
    });
  }

  if (payload.hourly_data?.length) {
    draw("hourlyChart", {
      type: "bar",
      data: {
        labels: payload.hourly_data.map((d) => formatHourRange(d.start_hour)),
        datasets: [
          {
            label: locale === "ko" ? "빈도" : "Frequency",
            data: payload.hourly_data.map((d) => d.frequency),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            yAxisID: "y-freq"
          },
          {
            label: locale === "ko" ? "평균 강도" : "Avg Intensity",
            data: payload.hourly_data.map((d) => d.avg_intensity),
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            yAxisID: "y-int"
          }
        ]
      },
      options: {
        scales: {
          x: { type: "category" },
          "y-freq": { type: "linear", position: "left", beginAtZero: true },
          "y-int": { type: "linear", position: "right", beginAtZero: true, max: 10 }
        }
      }
    });
  }

  const palette = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 205, 86)",
    "rgb(75, 192, 192)",
    "rgb(153, 102, 255)"
  ];

  const drawPie = (id, data, colors = {}) => {
    const keys = Object.keys(data || {});
    if (keys.length === 0) return;
    draw(id, {
      type: "pie",
      data: {
        labels: keys,
        datasets: [
          {
            data: Object.values(data),
            backgroundColor: keys.map((k, idx) => colors[k] || palette[idx % palette.length])
          }
        ]
      },
      options: { plugins: { legend: { position: "top" } } }
    });
  };

  drawPie("triggerChart", payload.trigger_data);
  drawPie("medicationChart", payload.medication_data, payload.medication_colors);

  if (payload.pressure_data?.length) {
    draw("pressureChart", {
      type: "bar",
      data: {
        labels: payload.pressure_data.map((d) => d.label),
        datasets: [
          {
            label: locale === "ko" ? "빈도" : "Frequency",
            data: payload.pressure_data.map((d) => d.frequency),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            yAxisID: "y-freq"
          },
          {
            label: locale === "ko" ? "평균 강도" : "Avg Intensity",
            data: payload.pressure_data.map((d) => d.avg_intensity),
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            yAxisID: "y-int"
          }
        ]
      },
      options: {
        scales: {
          x: { type: "category" },
          "y-freq": { type: "linear", position: "left", beginAtZero: true, ticks: { stepSize: 1 } },
          "y-int": { type: "linear", position: "right", beginAtZero: true, max: 10 }
        }
      }
    });
  }

  if (payload.pressure_change_data?.length) {
    draw("pressureChangeChart", {
      type: "bar",
      data: {
        datasets: [
          {
            label: "Δ hPa",
            data: payload.pressure_change_data,
            backgroundColor: payload.pressure_change_data.map((d) =>
              d.y < 0 ? "rgba(54, 162, 235, 0.7)" : "rgba(255, 159, 64, 0.7)"
            ),
            barThickness: 8
          }
        ]
      },
      options: {
        scales: { x: timeAxis, y: {} },
        plugins: { legend: { display: false } }
      }
    });
  }
})();

