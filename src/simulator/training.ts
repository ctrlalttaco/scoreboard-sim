import { z } from "zod";

import { getRemainingMs } from "./clock";
import type { ConsoleKeyId, SimulatorState, SimulatorStateSeed } from "./types";

const configurationIdSchema = z.enum([
  "hockey-no-sog",
  "hockey-sog-game",
  "hockey-sog-period",
  "youth-hockey",
  "ice-session-timer",
]);

const penaltySchema = z.object({
  playerNumber: z.number().int().min(0).max(99),
  durationMs: z.number().nonnegative(),
  remainingAtReferenceMs: z.number().nonnegative(),
  referenceTimestampMs: z.number().nullable(),
});

export const sourceReferenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  locator: z.string().min(1),
  confidence: z.enum(["verified", "inferred", "product-policy"]),
});

const expectedActionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
});

const stateConditionSchema = z.object({
  field: z.enum([
    "configuration.id",
    "home.score",
    "guest.score",
    "home.shots",
    "guest.shots",
    "home.penaltyCount",
    "guest.penaltyCount",
    "home.penaltyPlayer",
    "period",
    "penaltyClocksEnabled",
    "clock.running",
    "clock.remainingMs",
  ]),
  equals: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  description: z.string().min(1),
});

export const trainingScenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  initialState: z.object({
    configurationId: configurationIdSchema.optional(),
    homeScore: z.number().optional(),
    guestScore: z.number().optional(),
    homeShots: z.number().optional(),
    guestShots: z.number().optional(),
    homeTimeouts: z.number().optional(),
    guestTimeouts: z.number().optional(),
    homePenalties: z.array(penaltySchema).optional(),
    guestPenalties: z.array(penaltySchema).optional(),
    period: z.number().optional(),
    clockMs: z.number().optional(),
    clockRunning: z.boolean().optional(),
    penaltyClocksEnabled: z.boolean().optional(),
  }),
  expectedActions: z.array(expectedActionSchema).min(1),
  successConditions: z.array(stateConditionSchema).min(1),
  hints: z.array(z.string().min(1)).min(1),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
});

export type TrainingScenario = z.infer<typeof trainingScenarioSchema> & {
  initialState: SimulatorStateSeed;
  expectedActions: { key: ConsoleKeyId; label: string }[];
};

const hockeyManual = {
  id: "daktronics-ed9999-hockey",
  title: "All Sport 4000 Series Control Console Operation Manual, ED-9999",
  locator: "Section 7.1; Appendix B.8 and B.19; drawings A-86114/A-94925",
  confidence: "verified" as const,
};

const penaltyRemoval = {
  id: "daktronics-dd2445593",
  title: "All Sport 4000: remove penalty times",
  locator: "Daktronics KB DD2445593",
  confidence: "verified" as const,
};

const trainerPolicy = {
  id: "trainer-policy-rink-v1",
  title: "Rink trainer product policy",
  locator: "docs/console-behavior.md",
  confidence: "product-policy" as const,
};

const action = (key: ConsoleKeyId, label: string) => ({ key, label });
const condition = (
  field: TrainingScenario["successConditions"][number]["field"],
  equals: string | number | boolean | null,
  description: string,
) => ({ field, equals, description });

const twoMinutePenalty = {
  playerNumber: 7,
  durationMs: 120_000,
  remainingAtReferenceMs: 120_000,
  referenceTimestampMs: null,
};

