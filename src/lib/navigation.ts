export type AppTab = "quick" | "timeline" | "stats";

const TAB_ORDER: AppTab[] = ["quick", "timeline", "stats"];

/**
 * Resolves horizontal swipe tab transition.
 * Swiping right (dx > 0) moves right across tabs (quick -> timeline -> stats);
 * swiping left (dx < 0) moves left back (stats -> timeline -> quick).
 */
export function resolveSwipeTab(
  currentTab: AppTab,
  dx: number,
  dy: number,
  elapsedMs: number
): AppTab | null {
  if (elapsedMs > 700) return null;
  if (Math.abs(dx) < 56) return null;
  if (Math.abs(dx) <= Math.abs(dy) * 1.4) return null;

  const idx = TAB_ORDER.indexOf(currentTab);
  if (idx === -1) return null;

  const nextIdx = dx > 0 ? idx + 1 : idx - 1;
  return TAB_ORDER[nextIdx] ?? null;
}

