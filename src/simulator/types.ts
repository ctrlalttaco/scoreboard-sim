export type TeamId = "home" | "guest";
export type ConsoleMode = "ready" | "numeric-entry" | "error";
export type TrainingMode = "free" | "guided" | "assessment";
export type RinkMode = "hockey" | "rink-timer";
export type ShotsOnGoalMode = "none" | "game" | "period";
export type RinkConfigurationId =
  | "hockey-no-sog"
  | "hockey-sog-game"
  | "hockey-sog-period"
  | "youth-hockey"
  | "ice-session-timer";

export interface RinkConfiguration {
  id: RinkConfigurationId;
  label: string;
  description: string;
  mode: RinkMode;
  sportCode: "62" | "63" | "96";
  auxiliaryCode: "196" | "197" | null;
  overlayId: "ll-2274" | "ll-2270";
  defaultClockMs: number;
  shotsOnGoalMode: ShotsOnGoalMode;
  confidence: "verified" | "product-policy";
}

export type ConsoleKeyId =
  | "home-timeouts-left"
  | "home-penalty"
  | "home-player-penalty"
  | "home-shots-edit"
  | "home-shots-plus-1"
  | "home-score-edit"
  | "home-score-plus-1"
  | "home-score-minus-1"
  | "guest-timeouts-left"
  | "guest-penalty"
  | "guest-player-penalty"
  | "guest-shots-edit"
  | "guest-shots-plus-1"
  | "guest-score-edit"
  | "guest-score-plus-1"
  | "guest-score-minus-1"
  | "enable-penalty-clocks"
  | "disable-penalty-clocks"
  | "period-edit"
  | "period-plus-1"
  | "set-main-clock"
  | "start"
  | "stop"
  | "horn"
  | "horn-release"
  | "auto-horn"
  | "arrow-up"
  | "arrow-down"
  | "enter"
  | "clear"
  | `digit-${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;

export type PendingOperationKind =
  "score" | "shots" | "timeouts" | "period" | "clock" | "player-penalty";

export interface PendingConsoleOperation {
  kind: PendingOperationKind;
  label: string;
  team?: TeamId;
  maxDigits: number;
  stage?: "slot" | "player" | "duration";
  slotIndex?: number;
  playerNumber?: number;
  inputStarted?: boolean;
}

export interface GameClockState {
  durationMs: number;
  remainingAtReferenceMs: number;
  running: boolean;
  direction: "down";
  precision: "seconds";
  referenceTimestampMs: number | null;
}

export interface PlayerPenalty {
  playerNumber: number;
  durationMs: number;
  remainingAtReferenceMs: number;
  referenceTimestampMs: number | null;
}

export interface HockeyTeamState {
  score: number;
  shotsOnGoal: number;
  timeoutsRemaining: number;
  teamPenalty: boolean;
  penalties: PlayerPenalty[];
}

export interface HockeyGameState {
  home: HockeyTeamState;
  guest: HockeyTeamState;
  period: number;
  hornActive: boolean;
  hornSignalCount: number;
  autoHorn: boolean;
  penaltyClocksEnabled: boolean;
}

export interface ConsoleState {
  power: "on";
  sportCode: RinkConfiguration["sportCode"];
  overlayId: RinkConfiguration["overlayId"];
  mode: ConsoleMode;
  inputBuffer: string;
  pendingOperation: PendingConsoleOperation | null;
  lastKey: ConsoleKeyId | null;
  errorMessage: string | null;
}

export interface AssessmentResult {
  scenarioId: string;
  elapsedMs: number;
  mistakes: number;
}

export interface TrainingState {
  mode: TrainingMode;
  activeScenarioId: string | null;
  hintsRequested: number;
  completedScenarioIds: string[];
  assessmentResults: AssessmentResult[];
}

export interface RecordedSessionEvent {
  sequence: number;
  elapsedMs: number;
  key: ConsoleKeyId;
}

export interface SessionState {
  startedAtMs: number;
  events: RecordedSessionEvent[];
}

export interface SimulatorPreferences {
  soundEnabled: boolean;
  reducedMotion: boolean;
}

export interface SimulatorState {
  configuration: RinkConfiguration;
  console: ConsoleState;
  game: HockeyGameState;
  clock: GameClockState;
  training: TrainingState;
  session: SessionState;
  preferences: SimulatorPreferences;
}

export interface SimulatorStateSeed {
  configurationId?: RinkConfigurationId;
  homeScore?: number;
  guestScore?: number;
  homeShots?: number;
  guestShots?: number;
  homeTimeouts?: number;
  guestTimeouts?: number;
  homePenalties?: PlayerPenalty[];
  guestPenalties?: PlayerPenalty[];
  period?: number;
  clockMs?: number;
  clockRunning?: boolean;
  penaltyClocksEnabled?: boolean;
}

export type SimulatorEvent =
  | {
      type: "CONSOLE_KEY_PRESSED";
      key: ConsoleKeyId;
      timestampMs: number;
    }
  | { type: "SESSION_RESET" }
  | {
      type: "CONFIGURATION_CHANGED";
      configurationId: RinkConfigurationId;
    }
  | {
      type: "SCENARIO_STARTED";
      scenarioId: string;
      seed: SimulatorStateSeed;
      timestampMs: number;
    }
  | { type: "SCENARIO_CANCELLED" }
  | { type: "TRAINING_MODE_CHANGED"; mode: TrainingMode }
  | { type: "TRAINING_HINT_REQUESTED" }
  | {
      type: "SCENARIO_COMPLETED";
      scenarioId: string;
      result?: AssessmentResult;
    }
  | {
      type: "PROGRESS_RESTORED";
      completedScenarioIds: string[];
      assessmentResults: AssessmentResult[];
    }
  | { type: "CLOCK_EXPIRED"; timestampMs: number };
