import { describe, expect, it } from "vitest";

import {
  createInitialSimulatorState,
  createPowerOnSimulatorState,
  reduceSimulator,
  runKeySequence,
} from "@/src/simulator/engine";
import { getPenaltyRemainingMs } from "@/src/simulator/selectors";

describe("hockey simulator engine", () => {
  it("starts a power cycle at the documented resume-game prompt", () => {
    const poweredOn = createPowerOnSimulatorState();

    expect(poweredOn.console.startup?.step).toBe("resume-game");

    const resumed = runKeySequence(poweredOn, ["enter"]);
    expect(resumed.console.startup).toBeNull();
    expect(resumed.console.mode).toBe("ready");
    expect(resumed.configuration.id).toBe("hockey-sog-game");
  });

  it("selects hockey code 62 through the power-on keypad flow", () => {
    const configured = runKeySequence(createPowerOnSimulatorState(), [
      "clear",
      "digit-6",
      "digit-2",
      "enter",
    ]);

    expect(configured.console.startup).toBeNull();
    expect(configured.console.mode).toBe("ready");
    expect(configured.console.sportCode).toBe("62");
    expect(configured.configuration.id).toBe("hockey-no-sog");
    expect(configured.session.events).toEqual([]);
  });

  it("accepts auxiliary SOG and rink-timer codes at startup", () => {
    const gameSog = runKeySequence(createPowerOnSimulatorState(), [
      "clear",
      "digit-6",
      "digit-3",
      "enter",
      "digit-1",
      "digit-9",
      "digit-6",
      "enter",
    ]);
    const periodSog = runKeySequence(createPowerOnSimulatorState(), [
      "clear",
      "digit-1",
      "digit-9",
      "digit-7",
      "enter",
    ]);
    const rinkTimer = runKeySequence(createPowerOnSimulatorState(), [
      "clear",
      "digit-9",
      "digit-6",
      "enter",
    ]);

    expect(gameSog.configuration.id).toBe("hockey-sog-game");
    expect(gameSog.configuration.auxiliaryCode).toBe("196");
    expect(periodSog.configuration.id).toBe("hockey-sog-period");
    expect(periodSog.configuration.auxiliaryCode).toBe("197");
    expect(rinkTimer.configuration.id).toBe("ice-session-timer");
  });

  it("rejects an unsupported startup code and lets Clear retry", () => {
    const invalid = runKeySequence(createPowerOnSimulatorState(), [
      "clear",
      "digit-6",
      "digit-4",
      "enter",
    ]);
    const retry = runKeySequence(invalid, ["clear"]);

    expect(invalid.console.startup).toEqual({
      step: "game-code",
      buffer: "64",
      error: "CODE NOT SUPPORTED",
    });
    expect(retry.console.startup).toEqual({
      step: "game-code",
      buffer: "6",
      error: null,
    });

    const corrected = runKeySequence(retry, ["digit-2", "enter"]);
    expect(corrected.configuration.id).toBe("hockey-no-sog");
    expect(corrected.console.startup).toBeNull();
  });

  it("ignores game controls during startup and can restart the controller", () => {
    const poweredOn = createPowerOnSimulatorState();
    const ignored = runKeySequence(poweredOn, [
      "home-score-plus-1",
      "start",
      "horn",
    ]);
    const ready = runKeySequence(poweredOn, ["enter"]);
    const restarted = reduceSimulator(ready, {
      type: "CONSOLE_POWER_CYCLED",
      timestampMs: 500,
    });
    const blockedReset = reduceSimulator(restarted, {
      type: "SESSION_RESET",
    });
    const blockedScenario = reduceSimulator(restarted, {
      type: "SCENARIO_STARTED",
      scenarioId: "record-a-goal",
      seed: { homeScore: 5 },
      timestampMs: 600,
    });

    expect(ignored.game.home.score).toBe(0);
    expect(ignored.clock.running).toBe(false);
    expect(ignored.game.hornSignalCount).toBe(0);
    expect(restarted.console.startup?.step).toBe("resume-game");
    expect(blockedReset).toBe(restarted);
    expect(blockedScenario).toBe(restarted);
  });

  it("resumes the preserved game after a controller restart", () => {
    const liveGame = runKeySequence(
      createInitialSimulatorState({ homeScore: 3 }),
      ["start"],
    );
    const restarting = reduceSimulator(liveGame, {
      type: "CONSOLE_POWER_CYCLED",
      timestampMs: 5_000,
    });
    const resumed = runKeySequence(restarting, ["enter"]);

    expect(restarting.clock.running).toBe(false);
    expect(resumed.game.home.score).toBe(3);
    expect(resumed.clock.remainingAtReferenceMs).toBe(19 * 60_000 + 55_000);
    expect(resumed.session.events).toEqual(liveGame.session.events);
  });

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
