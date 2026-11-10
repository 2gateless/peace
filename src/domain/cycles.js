const REMISSION_THRESHOLD = 14;
const ICHD_REMISSION_MONTHS = 3;

export const HEATMAP_LEVEL_CLASSES = [
  "bg-base-300",
  "bg-error/30",
  "bg-error/50",
  "bg-error/75",
  "bg-error"
];

function parseDateOnly(isoDate) {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = parseDateOnly(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateOnly(d);
}

function diffDays(laterIso, earlierIso) {
  return Math.round((parseDateOnly(laterIso) - parseDateOnly(earlierIso)) / 86400000);
}

function isIchdRemission(startIso, endIso) {
  const threshold = parseDateOnly(startIso);
  threshold.setUTCMonth(threshold.getUTCMonth() + ICHD_REMISSION_MONTHS);
  const nextDay = parseDateOnly(addDays(endIso, 1));
  return threshold <= nextDay;
}

export function computeCycles(logs, today = formatDateOnly(new Date()), remissionThreshold = REMISSION_THRESHOLD) {
  const attackCountsByDay = {};
  const attacksByStartDay = {};
  let ongoingAttack = false;

  for (const log of logs) {
    const startOn = String(log.start_time).slice(0, 10);
    const endOn = log.end_time ? String(log.end_time).slice(0, 10) : null;
    if (!log.end_time) ongoingAttack = true;

    const days = endOn && endOn > startOn ? [startOn, addDays(startOn, 1)] : [startOn];
    for (const day of days) {
      attackCountsByDay[day] = (attackCountsByDay[day] || 0) + 1;
    }

    if (!attacksByStartDay[startOn]) attacksByStartDay[startOn] = [];
    attacksByStartDay[startOn].push(log);
  }

  const attackDays = Object.keys(attackCountsByDay).sort();
  const totalAttackDays = attackDays.length;
  const firstAttackDay = attackDays[0] || null;
  const lastAttackDay = attackDays[attackDays.length - 1] || null;

  let currentStreak = null;
  if (ongoingAttack) {
    currentStreak = 0;
  } else if (lastAttackDay) {
    currentStreak = Math.max(diffDays(today, lastAttackDay), 0);
  }

  const dayGroups = [];
  for (const day of attackDays) {
    const lastGroup = dayGroups[dayGroups.length - 1];
    if (!lastGroup || diffDays(day, lastGroup[lastGroup.length - 1]) > remissionThreshold) {
      dayGroups.push([day]);
    } else {
      lastGroup.push(day);
    }
  }

  const cycles = dayGroups.map((days) => {
    const cycleAttacks = days.flatMap((d) => attacksByStartDay[d] || []);
    const totalIntensity = cycleAttacks.reduce((sum, a) => sum + Number(a.intensity || 0), 0);
    const startOn = days[0];
    const endOn = days[days.length - 1];
    const ongoing =
      endOn === lastAttackDay && (ongoingAttack || diffDays(today, endOn) <= remissionThreshold);

    return {
      start_on: startOn,
      end_on: endOn,
      length_in_days: diffDays(endOn, startOn) + 1,
      attack_count: cycleAttacks.length,
      average_intensity: cycleAttacks.length > 0 ? Number((totalIntensity / cycleAttacks.length).toFixed(1)) : null,
      ongoing
    };
  });

  const remissions = [];
  for (let i = 0; i < cycles.length - 1; i++) {
    const startOn = addDays(cycles[i].end_on, 1);
    const endOn = addDays(cycles[i + 1].start_on, -1);
    remissions.push({
      start_on: startOn,
      end_on: endOn,
      length_in_days: diffDays(endOn, startOn) + 1,
      ichd_remission: isIchdRemission(startOn, endOn)
    });
  }

  let longestStreak = null;
  if (cycles.length > 0) {
    const gaps = [];
    for (let i = 0; i < attackDays.length - 1; i++) {
      gaps.push(diffDays(attackDays[i + 1], attackDays[i]) - 1);
    }
    if (currentStreak !== null) gaps.push(currentStreak);
    longestStreak = Math.max(...gaps);
  }

  const averageCycleLength =
    cycles.length > 0
      ? Number((cycles.reduce((s, c) => s + c.length_in_days, 0) / cycles.length).toFixed(1))
      : null;

  const averageRemissionLength =
    remissions.length > 0
      ? Number((remissions.reduce((s, r) => s + r.length_in_days, 0) / remissions.length).toFixed(1))
      : null;

  const currentCycle = cycles.length > 0 && cycles[cycles.length - 1].ongoing ? cycles[cycles.length - 1] : null;

  const calendarEnd =
    lastAttackDay && diffDays(today, lastAttackDay) > 365 ? lastAttackDay : today;
  const endDate = parseDateOnly(calendarEnd);
  const startDate = parseDateOnly(calendarEnd);
  startDate.setUTCDate(startDate.getUTCDate() - 52 * 7);
  // Align to Monday (1)
  const startDow = (startDate.getUTCDay() + 6) % 7;
  startDate.setUTCDate(startDate.getUTCDate() - startDow);

  const endDow = (endDate.getUTCDay() + 6) % 7;
  const gridEnd = new Date(endDate);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - endDow));

  const weeks = [];
  let cursor = new Date(startDate);
  while (cursor <= gridEnd) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const iso = formatDateOnly(cursor);
      week.push(iso <= calendarEnd ? iso : null);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }

  return {
    today,
    remission_threshold: remissionThreshold,
    attack_counts_by_day: attackCountsByDay,
    attack_days: attackDays,
    total_attack_days: totalAttackDays,
    first_attack_day: firstAttackDay,
    last_attack_day: lastAttackDay,
    ongoing_attack: ongoingAttack,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    cycles,
    current_cycle: currentCycle,
    remissions,
    average_cycle_length: averageCycleLength,
    average_remission_length: averageRemissionLength,
    weeks
  };
}

export function heatmapCellClass(count) {
  const n = count || 0;
  if (n === 0) return HEATMAP_LEVEL_CLASSES[0];
  if (n === 1) return HEATMAP_LEVEL_CLASSES[1];
  if (n === 2) return HEATMAP_LEVEL_CLASSES[2];
  if (n <= 4) return HEATMAP_LEVEL_CLASSES[3];
  return HEATMAP_LEVEL_CLASSES[4];
}

