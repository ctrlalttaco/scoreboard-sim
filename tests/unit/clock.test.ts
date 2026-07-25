import { describe, expect, it } from "vitest";

import {
  createGameClock,
  formatGameClock,
  getRemainingMs,
  setClock,
  startClock,
  stopClock,
} from "@/src/simulator/clock";

describe("game clock", () => {
  it("derives a running countdown from the reference timestamp without mutation", () => {
    const clock = startClock(createGameClock(8 * 60_000), 1_000);

    expect(getRemainingMs(clock, 31_000)).toBe(7 * 60_000 + 30_000);
    expect(clock.remainingAtReferenceMs).toBe(8 * 60_000);
  });

  it("stops, resumes, and clamps at zero", () => {
    const started = startClock(createGameClock(5_000), 100);
    const stopped = stopClock(started, 2_100);
    const resumed = startClock(stopped, 5_000);

    expect(getRemainingMs(stopped, 99_000)).toBe(3_000);
    expect(getRemainingMs(resumed, 7_999)).toBe(1);
    expect(getRemainingMs(resumed, 8_001)).toBe(0);
  });

  it("sets time immutably and formats boundary values", () => {
    const original = createGameClock(10 * 60_000);
    const changed = setClock(original, 59_000);

    expect(changed).not.toBe(original);
    expect(formatGameClock(getRemainingMs(changed, 0))).toBe("0:59");
    expect(formatGameClock(10 * 60_000)).toBe("10:00");
    expect(formatGameClock(-1)).toBe("0:00");
  });

  it("treats start and stop as idempotent and ignores a backward timestamp", () => {
    const clock = createGameClock(30_000);
    const running = startClock(clock, 5_000);

    expect(startClock(running, 8_000)).toBe(running);
    expect(getRemainingMs(running, 4_000)).toBe(30_000);

    const stopped = stopClock(running, 6_000);
    expect(stopClock(stopped, 9_000)).toBe(stopped);
  });
});
