import { describe, it, expect } from "vitest";
import { alertTier, rainLevel, heatLevel, windLevel, quakeLevel, floodLevel, linearTrend } from "./hazard-model";

const now = new Date("2026-06-01T00:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 3.6e6).toISOString();

describe("alert tiers", () => {
  it("high hazard within 48h is a high alert", () => expect(alertTier("high", inHours(30), now)).toBe("high"));
  it("high hazard 5 days away is a medium alert", () => expect(alertTier("high", inHours(120), now)).toBe("medium"));
  it("medium hazard inside the month is a medium alert", () => expect(alertTier("medium", inHours(400), now)).toBe("medium"));
  it("medium hazard beyond a month is a low alert", () => expect(alertTier("medium", inHours(24 * 40), now)).toBe("low"));
  it("low stays low", () => expect(alertTier("low", inHours(1), now)).toBe("low"));
});

describe("thresholds", () => {
  it("IMD heavy rain 64.5mm", () => { expect(rainLevel(64.5)).toBe("medium"); expect(rainLevel(64)).toBe("low"); expect(rainLevel(116)).toBe("high"); });
  it("IMD heat wave 40/45", () => { expect(heatLevel(40)).toBe("medium"); expect(heatLevel(45)).toBe("high"); });
  it("gust classes", () => { expect(windLevel(62)).toBe("medium"); expect(windLevel(89)).toBe("high"); });
  it("flood via discharge ratio", () => { expect(floodLevel(3, 0)).toBe("high"); expect(floodLevel(1.9, 0)).toBe("medium"); });
  it("M6 nearby quake is high", () => expect(quakeLevel(6.2, 50, 1)).toBe("high"));
  it("trend slope", () => expect(linearTrend([1, 2, 3, 4], [2, 4, 6, 8]).slope).toBeCloseTo(2));
});
