import {
  createGameClock,
  parseClockBuffer,
  setClock,
  startClock,
  stopClock,
} from "./clock";
import {
  getRinkConfiguration,
  getStartupConfigurationId,
} from "./configurations";
import type {
  ConsoleKeyId,
  HockeyGameState,
  HockeyTeamState,
  PendingConsoleOperation,
  PlayerPenalty,
  SimulatorEvent,
  SimulatorState,
  SimulatorStateSeed,
  TeamId,
  TrainingMode,
} from "./types";

const MAX_PENALTIES_PER_TEAM = 6;

const copyPenalties = (penalties: PlayerPenalty[] = []): PlayerPenalty[] =>
  penalties.map((penalty) => ({ ...penalty }));

const createTeam = (
  score = 0,
  shotsOnGoal = 0,
  timeoutsRemaining = 1,
  penalties: PlayerPenalty[] = [],
): HockeyTeamState => ({
  score,
  shotsOnGoal,
  timeoutsRemaining,
  teamPenalty: penalties.length > 0,
  penalties: copyPenalties(penalties),
});

export const createInitialSimulatorState = (
  seed: SimulatorStateSeed = {},
  startedAtMs = 0,
  mode: TrainingMode = "free",
): SimulatorState => {
  const configuration = getRinkConfiguration(seed.configurationId);
  const clock = createGameClock(seed.clockMs ?? configuration.defaultClockMs);

  return {
    configuration,
    console: {
      power: "on",
      sportCode: configuration.sportCode,
      overlayId: configuration.overlayId,
      startup: null,
      mode: "ready",
      inputBuffer: "",
      pendingOperation: null,
      lastKey: null,
      errorMessage: null,
    },
    game: {
      home: createTeam(
        seed.homeScore,
        seed.homeShots,
        seed.homeTimeouts,
        seed.homePenalties,
      ),
      guest: createTeam(
        seed.guestScore,
        seed.guestShots,
        seed.guestTimeouts,
        seed.guestPenalties,
      ),
      period: seed.period ?? 1,
      hornActive: false,
      hornSignalCount: 0,
      autoHorn: false,
      penaltyClocksEnabled: seed.penaltyClocksEnabled ?? true,
    },
    clock: seed.clockRunning ? startClock(clock, startedAtMs) : clock,
    training: {
      mode,
      activeScenarioId: null,
      hintsRequested: 0,
      completedScenarioIds: [],
      assessmentResults: [],
    },
    session: {
      startedAtMs,
      events: [],
    },
    preferences: {
      soundEnabled: true,
      reducedMotion: false,
    },
  };
};

export const createPowerOnSimulatorState = (
  seed: SimulatorStateSeed = {},
  startedAtMs = 0,
  mode: TrainingMode = "free",
): SimulatorState => {
  const state = createInitialSimulatorState(seed, startedAtMs, mode);
  return {
    ...state,
    console: {
      ...state.console,
      startup: {
        step: "resume-game",
        buffer: "",
        error: null,
      },
    },
  };
};

const applyConfiguration = (
  state: SimulatorState,
  configurationId: SimulatorState["configuration"]["id"],
): SimulatorState => {
  const configured = createInitialSimulatorState(
    { configurationId },
    0,
    state.training.mode,
  );
  return {
    ...configured,
    training: {
      ...configured.training,
      completedScenarioIds: [...state.training.completedScenarioIds],
      assessmentResults: state.training.assessmentResults.map((result) => ({
        ...result,
      })),
    },
    preferences: { ...state.preferences },
  };
};

const readyConsole = (
  state: SimulatorState,
  lastKey: ConsoleKeyId,
): SimulatorState["console"] => ({
  ...state.console,
  mode: "ready",
  inputBuffer: "",
  pendingOperation: null,
  lastKey,
  errorMessage: null,
});

const withPendingOperation = (
  state: SimulatorState,
  operation: PendingConsoleOperation,
  inputBuffer = "",
): SimulatorState => ({
  ...state,
  console: {
    ...state.console,
    mode: "numeric-entry",
    inputBuffer,
    pendingOperation: operation,
    errorMessage: null,
  },
});