export const hockeyScenarios: TrainingScenario[] = [
  {
    id: "new-hockey-game",
    title: "Start a hockey game",
    description: "Set 20:00, confirm period 1, and start the game clock.",
    difficulty: "beginner",
    initialState: {
      configurationId: "hockey-sog-game",
      clockMs: 10 * 60_000,
      period: 2,
    },
    expectedActions: [
      action("set-main-clock", "Open main-clock entry"),
      action("digit-2", "Enter 2"),
      action("digit-0", "Enter 0"),
      action("digit-0", "Enter 0"),
      action("digit-0", "Enter 0"),
      action("enter", "Confirm 20:00"),
      action("period-edit", "Open period entry"),
      action("digit-1", "Enter period 1"),
      action("enter", "Confirm the period"),
      action("start", "Start the game clock"),
    ],
    successConditions: [
      condition("period", 1, "Period is 1"),
      condition("clock.running", true, "Game clock is running"),
    ],
    hints: ["Use SET MAIN CLOCK, 2-0-0-0, and ENTER."],
    sourceReferences: [hockeyManual, trainerPolicy],
  },
  {
    id: "record-a-goal",
    title: "Record a goal",
    description: "Add one goal to HOME.",
    difficulty: "beginner",
    initialState: { configurationId: "hockey-sog-game" },
    expectedActions: [action("home-score-plus-1", "Add one goal to HOME")],
    successConditions: [condition("home.score", 1, "HOME score is 1")],
    hints: ["Use the HOME SCORE +1 key."],
    sourceReferences: [hockeyManual],
  },
  {
    id: "correct-a-goal",
    title: "Correct the score",
    description: "Correct HOME from 3 goals to 2.",
    difficulty: "beginner",
    initialState: { configurationId: "hockey-no-sog", homeScore: 3 },
    expectedActions: [
      action("home-score-edit", "Open HOME score entry"),
      action("digit-2", "Enter 2"),
      action("enter", "Confirm HOME score"),
    ],
    successConditions: [condition("home.score", 2, "HOME score is 2")],
    hints: ["A dotted SCORE key opens numeric correction."],
    sourceReferences: [hockeyManual],
  },
  {
    id: "record-sog",
    title: "Record shots on goal",
    description: "Add two HOME shots and one GUEST shot.",
    difficulty: "beginner",
    initialState: { configurationId: "hockey-sog-game" },
    expectedActions: [
      action("home-shots-plus-1", "Add a HOME shot"),
      action("home-shots-plus-1", "Add another HOME shot"),
      action("guest-shots-plus-1", "Add a GUEST shot"),
    ],
    successConditions: [
      condition("home.shots", 2, "HOME SOG is 2"),
      condition("guest.shots", 1, "GUEST SOG is 1"),
    ],
    hints: ["SOG controls are available in configurations 63 + 196/197."],
    sourceReferences: [hockeyManual],
  },
  {
    id: "two-minute-penalty",
    title: "Enter a two-minute penalty",
    description: "Assign HOME player 7 the console's default 2:00 penalty.",
    difficulty: "intermediate",
    initialState: { configurationId: "hockey-no-sog" },
    expectedActions: [
      action("home-player-penalty", "Open HOME player penalty"),
      action("enter", "Edit the selected penalty slot"),
      action("digit-7", "Enter player 7"),
      action("enter", "Accept player 7"),
      action("enter", "Accept the default 2:00"),
    ],
    successConditions: [
      condition("home.penaltyCount", 1, "HOME has one player penalty"),
      condition("home.penaltyPlayer", 7, "The penalty belongs to player 7"),
    ],
    hints: ["PLAYER PENALTY → ENTER → 7 → ENTER → ENTER."],
    sourceReferences: [hockeyManual],
  },
  {
    id: "freeze-penalty-clocks",
    title: "Freeze penalty clocks",
    description: "Disable penalty clocks while preserving the game clock.",
    difficulty: "intermediate",
    initialState: {
      configurationId: "hockey-no-sog",
      homePenalties: [twoMinutePenalty],
    },
    expectedActions: [
      action("disable-penalty-clocks", "Disable penalty clocks"),
    ],
    successConditions: [
      condition("penaltyClocksEnabled", false, "Penalty clocks are disabled"),
    ],
    hints: ["Use DISABLE PENALTY CLOCKS."],
    sourceReferences: [hockeyManual],
  },
  {
    id: "remove-penalty",
    title: "Remove a player penalty",
    description: "Select HOME's penalty and clear it.",
    difficulty: "intermediate",
    initialState: {
      configurationId: "hockey-no-sog",
      homePenalties: [twoMinutePenalty],
    },
    expectedActions: [
      action("home-player-penalty", "Open HOME player penalty"),
      action("arrow-down", "Select the existing penalty slot"),
      action("clear", "Clear the selected penalty"),
    ],
    successConditions: [
      condition("home.penaltyCount", 0, "HOME has no player penalties"),
    ],
    hints: ["Open PLAYER PENALTY, select a slot if needed, then CLEAR."],
    sourceReferences: [hockeyManual, penaltyRemoval],
  },
  {
    id: "period-sog-reset",
    title: "Advance period SOG",
    description: "Advance to period 2 and reset period-only shots.",
    difficulty: "intermediate",
    initialState: {
      configurationId: "hockey-sog-period",
      period: 1,
      homeShots: 12,
      guestShots: 9,
    },
    expectedActions: [action("period-plus-1", "Advance the period")],
    successConditions: [
      condition("period", 2, "Period is 2"),
      condition("home.shots", 0, "HOME period SOG reset"),
      condition("guest.shots", 0, "GUEST period SOG reset"),
    ],
    hints: ["Code 197 is represented as period-based SOG."],
    sourceReferences: [hockeyManual, trainerPolicy],
  },
  {
    id: "clock-correction",
    title: "Correct a running clock",
    description: "Stop the clock, set 6:42, and resume.",
    difficulty: "advanced",
    initialState: {
      configurationId: "hockey-sog-game",
      clockMs: 7 * 60_000,
      clockRunning: true,
    },
    expectedActions: [
      action("stop", "Stop the game clock"),
      action("set-main-clock", "Open main-clock entry"),
      action("digit-6", "Enter 6"),
      action("digit-4", "Enter 4"),
      action("digit-2", "Enter 2"),
      action("enter", "Confirm 6:42"),
      action("start", "Resume the game clock"),
    ],
    successConditions: [
      condition("clock.running", true, "Game clock is running"),
    ],
    hints: ["Stop before entering a corrected clock time."],
    sourceReferences: [hockeyManual, trainerPolicy],
  },
  {
    id: "ice-session",
    title: "Run an ice-session timer",
    description: "Use code 96 mode to set 12:00 and start the rink timer.",
    difficulty: "advanced",
    initialState: {
      configurationId: "ice-session-timer",
      clockMs: 15 * 60_000,
    },
    expectedActions: [
      action("set-main-clock", "Open main-clock entry"),
      action("digit-1", "Enter 1"),
      action("digit-2", "Enter 2"),
      action("digit-0", "Enter 0"),
      action("digit-0", "Enter 0"),
      action("enter", "Confirm 12:00"),
      action("start", "Start the rink timer"),
    ],
    successConditions: [
      condition(
        "configuration.id",
        "ice-session-timer",
        "Ice-session configuration is active",
      ),
      condition("clock.running", true, "Rink timer is running"),
    ],
    hints: ["The ice-session preset uses the four-digit timer code 96."],
    sourceReferences: [hockeyManual, trainerPolicy],
  },
];

