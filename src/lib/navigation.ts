export type AppTab = "quick" | "timeline" | "stats";

const TAB_ORDER: AppTab[] = ["quick", "timeline", "stats"];

/**
 * Resolves circular horizontal swipe tab transition.
 * Swiping right (dx > 0) advances right (quick -> timeline -> stats -> quick);
 * swiping left (dx < 0) moves left (quick -> stats -> timeline -> quick).
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

  const step = dx > 0 ? 1 : -1;
  const nextIdx = (idx + step + TAB_ORDER.length) % TAB_ORDER.length;
  return TAB_ORDER[nextIdx];
}