const updateTeam = (
  game: HockeyGameState,
  team: TeamId,
  updater: (current: HockeyTeamState) => HockeyTeamState,
): HockeyGameState => ({
  ...game,
  [team]: updater(game[team]),
});

const mapPenalties = (
  game: HockeyGameState,
  mapper: (penalty: PlayerPenalty) => PlayerPenalty,
): HockeyGameState => ({
  ...game,
  home: {
    ...game.home,
    penalties: game.home.penalties.map(mapper),
  },
  guest: {
    ...game.guest,
    penalties: game.guest.penalties.map(mapper),
  },
});

const penaltyRemainingAt = (
  penalty: PlayerPenalty,
  timestampMs: number,
): number =>
  penalty.referenceTimestampMs === null
    ? penalty.remainingAtReferenceMs
    : Math.max(
        0,
        penalty.remainingAtReferenceMs -
          Math.max(0, timestampMs - penalty.referenceTimestampMs),
      );

const startPenalties = (
  game: HockeyGameState,
  timestampMs: number,
): HockeyGameState =>
  mapPenalties(game, (penalty) =>
    penalty.remainingAtReferenceMs > 0 && penalty.referenceTimestampMs === null
      ? { ...penalty, referenceTimestampMs: timestampMs }
      : penalty,
  );

const stopPenalties = (
  game: HockeyGameState,
  timestampMs: number,
): HockeyGameState =>
  mapPenalties(game, (penalty) =>
    penalty.referenceTimestampMs === null
      ? penalty
      : {
          ...penalty,
          remainingAtReferenceMs: penaltyRemainingAt(penalty, timestampMs),
          referenceTimestampMs: null,
        },
  );

const pendingOperationFor = (
  state: SimulatorState,
  key: ConsoleKeyId,
): PendingConsoleOperation | null => {
  const team = key.startsWith("home-")
    ? "home"
    : key.startsWith("guest-")
      ? "guest"
      : undefined;

  if (key.endsWith("score-edit") && team) {
    return { kind: "score", team, label: `${team} score`, maxDigits: 3 };
  }
  if (
    key.endsWith("shots-edit") &&
    team &&
    state.configuration.shotsOnGoalMode !== "none"
  ) {
    return {
      kind: "shots",
      team,
      label: `${team} shots on goal`,
      maxDigits: 3,
    };
  }
  if (key.endsWith("timeouts-left") && team) {
    return {
      kind: "timeouts",
      team,
      label: `${team} timeouts left`,
      maxDigits: 2,
    };
  }
  if (key === "period-edit") {
    return { kind: "period", label: "period", maxDigits: 2 };
  }
  if (key === "set-main-clock") {
    return { kind: "clock", label: "main clock", maxDigits: 4 };
  }

  return null;
};

const startPenaltyEntry = (
  state: SimulatorState,
  team: TeamId,
): SimulatorState => {
  const penalties = state.game[team].penalties;
  const slotIndex = Math.min(penalties.length, MAX_PENALTIES_PER_TEAM - 1);

  return withPendingOperation(state, {
    kind: "player-penalty",
    team,
    label: `${team} penalty ${slotIndex + 1}`,
    maxDigits: 4,
    stage: "slot",
    slotIndex,
    inputStarted: false,
  });
};