const readConditionValue = (
  state: SimulatorState,
  field: TrainingScenario["successConditions"][number]["field"],
): string | number | boolean | null => {
  switch (field) {
    case "configuration.id":
      return state.configuration.id;
    case "home.score":
      return state.game.home.score;
    case "guest.score":
      return state.game.guest.score;
    case "home.shots":
      return state.game.home.shotsOnGoal;
    case "guest.shots":
      return state.game.guest.shotsOnGoal;
    case "home.penaltyCount":
      return state.game.home.penalties.length;
    case "guest.penaltyCount":
      return state.game.guest.penalties.length;
    case "home.penaltyPlayer":
      return state.game.home.penalties[0]?.playerNumber ?? null;
    case "period":
      return state.game.period;
    case "penaltyClocksEnabled":
      return state.game.penaltyClocksEnabled;
    case "clock.running":
      return state.clock.running;
    case "clock.remainingMs":
      return getRemainingMs(state.clock, state.clock.referenceTimestampMs ?? 0);
  }
};

export interface ScenarioEvaluation {
  completed: boolean;
  mistakes: number;
  nextAction: string | null;
  objectives: { description: string; complete: boolean }[];
}

export const evaluateScenario = (
  scenario: TrainingScenario,
  state: SimulatorState,
  keys: ConsoleKeyId[],
): ScenarioEvaluation => {
  let progress = 0;
  let mistakes = 0;

  for (const key of keys) {
    const expected = scenario.expectedActions[progress];
    if (expected?.key === key) {
      progress += 1;
    } else {
      mistakes += 1;
    }
  }

  const objectives = scenario.successConditions.map((item) => ({
    description: item.description,
    complete: readConditionValue(state, item.field) === item.equals,
  }));

  return {
    completed:
      progress === scenario.expectedActions.length &&
      objectives.every(({ complete }) => complete),
    mistakes,
    nextAction: scenario.expectedActions[progress]?.label ?? null,
    objectives,
  };
};

export const hockeyScenarioIds = hockeyScenarios.map(({ id }) => id);
