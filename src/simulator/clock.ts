import type { GameClockState } from "./types";

const clampMs = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

export const createGameClock = (durationMs: number): GameClockState => {
  const safeDuration = clampMs(durationMs);

  return {
    durationMs: safeDuration,
    remainingAtReferenceMs: safeDuration,
    running: false,
    direction: "down",
    precision: "seconds",
    referenceTimestampMs: null,
  };
};

export const getRemainingMs = (
  clock: GameClockState,
  timestampMs: number,
): number => {
  if (!clock.running || clock.referenceTimestampMs === null) {
    return clampMs(clock.remainingAtReferenceMs);
  }

  const elapsedMs = Math.max(0, timestampMs - clock.referenceTimestampMs);
  return clampMs(clock.remainingAtReferenceMs - elapsedMs);
};

export const startClock = (
  clock: GameClockState,
  timestampMs: number,
): GameClockState => {
  if (clock.running || clock.remainingAtReferenceMs <= 0) {
    return clock;
  }

  return {
    ...clock,
    running: true,
    referenceTimestampMs: timestampMs,
  };
};

export const stopClock = (
  clock: GameClockState,
  timestampMs: number,
): GameClockState => {
  if (!clock.running) {
    return clock;
  }

  return {
    ...clock,
    running: false,
    remainingAtReferenceMs: getRemainingMs(clock, timestampMs),
    referenceTimestampMs: null,
  };
};

export const setClock = (
  clock: GameClockState,
  remainingMs: number,
): GameClockState => {
  const safeRemaining = clampMs(remainingMs);

  return {
    ...clock,
    durationMs: safeRemaining,
    remainingAtReferenceMs: safeRemaining,
    running: false,
    referenceTimestampMs: null,
  };
};

export const formatGameClock = (remainingMs: number): string => {
  const totalSeconds = Math.ceil(clampMs(remainingMs) / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const parseClockBuffer = (buffer: string): number | null => {
  if (!/^\d{1,4}$/.test(buffer)) {
    return null;
  }

  const padded = buffer.padStart(4, "0");
  const minutes = Number(padded.slice(0, 2));
  const seconds = Number(padded.slice(2));

  return seconds < 60 ? (minutes * 60 + seconds) * 1_000 : null;
};