const applyPenaltyEntry = (
  state: SimulatorState,
  timestampMs: number,
): SimulatorState => {
  const operation = state.console.pendingOperation;
  if (
    operation?.kind !== "player-penalty" ||
    operation.team === undefined ||
    operation.slotIndex === undefined
  ) {
    return state;
  }

  if (operation.stage === "slot") {
    return withPendingOperation(state, {
      ...operation,
      stage: "player",
      label: `${operation.team} player number`,
      maxDigits: 2,
      inputStarted: false,
    });
  }

  if (operation.stage === "player") {
    const playerNumber = Number(state.console.inputBuffer);
    if (
      state.console.inputBuffer.length === 0 ||
      !Number.isInteger(playerNumber) ||
      playerNumber < 0 ||
      playerNumber > 99
    ) {
      return state;
    }

    return withPendingOperation(
      state,
      {
        ...operation,
        stage: "duration",
        playerNumber,
        label: `${operation.team} player ${playerNumber} penalty`,
        maxDigits: 4,
        inputStarted: false,
      },
      "200",
    );
  }

  const durationMs = parseClockBuffer(state.console.inputBuffer);
  if (operation.playerNumber === undefined || durationMs === null) {
    return {
      ...state,
      console: {
        ...state.console,
        mode: "error",
        errorMessage: "Enter a valid MM:SS penalty.",
      },
    };
  }

  const penalty: PlayerPenalty = {
    playerNumber: operation.playerNumber,
    durationMs,
    remainingAtReferenceMs: durationMs,
    referenceTimestampMs:
      state.clock.running && state.game.penaltyClocksEnabled
        ? timestampMs
        : null,
  };
  const penalties = [...state.game[operation.team].penalties];
  penalties[operation.slotIndex] = penalty;

  return {
    ...state,
    game: updateTeam(state.game, operation.team, (team) => ({
      ...team,
      teamPenalty: true,
      penalties: penalties.slice(0, MAX_PENALTIES_PER_TEAM),
    })),
    console: readyConsole(state, "enter"),
  };
};

const applyPendingOperation = (
  state: SimulatorState,
  timestampMs: number,
): SimulatorState => {
  const { pendingOperation, inputBuffer } = state.console;
  if (!pendingOperation) {
    return state;
  }
  if (pendingOperation.kind === "player-penalty") {
    return applyPenaltyEntry(state, timestampMs);
  }
  if (inputBuffer.length === 0) {
    return state;
  }

  if (pendingOperation.kind === "clock") {
    const clockMs = parseClockBuffer(inputBuffer);
    if (clockMs === null) {
      return {
        ...state,
        console: {
          ...state.console,
          mode: "error",
          errorMessage: "Enter a valid MM:SS time.",
        },
      };
    }
    return {
      ...state,
      clock: setClock(stopClock(state.clock, timestampMs), clockMs),
      game: stopPenalties(state.game, timestampMs),
      console: readyConsole(state, "enter"),
    };
  }

  const value = Number(inputBuffer);
  if (!Number.isSafeInteger(value)) {
    return state;
  }
  if (pendingOperation.kind === "period") {
    return {
      ...state,
      game: { ...state.game, period: Math.max(1, value) },
      console: readyConsole(state, "enter"),
    };
  }
  if (!pendingOperation.team) {
    return state;
  }

  const field =
    pendingOperation.kind === "score"
      ? "score"
      : pendingOperation.kind === "shots"
        ? "shotsOnGoal"
        : "timeoutsRemaining";

  return {
    ...state,
    game: updateTeam(state.game, pendingOperation.team, (team) => ({
      ...team,
      [field]: Math.max(0, value),
    })),
    console: readyConsole(state, "enter"),
  };
};

const clearPendingOperation = (state: SimulatorState): SimulatorState => {
  const operation = state.console.pendingOperation;
  if (
    operation?.kind === "player-penalty" &&
    operation.stage === "slot" &&
    operation.team &&
    operation.slotIndex !== undefined &&
    state.game[operation.team].penalties[operation.slotIndex]
  ) {
    const penalties = state.game[operation.team].penalties.filter(
      (_, index) => index !== operation.slotIndex,
    );
    return {
      ...state,
      game: updateTeam(state.game, operation.team, (team) => ({
        ...team,
        teamPenalty: penalties.length > 0,
        penalties,
      })),
      console: readyConsole(state, "clear"),
    };
  }

  return { ...state, console: readyConsole(state, "clear") };
};

const movePenaltySlot = (
  state: SimulatorState,
  delta: number,
): SimulatorState => {
  const operation = state.console.pendingOperation;
  if (
    operation?.kind !== "player-penalty" ||
    operation.stage !== "slot" ||
    !operation.team
  ) {
    return state;
  }
  const availableSlots = Math.max(
    1,
    Math.min(
      MAX_PENALTIES_PER_TEAM,
      state.game[operation.team].penalties.length + 1,
    ),
  );
  const slotIndex =
    ((operation.slotIndex ?? 0) + delta + availableSlots) % availableSlots;
  return withPendingOperation(state, {
    ...operation,
    slotIndex,
    label: `${operation.team} penalty ${slotIndex + 1}`,
  });
};

