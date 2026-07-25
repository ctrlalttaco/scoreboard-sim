import { formatGameClock, getRemainingMs } from "./clock";
import type { PlayerPenalty, SimulatorState } from "./types";

const padScore = (value: number): string =>
  Math.max(0, value).toString().padStart(3, "0");

export const getPenaltyRemainingMs = (
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

export const selectClockText = (
  state: SimulatorState,
  timestampMs: number,
): string => formatGameClock(getRemainingMs(state.clock, timestampMs));

export const selectLcdLines = (
  state: SimulatorState,
  timestampMs: number,
): { line1: string; line2: string } => {
  const startup = state.console.startup;
  if (startup?.step === "resume-game") {
    return {
      line1: "RESUME GAME?",
      line2: "ENTER YES CLEAR NO",
    };
  }

  if (startup) {
    if (startup.error) {
      return {
        line1:
          startup.step === "sog-code"
            ? "INVALID SOG CODE"
            : "INVALID GAME CODE",
        line2: `${startup.error} · CLEAR`,
      };
    }
    return {
      line1: startup.step === "sog-code" ? "ENTER SOG CODE" : "ENTER GAME CODE",
      line2: `${startup.buffer || "•••"}  ENTER *`,
    };
  }

  if (state.console.mode === "error") {
    return {
      line1: "ENTRY ERROR",
      line2: state.console.errorMessage ?? "PRESS CLEAR",
    };
  }

  const operation = state.console.pendingOperation;
  if (operation) {
    if (operation.kind === "player-penalty" && operation.stage === "slot") {
      const penalty =
        operation.team && operation.slotIndex !== undefined
          ? state.game[operation.team].penalties[operation.slotIndex]
          : undefined;
      return {
        line1: `${operation.label}`.toUpperCase(),
        line2: penalty
          ? `PL ${penalty.playerNumber}  ${formatGameClock(
              getPenaltyRemainingMs(penalty, timestampMs),
            )}`
          : "PL ••  PN ••:••",
      };
    }

    return {
      line1: `EDIT ${operation.label}`.toUpperCase(),
      line2: `${state.console.inputBuffer || "••"}  ENTER *`,
    };
  }

  const hornIndicator = state.game.autoHorn ? " H" : "";
  if (state.configuration.mode === "rink-timer") {
    return {
      line1: `${selectClockText(state, timestampMs)}  DN${hornIndicator}`,
      line2: "ICE SESSION TIMER",
    };
  }

  const shotsIndicator =
    state.configuration.shotsOnGoalMode === "none" ? "" : " SOG";
  return {
    line1: `${selectClockText(state, timestampMs)}  DN P${state.game.period}${hornIndicator}`,
    line2: `H ${padScore(state.game.home.score)}  G ${padScore(
      state.game.guest.score,
    )}${shotsIndicator}`,
  };
};
