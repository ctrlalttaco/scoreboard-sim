import { describe, expect, it } from "vitest";

import {
  createGameClock,
  parseClockBuffer,
  setClock,
  startClock,
} from "@/src/simulator/clock";

describe("clock edge cases", () => {
  it("normalizes invalid durations and refuses to start an expired clock", () => {
    expect(createGameClock(Number.NaN).durationMs).toBe(0);
    const expired = setClock(createGameClock(1_000), -10);
    expect(startClock(expired, 0)).toBe(expired);
  });

  it("parses console MMSS buffers and rejects invalid seconds", () => {
    expect(parseClockBuffer("8")).toBe(8_000);
    expect(parseClockBuffer("800")).toBe(8 * 60_000);
    expect(parseClockBuffer("642")).toBe(6 * 60_000 + 42_000);
    expect(parseClockBuffer("199")).toBeNull();
    expect(parseClockBuffer("")).toBeNull();
    expect(parseClockBuffer("12345")).toBeNull();
  });
});