const handleReadyKey = (
  state: SimulatorState,
  key: ConsoleKeyId,
  timestampMs: number,
): SimulatorState => {
  const isHockey = state.configuration.mode === "hockey";
  const operation = pendingOperationFor(state, key);
  if (operation && (isHockey || operation.kind === "clock")) {
    return withPendingOperation(state, operation);
  }

  const team = key.startsWith("home-")
    ? "home"
    : key.startsWith("guest-")
      ? "guest"
      : null;

  if (team && key.endsWith("player-penalty") && isHockey) {
    return startPenaltyEntry(state, team);
  }
  if (team && key.endsWith("score-plus-1") && isHockey) {
    return {
      ...state,
      game: updateTeam(state.game, team, (current) => ({
        ...current,
        score: current.score + 1,
      })),
    };
  }
  if (team && key.endsWith("score-minus-1") && isHockey) {
    return {
      ...state,
      game: updateTeam(state.game, team, (current) => ({
        ...current,
        score: Math.max(0, current.score - 1),
      })),
    };
  }
  if (
    team &&
    key.endsWith("shots-plus-1") &&
    isHockey &&
    state.configuration.shotsOnGoalMode !== "none"
  ) {
    return {
      ...state,
      game: updateTeam(state.game, team, (current) => ({
        ...current,
        shotsOnGoal: current.shotsOnGoal + 1,
      })),
    };
  }
  if (team && key.endsWith("-penalty") && isHockey) {
    return {
      ...state,
      game: updateTeam(state.game, team, (current) => ({
        ...current,
        teamPenalty: !current.teamPenalty,
      })),
    };
  }
  if (key === "period-plus-1" && isHockey) {
    const resetShots = state.configuration.shotsOnGoalMode === "period";
    return {
      ...state,
      game: {
        ...state.game,
        period: state.game.period + 1,
        home: resetShots
          ? { ...state.game.home, shotsOnGoal: 0 }
          : state.game.home,
        guest: resetShots
          ? { ...state.game.guest, shotsOnGoal: 0 }
          : state.game.guest,
      },
    };
  }
  if (key === "start") {
    return {
      ...state,
      clock: startClock(state.clock, timestampMs),
      game:
        state.game.penaltyClocksEnabled && !state.clock.running
          ? startPenalties(state.game, timestampMs)
          : state.game,
    };
  }
  if (key === "stop") {
    return {
      ...state,
      clock: stopClock(state.clock, timestampMs),
      game: state.clock.running
        ? stopPenalties(state.game, timestampMs)
        : state.game,
    };
  }
  if (key === "disable-penalty-clocks" && isHockey) {
    return {
      ...state,
      game: {
        ...stopPenalties(state.game, timestampMs),
        penaltyClocksEnabled: false,
      },
    };
  }
  if (key === "enable-penalty-clocks" && isHockey) {
    const game = { ...state.game, penaltyClocksEnabled: true };
    return {
      ...state,
      game: state.clock.running ? startPenalties(game, timestampMs) : game,
    };
  }
  if (key === "horn" || key === "horn-release") {
    return {
      ...state,
      game: {
        ...state.game,
        hornActive: key === "horn",
        hornSignalCount:
          key === "horn"
            ? state.game.hornSignalCount + 1
            : state.game.hornSignalCount,
      },
    };
  }
  if (key === "auto-horn") {
    return {
      ...state,
      game: { ...state.game, autoHorn: !state.game.autoHorn },
    };
  }

  return state;
};

const withStartup = (
  state: SimulatorState,
  startup: NonNullable<SimulatorState["console"]["startup"]>,
): SimulatorState => ({
  ...state,
  console: {
    ...state.console,
    startup,
    errorMessage: null,
  },
});

