(() => {
  // Store browser timezone offset so server wall-clock calculations match local time
  document.cookie = `peace_tz_offset=${new Date().getTimezoneOffset()}; path=/; SameSite=Lax`;

  const translationsEl = document.getElementById("client-translations");
  const T = translationsEl ? JSON.parse(translationsEl.textContent) : {};
  const locale = document.documentElement.lang || "ko";
  const hour12 = document.body.dataset.hourCycle === "h12";

  function t(path, vars = {}) {
    const parts = path.split(".");
    let val = T;
    for (const p of parts) val = val?.[p];
    if (typeof val !== "string") return path;
    return val.replace(/%\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));
  }

  function localDateTimeValue(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d}T${hh}:${mm}`;
  }

  function intensityColor(value) {
    if (value <= 3) return "hsl(142, 71%, 45%)";
    if (value <= 6) {
      const ratio = (value - 3) / 3;
      return `hsl(${Math.round(142 - ratio * 97)}, ${Math.round(71 + ratio * 22)}%, ${Math.round(45 + ratio * 2)}%)`;
    }
    const ratio = (value - 6) / 4;
    return `hsl(${Math.round(45 * (1 - ratio))}, ${Math.round(93 - ratio * 9)}%, ${Math.round(47 + ratio * 13)}%)`;
  }

  // Intensity Sliders
  document.querySelectorAll("[data-intensity-slider]").forEach((wrapper) => {
    const slider = wrapper.querySelector("input[type='range']");
    const valueEl = wrapper.querySelector("[data-intensity-value]");
    const badgeEl = wrapper.querySelector("[data-intensity-badge]");
    const glowEl = wrapper.querySelector("[data-intensity-glow]");
    const previewEl = wrapper.querySelector("[data-intensity-preview]");
    if (!slider) return;

    const stops = [];
    for (let i = 1; i <= 10; i++) {
      stops.push(`${intensityColor(i)} ${((i - 1) / 9) * 100}%`);
    }
    slider.style.background = `linear-gradient(to right, ${stops.join(", ")})`;

    const update = () => {
      const val = parseInt(slider.value, 10) || 5;
      const color = intensityColor(val);
      if (valueEl) valueEl.textContent = val;
      if (badgeEl) {
        badgeEl.style.setProperty("--value", (val / 10) * 100);
        badgeEl.style.color = color;
      }
      if (glowEl) glowEl.style.backgroundColor = color;
      if (previewEl) previewEl.textContent = T.intensity_levels?.[String(val)] || "";
    };

    slider.addEventListener("input", update);
    update();
  });

  // Time Pickers ("Now" button + formatted readout + ongoing badge)
  document.querySelectorAll("[data-time-picker]").forEach((wrapper) => {
    const field = wrapper.querySelector("input[type='datetime-local']");
    const nowBtn = wrapper.querySelector("[data-time-now]");
    const readout = wrapper.querySelector("[data-time-readout]");
    const ongoingBadge = wrapper.querySelector("[data-ongoing-badge]");
    if (!field) return;

    const update = () => {
      if (ongoingBadge) ongoingBadge.classList.toggle("hidden", field.value !== "");
      if (readout) {
        const d = field.value ? new Date(field.value) : null;
        if (d && !Number.isNaN(d.getTime())) {
          const loc = locale === "ko" ? "ko-KR" : "en-US";
          const day = new Intl.DateTimeFormat(loc, { weekday: "short", month: "short", day: "numeric" }).format(d);
          const time = new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit", hour12 }).format(d);
          readout.textContent = `${day} · ${time}`;
        } else {
          readout.textContent = "";
        }
      }
    };

    if (nowBtn) {
      nowBtn.addEventListener("click", (e) => {
        e.preventDefault();
        field.value = localDateTimeValue();
        update();
      });
    }
    field.addEventListener("input", update);
    field.addEventListener("change", update);
    update();
  });

  // Live Timers (time ago & ongoing countdown)
  document.querySelectorAll("[data-timer]").forEach((el) => {
    const startStr = el.dataset.start;
    const format = el.dataset.format || "long";
    if (!startStr) return;

    const tick = () => {
      const start = new Date(startStr.replace(" ", "T"));
      const diffSec = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));

      if (format === "short") {
        let text;
        if (diffSec < 60) {
          text = locale === "ko" ? "방금 전" : "Just now";
        } else if (diffSec < 3600) {
          const m = Math.floor(diffSec / 60);
          text = locale === "ko" ? `${m}분 전` : `${m}m ago`;
        } else if (diffSec < 86400) {
          const h = Math.floor(diffSec / 3600);
          text = locale === "ko" ? `${h}시간 전` : `${h}h ago`;
        } else {
          const d = Math.floor(diffSec / 86400);
          text = locale === "ko" ? `${d}일 전` : `${d}d ago`;
        }
        el.textContent = text;
      } else {
        const days = Math.floor(diffSec / 86400);
        const hours = Math.floor((diffSec % 86400) / 3600);
        const minutes = Math.floor((diffSec % 3600) / 60);
        const seconds = diffSec % 60;
        const setVal = (sel, val) => {
          const node = el.querySelector(sel);
          if (node) node.style.setProperty("--value", val);
        };
        setVal("[data-timer-days]", days);
        setVal("[data-timer-hours]", hours);
        setVal("[data-timer-minutes]", minutes);
        setVal("[data-timer-seconds]", seconds);
      }
    };

    tick();
    setInterval(tick, 1000);
  });

  // Medication Picker on Headache Log Form
  document.querySelectorAll("[data-med-picker]").forEach((picker) => {
    const dosesContainer = picker.querySelector("[data-med-doses]");
    const newToggle = picker.querySelector("[data-med-new-toggle]");
    const newForm = picker.querySelector("[data-med-new-form]");
    const newName = picker.querySelector("[data-med-new-name]");
    const addNewBtn = picker.querySelector("[data-med-new-add]");
    const newTemplate = picker.querySelector("[data-med-new-template]");
    const startTimeId = picker.dataset.startTimeField;

    const getDefaultTakenAt = () => {
      const startEl = startTimeId ? document.getElementById(startTimeId) : null;
      const now = localDateTimeValue();
      if (startEl?.value) {
        const diffMin = (new Date(now) - new Date(startEl.value)) / 60000;
        if (diffMin > 360) return startEl.value;
      }
      return now;
    };

    picker.querySelectorAll("[data-med-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tpl = document.getElementById(btn.dataset.medAdd);
        if (!tpl) return;
        const clone = tpl.content.firstElementChild.cloneNode(true);
        const takenInput = clone.querySelector("input[name='dose_taken_at']");
        if (takenInput) takenInput.value = getDefaultTakenAt();
        dosesContainer.appendChild(clone);
      });
    });

    if (newToggle && newForm) {
      newToggle.addEventListener("click", () => {
        newForm.hidden = !newForm.hidden;
        if (!newForm.hidden && newName) newName.focus();
      });
    }

    if (addNewBtn && newTemplate && newName) {
      addNewBtn.addEventListener("click", () => {
        const name = newName.value.trim();
        if (!name) {
          newName.focus();
          return;
        }
        const kind = picker.querySelector("input[name='new_med_kind']:checked")?.value || "abortive";
        const clone = newTemplate.content.firstElementChild.cloneNode(true);
        clone.querySelector("input[name='dose_medication_name']").value = name;
        clone.querySelector("input[name='dose_medication_kind']").value = kind;
        clone.querySelector("[data-med-label]").textContent = name;
        clone.querySelector("input[name='dose_taken_at']").value = getDefaultTakenAt();
        dosesContainer.appendChild(clone);
        newName.value = "";
        newForm.hidden = true;
      });
    }

    dosesContainer.addEventListener("click", (e) => {
      const removeBtn = e.target.closest("[data-med-remove]");
      if (!removeBtn) return;
      const row = removeBtn.closest("[data-dose-row]");
      if (!row) return;
      if (row.dataset.persisted === "true") {
        const destroyInput = row.querySelector("input[name='dose_destroy']");
        if (destroyInput) destroyInput.value = "1";
        row.hidden = true;
      } else {
        row.remove();
      }
    });
  });

  // Flash dismiss
  document.querySelectorAll("[data-flash]").forEach((flashEl) => {
    const closeBtn = flashEl.querySelector("[data-flash-close]");
    if (closeBtn) closeBtn.addEventListener("click", () => flashEl.remove());
    setTimeout(() => flashEl.remove(), 5000);
  });

  // Confirm dialogs on forms/buttons
  document.addEventListener("submit", (e) => {
    const msg = e.target.dataset?.confirm;
    if (msg && !window.confirm(msg)) {
      e.preventDefault();
    }
  });

  // Keyboard shortcuts
  const shortcutsWrapper = document.getElementById("keyboard-shortcuts-wrapper");
  if (shortcutsWrapper) {
    const dialog = document.getElementById("keyboard_shortcuts");
    const toggle = document.getElementById("keyboard_shortcuts_toggle");
    const STORAGE_KEY = "peace_shortcuts_enabled";
    let enabled = localStorage.getItem(STORAGE_KEY) !== "false";
    if (toggle) {
      toggle.checked = enabled;
      toggle.addEventListener("change", () => {
        enabled = toggle.checked;
        localStorage.setItem(STORAGE_KEY, String(enabled));
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return;
      if (!enabled) return;

      if (e.key === "n") {
        window.location.href = "/headache_logs/new";
      } else if (e.key === "e") {
        window.location.href = "/current_attack";
      } else if (e.key === "?") {
        dialog?.showModal();
      }
    });
  }
})();

