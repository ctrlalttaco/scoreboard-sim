import { describe, expect, it } from "vitest";

import {
  evaluateScenario,
  hockeyScenarios,
  trainingScenarioSchema,
} from "@/src/simulator/training";
import {
  createInitialSimulatorState,
  runKeySequence,
} from "@/src/simulator/engine";

describe("hockey and rink training scenarios", () => {
  it("ships ten valid, source-aware rink scenarios without basketball content", () => {
    expect(hockeyScenarios).toHaveLength(10);
    for (const scenario of hockeyScenarios) {
      expect(trainingScenarioSchema.safeParse(scenario).success).toBe(true);
      expect(JSON.stringify(scenario).toLowerCase()).not.toContain(
        "basketball",
      );
    }
  });

  it("evaluates a documented hockey goal workflow", () => {
    const scenario = hockeyScenarios.find(({ id }) => id === "record-a-goal")!;
    const state = runKeySequence(createInitialSimulatorState(), [
      "home-score-plus-1",
    ]);
    const result = evaluateScenario(
      scenario,
      state,
      state.session.events.map(({ key }) => key),
    );

    expect(result.completed).toBe(true);
  });

  it("tracks mistakes and the next guided action", () => {
    const scenario = hockeyScenarios.find(({ id }) => id === "record-a-goal")!;
    const state = runKeySequence(createInitialSimulatorState(), [
      "guest-score-plus-1",
    ]);
    const result = evaluateScenario(
      scenario,
      state,
      state.session.events.map(({ key }) => key),
    );

    expect(result.mistakes).toBe(1);
    expect(result.nextAction).toBe("Add one goal to HOME");
  });

  it("evaluates every shipped condition field against its scenario seed", () => {
    for (const scenario of hockeyScenarios) {
      const state = createInitialSimulatorState(scenario.initialState);
      const result = evaluateScenario(scenario, state, []);
      expect(result.objectives).toHaveLength(scenario.successConditions.length);
    }
  });

  it("rejects scenario data without evidence references", () => {
    const invalid = {
      ...hockeyScenarios[0],
      sourceReferences: [],
    };
    expect(trainingScenarioSchema.safeParse(invalid).success).toBe(false);
  });
});