const handleStartupKey = (
  state: SimulatorState,
  key: ConsoleKeyId,
): SimulatorState => {
  const startup = state.console.startup;
  if (!startup) {
    return state;
  }

  if (startup.step === "resume-game") {
    if (key === "enter") {
      return {
        ...state,
        console: {
          ...state.console,
          startup: null,
          mode: "ready",
          errorMessage: null,
        },
      };
    }
    if (key === "clear") {
      return withStartup(state, {
        step: "game-code",
        buffer: "",
        error: null,
      });
    }
    return state;
  }

  if (startup.error) {
    return key === "clear"
      ? withStartup(state, {
          ...startup,
          buffer: startup.buffer.slice(0, -1),
          error: null,
        })
      : state;
  }

  if (key.startsWith("digit-")) {
    if (startup.buffer.length >= 3) {
      return state;
    }
    return withStartup(state, {
      ...startup,
      buffer: `${startup.buffer}${key.slice(-1)}`,
    });
  }

  if (key === "clear") {
    if (startup.buffer) {
      return withStartup(state, {
        ...startup,
        buffer: startup.buffer.slice(0, -1),
      });
    }
    return startup.step === "sog-code"
      ? withStartup(state, {
          step: "game-code",
          buffer: "",
          error: null,
        })
      : state;
  }

  if (key !== "enter") {
    return state;
  }

  if (!startup.buffer) {
    return withStartup(state, { ...startup, error: "ENTER A CODE" });
  }

  if (startup.step === "game-code" && startup.buffer === "63") {
    return withStartup(state, {
      step: "sog-code",
      buffer: "",
      error: null,
    });
  }

  const configurationId = getStartupConfigurationId(startup.buffer);
  const validForStep =
    configurationId &&
    (startup.step === "game-code" ||
      startup.buffer === "196" ||
      startup.buffer === "197");
  if (!validForStep) {
    return withStartup(state, {
      ...startup,
      error:
        startup.step === "sog-code"
          ? "USE CODE 196 OR 197"
          : "CODE NOT SUPPORTED",
    });
  }

  return applyConfiguration(state, configurationId);
};

const handleConsoleKey = (
  state: SimulatorState,
  key: ConsoleKeyId,
  timestampMs: number,
): SimulatorState => {
  if (state.console.startup) {
    return handleStartupKey(state, key);
  }

  if (state.console.pendingOperation) {
    if (key === "clear") {
      return clearPendingOperation(state);
    }
    if (key === "enter") {
      return applyPendingOperation(state, timestampMs);
    }
    if (key === "arrow-up" || key === "arrow-down") {
      return movePenaltySlot(state, key === "arrow-up" ? -1 : 1);
    }
    if (key.startsWith("digit-")) {
      const operation = state.console.pendingOperation;
      const digit = key.slice(-1);
      const replacePrefill =
        operation.kind === "player-penalty" &&
        operation.stage === "duration" &&
        !operation.inputStarted;
      const inputBuffer = replacePrefill
        ? digit
        : `${state.console.inputBuffer}${digit}`;
      if (inputBuffer.length > operation.maxDigits) {
        return state;
      }
      return {
        ...state,
        console: {
          ...state.console,
          mode: "numeric-entry",
          inputBuffer,
          pendingOperation: {
            ...operation,
            inputStarted: true,
          },
          errorMessage: null,
        },
      };
    }

    return state;
  }

  if (key === "clear" || key === "enter" || key.startsWith("digit-")) {
    return state;
  }
  return handleReadyKey(state, key, timestampMs);
};

const recordKey = (
  previous: SimulatorState,
  next: SimulatorState,
  key: ConsoleKeyId,
  timestampMs: number,
): SimulatorState => ({
  ...next,
  console: { ...next.console, lastKey: key },
  session: {
    ...next.session,
    events: [
      ...previous.session.events,
      {
        sequence: previous.session.events.length + 1,
        elapsedMs: Math.max(0, timestampMs - previous.session.startedAtMs),
        key,
      },
    ],
  },
});

