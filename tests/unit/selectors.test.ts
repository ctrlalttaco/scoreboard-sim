import { describe, expect, it } from "vitest";

import {
  createInitialSimulatorState,
  runKeySequence,
} from "@/src/simulator/engine";
import { selectLcdLines } from "@/src/simulator/selectors";

describe("hockey console selectors", () => {
  it("renders hockey ready, score-entry, and player-penalty LCD states", () => {
    const ready = createInitialSimulatorState();
    expect(selectLcdLines(ready, 0)).toEqual({
      line1: "20:00  DN P1",
      line2: "H 000  G 000 SOG",
    });

    const scoreEntry = runKeySequence(ready, ["home-score-edit", "digit-4"]);
    expect(selectLcdLines(scoreEntry, 0).line1).toBe("EDIT HOME SCORE");

    const penaltyEntry = runKeySequence(ready, ["home-player-penalty"]);
    expect(selectLcdLines(penaltyEntry, 0).line1).toContain("HOME PENALTY 1");
  });

  it("identifies the timer-only rink configuration", () => {
    const timer = {
      ...createInitialSimulatorState(),
      configuration: {
        ...createInitialSimulatorState().configuration,
        mode: "rink-timer" as const,
        label: "Ice session timer",
      },
    };

    expect(selectLcdLines(timer, 0).line2).toBe("ICE SESSION TIMER");
  });

  it("renders active penalties, horn state, and entry errors", () => {
    const penalized = runKeySequence(createInitialSimulatorState(), [
      "home-player-penalty",
      "enter",
      "digit-7",
      "enter",
      "enter",
      "home-player-penalty",
      "arrow-down",
    ]);
    expect(selectLcdLines(penalized, 0).line2).toContain("PL 7");

    const horn = runKeySequence(createInitialSimulatorState(), ["auto-horn"]);
    expect(selectLcdLines(horn, 0).line1).toContain(" H");

    const invalid = runKeySequence(createInitialSimulatorState(), [
      "set-main-clock",
      "digit-1",
      "digit-9",
      "digit-9",
      "enter",
    ]);
    expect(selectLcdLines(invalid, 0).line1).toBe("ENTRY ERROR");
  });
});
