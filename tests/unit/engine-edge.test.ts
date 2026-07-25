import { describe, expect, it } from "vitest";

import {
  createInitialSimulatorState,
  reduceSimulator,
  runKeySequence,
} from "@/src/simulator/engine";

describe("hockey simulator edge behavior", () => {
  it("does not let an unrelated key escape a numeric-entry workflow", () => {
    const editing = runKeySequence(createInitialSimulatorState(), [
      "set-main-clock",
      "digit-8",
      "start",
    ]);

    expect(editing.console.mode).toBe("numeric-entry");
    expect(editing.console.inputBuffer).toBe("8");
    expect(editing.clock.running).toBe(false);
  });

  it("resets period SOG when advancing a period in code 197 mode", () => {
    const configured = reduceSimulator(createInitialSimulatorState(), {
      type: "CONFIGURATION_CHANGED",
      configurationId: "hockey-sog-period",
    });
    const state = runKeySequence(configured, [
      "home-shots-plus-1",
      "guest-shots-plus-1",
      "period-plus-1",
    ]);

    expect(state.game.period).toBe(2);
    expect(state.game.home.shotsOnGoal).toBe(0);
    expect(state.game.guest.shotsOnGoal).toBe(0);
  });

  it("disables and re-enables penalty clock coupling", () => {
    const state = runKeySequence(createInitialSimulatorState(), [
      "disable-penalty-clocks",
      "enable-penalty-clocks",
    ]);

    expect(state.game.penaltyClocksEnabled).toBe(true);
  });

  it("removes the selected penalty with clear", () => {
    const penalized = runKeySequence(createInitialSimulatorState(), [
      "home-player-penalty",
      "enter",
      "digit-7",
      "enter",
      "enter",
    ]);
    const cleared = runKeySequence(penalized, [
      "home-player-penalty",
      "arrow-down",
      "clear",
    ]);

    expect(cleared.game.home.penalties).toEqual([]);
  });

  it("does not latch the automatic horn after expiry", () => {
    const initial = createInitialSimulatorState({ clockMs: 1_000 });
    const armed = runKeySequence(initial, ["auto-horn"]);
    const running = reduceSimulator(armed, {
      type: "CONSOLE_KEY_PRESSED",
      key: "start",
      timestampMs: 1_000,
    });
    const expired = reduceSimulator(running, {
      type: "CLOCK_EXPIRED",
      timestampMs: 2_500,
    });

    expect(expired.clock.running).toBe(false);
    expect(expired.game.hornActive).toBe(false);
    expect(expired.game.hornSignalCount).toBe(1);
  });

  it("preserves completed drills and mode on reset", () => {
    const restored = reduceSimulator(createInitialSimulatorState(), {
      type: "PROGRESS_RESTORED",
      completedScenarioIds: ["record-a-goal"],
      assessmentResults: [],
    });
    const guided = reduceSimulator(restored, {
      type: "TRAINING_MODE_CHANGED",
      mode: "guided",
    });
    const reset = reduceSimulator(guided, { type: "SESSION_RESET" });

    expect(reset.training.mode).toBe("guided");
    expect(reset.training.completedScenarioIds).toEqual(["record-a-goal"]);
  });

  it("edits SOG, timeouts, period, and custom penalty duration", () => {
    const state = runKeySequence(createInitialSimulatorState(), [
      "guest-shots-edit",
      "digit-1",
      "digit-2",
      "enter",
      "home-timeouts-left",
      "digit-2",
      "enter",
      "period-edit",
      "digit-3",
      "enter",
      "guest-player-penalty",
      "enter",
      "digit-1",
      "digit-2",
      "enter",
      "digit-5",
      "digit-3",
      "digit-0",
      "enter",
    ]);

    expect(state.game.guest.shotsOnGoal).toBe(12);
    expect(state.game.home.timeoutsRemaining).toBe(2);
    expect(state.game.period).toBe(3);
    expect(state.game.guest.penalties[0]).toEqual(
      expect.objectContaining({
        playerNumber: 12,
        durationMs: 330_000,
      }),
    );
  });

  it("handles corrections, team penalties, manual horn, and unsupported SOG", () => {
    const noSog = reduceSimulator(createInitialSimulatorState(), {
      type: "CONFIGURATION_CHANGED",
      configurationId: "hockey-no-sog",
    });
    const state = runKeySequence(noSog, [
      "home-score-plus-1",
      "home-score-minus-1",
      "home-score-minus-1",
      "home-penalty",
      "home-shots-plus-1",
      "horn",
      "horn-release",
      "auto-horn",
    ]);

    expect(state.game.home.score).toBe(0);
    expect(state.game.home.teamPenalty).toBe(true);
    expect(state.game.home.shotsOnGoal).toBe(0);
    expect(state.game.hornActive).toBe(false);
    expect(state.game.hornSignalCount).toBe(1);
    expect(state.game.autoHorn).toBe(true);
  });

  it("rejects invalid and overlong entry while allowing clear recovery", () => {
    const invalid = runKeySequence(createInitialSimulatorState(), [
      "set-main-clock",
      "digit-1",
      "digit-9",
      "digit-9",
      "enter",
    ]);
    expect(invalid.console.mode).toBe("error");

    const recovered = runKeySequence(invalid, [
      "clear",
      "guest-score-edit",
      "digit-1",
      "digit-2",
      "digit-3",
      "digit-4",
      "enter",
    ]);
    expect(recovered.console.mode).toBe("ready");
    expect(recovered.game.guest.score).toBe(123);
  });

  it("records assessment results, scenarios, hints, and restored progress", () => {
    const started = reduceSimulator(createInitialSimulatorState(), {
      type: "SCENARIO_STARTED",
      scenarioId: "record-a-goal",
      seed: { configurationId: "hockey-no-sog", homeScore: 2 },
      timestampMs: 500,
    });
    const hinted = reduceSimulator(started, {
      type: "TRAINING_HINT_REQUESTED",
    });
    const completed = reduceSimulator(hinted, {
      type: "SCENARIO_COMPLETED",
      scenarioId: "record-a-goal",
      result: {
        scenarioId: "record-a-goal",
        elapsedMs: 800,
        mistakes: 1,
      },
    });
    const duplicate = reduceSimulator(completed, {
      type: "SCENARIO_COMPLETED",
      scenarioId: "record-a-goal",
    });

    expect(started.game.home.score).toBe(2);
    expect(hinted.training.hintsRequested).toBe(1);
    expect(completed.training.assessmentResults).toHaveLength(1);
    expect(duplicate.training.completedScenarioIds).toEqual(["record-a-goal"]);
  });

  it("keeps the operator horn preference when a drill starts", () => {
    const muted = reduceSimulator(createInitialSimulatorState(), {
      type: "SOUND_TOGGLED",
    });
    const started = reduceSimulator(muted, {
      type: "SCENARIO_STARTED",
      scenarioId: "record-a-goal",
      seed: {},
      timestampMs: 100,
    });

    expect(muted.preferences.soundEnabled).toBe(false);
    expect(started.preferences.soundEnabled).toBe(false);
  });

  it("stops coupled penalty clocks when confirming a live clock edit", () => {
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
    const editing = reduceSimulator(running, {
      type: "CONSOLE_KEY_PRESSED",
      key: "set-main-clock",
      timestampMs: 11_000,
    });
    const entered = runKeySequence(editing, [
      "digit-1",
      "digit-5",
      "digit-0",
      "digit-0",
    ]);
    const confirmed = reduceSimulator(entered, {
      type: "CONSOLE_KEY_PRESSED",
      key: "enter",
      timestampMs: 31_000,
    });

    expect(confirmed.clock.running).toBe(false);
    expect(confirmed.clock.remainingAtReferenceMs).toBe(15 * 60_000);
    expect(confirmed.game.home.penalties[0].referenceTimestampMs).toBeNull();
    expect(confirmed.game.home.penalties[0].remainingAtReferenceMs).toBe(
      90_000,
    );
  });

  it("cancels active scenario evaluation when the selection changes", () => {
    const started = reduceSimulator(createInitialSimulatorState(), {
      type: "SCENARIO_STARTED",
      scenarioId: "record-a-goal",
      seed: {},
      timestampMs: 100,
    });
    const cancelled = reduceSimulator(started, {
      type: "SCENARIO_CANCELLED",
    });

    expect(cancelled.training.activeScenarioId).toBeNull();
    expect(cancelled.session.events).toEqual([]);
  });
});
