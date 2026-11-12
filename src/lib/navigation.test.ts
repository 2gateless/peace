import { describe, expect, it } from "vitest";
import { resolveSwipeTab } from "./navigation";

describe("resolveSwipeTab", () => {
  it("moves right across tabs when swiping right (dx > 0)", () => {
    expect(resolveSwipeTab("quick", 90, 5, 220)).toBe("timeline");
    expect(resolveSwipeTab("timeline", 90, -10, 220)).toBe("stats");
    expect(resolveSwipeTab("stats", 90, 0, 220)).toBeNull();
  });

  it("moves left back across tabs when swiping left (dx < 0)", () => {
    expect(resolveSwipeTab("stats", -90, 8, 220)).toBe("timeline");
    expect(resolveSwipeTab("timeline", -90, 0, 220)).toBe("quick");
    expect(resolveSwipeTab("quick", -90, 0, 220)).toBeNull();
  });

  it("ignores short, slow, or vertically-dominant gestures", () => {
    expect(resolveSwipeTab("quick", 30, 0, 150)).toBeNull();
    expect(resolveSwipeTab("quick", 120, 100, 150)).toBeNull();
    expect(resolveSwipeTab("quick", 120, 0, 900)).toBeNull();
  });
});

