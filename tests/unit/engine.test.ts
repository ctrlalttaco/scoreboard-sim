import { describe, expect, it } from "vitest";

import {
  createInitialSimulatorState,
  reduceSimulator,
  runKeySequence,
} from "@/src/simulator/engine";
import { getPenaltyRemainingMs } from "@/src/simulator/selectors";

describe("hockey simulator engine", () => {
  it("starts in the source-backed hockey with game SOG configuration", () => {
    const first = createInitialSimulatorState();
    const second = createInitialSimulatorState();

    expect(first).not.toBe(second);
    expect(first.console.sportCode).toBe("63");
    expect(first.console.overlayId).toBe("ll-2274");
    expect(first.configuration.id).toBe("hockey-sog-game");
    expect(first.clock.durationMs).toBe(20 * 60_000);
  });

  it("records goals, score corrections, and shots on goal", () => {
    const state = runKeySequence(createInitialSimulatorState(), [
      "home-score-plus-1",
      "guest-score-edit",
      "digit-3",
      "enter",
      "home-shots-plus-1",
      "home-shots-plus-1",
    ]);

    expect(state.game.home.score).toBe(1);
    expect(state.game.guest.score).toBe(3);
    expect(state.game.home.shotsOnGoal).toBe(2);
    expect(state.session.events).toHaveLength(6);
  });

  it("enters a two-minute player penalty using the documented sequence", () => {
    const state = runKeySequence(createInitialSimulatorState(), [
      "home-player-penalty",
      "enter",
      "digit-7",
      "enter",
      "enter",
    ]);

    expect(state.game.home.penalties).toEqual([
      expect.objectContaining({
        playerNumber: 7,
        remainingAtReferenceMs: 120_000,
      }),
    ]);
    expect(state.console.mode).toBe("ready");
  });

  it("couples active penalty clocks to the main clock", () => {
    const penalized = runKeySequence(createInitialSimulatorState(), [
      "home-player-penalty",
      "enter",
      "digit-7",
      "enter",
      "enter",
    ]);
    const running = reduceSimulator(penalized, {
      type: "CONSOLE_KEY_PRESSED",
      key: "start",
      timestampMs: 1_000,
    });
    const stopped = reduceSimulator(running, {
      type: "CONSOLE_KEY_PRESSED",
      key: "stop",
      timestampMs: 31_000,
    });

    expect(getPenaltyRemainingMs(stopped.game.home.penalties[0], 99_000)).toBe(
      90_000,
    );
    expect(stopped.clock.remainingAtReferenceMs).toBe(19.5 * 60_000);
  });

  it("changes to a timer-only ice-rink configuration immutably", () => {
    const initial = createInitialSimulatorState();
    const configured = reduceSimulator(initial, {
      type: "CONFIGURATION_CHANGED",
      configurationId: "ice-session-timer",
    });
    const ignoredGoal = runKeySequence(configured, ["home-score-plus-1"]);

    expect(configured).not.toBe(initial);
    expect(configured.console.sportCode).toBe("96");
    expect(configured.configuration.mode).toBe("rink-timer");
    expect(configured.clock.durationMs).toBe(15 * 60_000);
    expect(ignoredGoal.game.home.score).toBe(0);
  });
});
