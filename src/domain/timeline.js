export function buildTimeline(db, userId, { before = null, limit = 60 } = {}) {
  const logWhere = before ? "WHERE user_id = ? AND start_time < ?" : "WHERE user_id = ?";
  const logArgs = before ? [userId, before] : [userId];
  const logs = db
    .prepare(`SELECT * FROM headache_logs ${logWhere} ORDER BY start_time DESC LIMIT ?`)
    .all(...logArgs, limit + 1);

  const doseWhere = before ? "WHERE d.user_id = ? AND d.taken_at < ?" : "WHERE d.user_id = ?";
  const doseArgs = before ? [userId, before] : [userId];
  const doses = db
    .prepare(
      `SELECT d.*, m.name AS medication_name, m.color AS medication_color, m.kind AS medication_kind,
              h.intensity AS attack_intensity
       FROM medication_doses d
       JOIN medications m ON m.id = d.medication_id
       LEFT JOIN headache_logs h ON h.id = d.headache_log_id
       ${doseWhere}
       ORDER BY d.taken_at DESC LIMIT ?`
    )
    .all(...doseArgs, limit + 1);

  const combined = [
    ...logs.map((l) => ({ type: "attack", timestamp: l.start_time, item: l })),
    ...doses.map((d) => ({ type: "dose", timestamp: d.taken_at, item: d }))
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const hasMore = combined.length > limit;
  const pageEntries = combined.slice(0, limit);
  const nextBefore = hasMore && pageEntries.length > 0 ? pageEntries[pageEntries.length - 1].timestamp : null;

  const daysMap = new Map();
  for (const entry of pageEntries) {
    const date = entry.timestamp.slice(0, 10);
    if (!daysMap.has(date)) daysMap.set(date, []);
    daysMap.get(date).push(entry);
  }

  const days = Array.from(daysMap.entries()).map(([date, entries]) => ({ date, entries }));

  return { entries: pageEntries, days, nextBefore };
}