export const reduceSimulator = (
  state: SimulatorState,
  event: SimulatorEvent,
): SimulatorState => {
  switch (event.type) {
    case "SESSION_RESET": {
      if (state.console.startup) {
        return state;
      }
      const reset = createInitialSimulatorState(
        { configurationId: state.configuration.id },
        0,
        state.training.mode,
      );
      return {
        ...reset,
        training: {
          ...reset.training,
          completedScenarioIds: [...state.training.completedScenarioIds],
          assessmentResults: state.training.assessmentResults.map((result) => ({
            ...result,
          })),
        },
        preferences: { ...state.preferences },
      };
    }
    case "CONSOLE_POWER_CYCLED": {
      const game = state.clock.running
        ? stopPenalties(state.game, event.timestampMs)
        : state.game;
      return {
        ...state,
        clock: stopClock(state.clock, event.timestampMs),
        game: {
          ...game,
          hornActive: false,
        },
        console: {
          ...state.console,
          startup: {
            step: "resume-game",
            buffer: "",
            error: null,
          },
          mode: "ready",
          inputBuffer: "",
          pendingOperation: null,
          lastKey: null,
          errorMessage: null,
        },
        training: {
          ...state.training,
          activeScenarioId: null,
          hintsRequested: 0,
        },
      };
    }
    case "CONFIGURATION_CHANGED":
      return applyConfiguration(state, event.configurationId);
    case "SCENARIO_STARTED": {
      if (state.console.startup) {
        return state;
      }
      const next = createInitialSimulatorState(
        event.seed,
        event.timestampMs,
        state.training.mode,
      );
      return {
        ...next,
        training: {
          ...next.training,
          activeScenarioId: event.scenarioId,
          completedScenarioIds: [...state.training.completedScenarioIds],
          assessmentResults: state.training.assessmentResults.map((result) => ({
            ...result,
          })),
        },
        preferences: { ...state.preferences },
      };
    }
    case "TRAINING_MODE_CHANGED":
      return {
        ...state,
        training: { ...state.training, mode: event.mode },
      };
    case "SOUND_TOGGLED":
      return {
        ...state,
        preferences: {
          ...state.preferences,
          soundEnabled: !state.preferences.soundEnabled,
        },
      };
    case "SCENARIO_CANCELLED":
      return {
        ...state,
        training: {
          ...state.training,
          activeScenarioId: null,
          hintsRequested: 0,
        },
        session: {
          startedAtMs: 0,
          events: [],
        },
      };
    case "TRAINING_HINT_REQUESTED":
      return {
        ...state,
        training: {
          ...state.training,
          hintsRequested: state.training.hintsRequested + 1,
        },
      };
    case "SCENARIO_COMPLETED": {
      const completedScenarioIds = state.training.completedScenarioIds.includes(
        event.scenarioId,
      )
        ? state.training.completedScenarioIds
        : [...state.training.completedScenarioIds, event.scenarioId];
      const assessmentResults = event.result
        ? [
            ...state.training.assessmentResults.filter(
              ({ scenarioId }) => scenarioId !== event.scenarioId,
            ),
            { ...event.result },
          ]
        : state.training.assessmentResults;
      return {
        ...state,
        training: {
          ...state.training,
          completedScenarioIds,
          assessmentResults,
        },
      };
    }
    case "PROGRESS_RESTORED":
      return {
        ...state,
        training: {
          ...state.training,
          completedScenarioIds: [...event.completedScenarioIds],
          assessmentResults: event.assessmentResults.map((result) => ({
            ...result,
          })),
        },
      };
    case "CLOCK_EXPIRED": {
      if (!state.clock.running) {
        return state;
      }
      return {
        ...state,
        clock: stopClock(state.clock, event.timestampMs),
        game: {
          ...stopPenalties(state.game, event.timestampMs),
          hornActive: false,
          hornSignalCount:
            state.game.hornSignalCount + (state.game.autoHorn ? 1 : 0),
        },
      };
    }
    case "CONSOLE_KEY_PRESSED": {
      if (state.console.startup) {
        const next = handleStartupKey(state, event.key);
        return {
          ...next,
          console: { ...next.console, lastKey: event.key },
        };
      }
      const next = handleConsoleKey(state, event.key, event.timestampMs);
      return recordKey(state, next, event.key, event.timestampMs);
    }
  }
};

export const runKeySequence = (
  initialState: SimulatorState,
  keys: ConsoleKeyId[],
): SimulatorState =>
  keys.reduce(
    (state, key, index) =>
      reduceSimulator(state, {
        type: "CONSOLE_KEY_PRESSED",
        key,
        timestampMs: index * 100,
      }),
    initialState,
  );
