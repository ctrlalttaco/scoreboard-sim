import type { ConsoleKeyId, TeamId } from "./types";

export interface OverlayKeyDefinition {
  keyId: ConsoleKeyId;
  label: string;
  accessibleName: string;
  visualRole: "team" | "game" | "clock" | "numeric" | "confirmation";
}

const teamKey = (
  keyId: ConsoleKeyId,
  label: string,
  accessibleName: string,
): OverlayKeyDefinition => ({
  keyId,
  label,
  accessibleName,
  visualRole: "team",
});

export const teamOverlayKeys = (team: TeamId): OverlayKeyDefinition[] => {
  const teamLabel = team === "home" ? "Home" : "Guest";
  return [
    teamKey(
      `${team}-timeouts-left`,
      "TIMEOUTS\nLEFT •",
      `Edit ${team} timeouts left`,
    ),
    teamKey(`${team}-penalty`, "PENALTY\n▲", `${teamLabel} team penalty`),
    teamKey(
      `${team}-player-penalty`,
      "PLAYER\nPENALTY •",
      `${teamLabel} player penalty`,
    ),
    teamKey(
      `${team}-shots-edit`,
      "SHOTS ON\nGOAL •",
      `Edit ${team} shots on goal`,
    ),
    teamKey(
      `${team}-shots-plus-1`,
      "SHOTS ON\nGOAL +1",
      `${teamLabel} shots on goal plus 1`,
    ),
    teamKey(`${team}-score-edit`, "SCORE •", `Edit ${team} score`),
    teamKey(`${team}-score-plus-1`, "SCORE\n+1", `${teamLabel} score plus 1`),
    teamKey(`${team}-score-minus-1`, "SCORE\n−1", `${teamLabel} score minus 1`),
  ];
};

export const gameOverlayKeys: OverlayKeyDefinition[] = [
  {
    keyId: "enable-penalty-clocks",
    label: "ENABLE\nPENALTY CLOCKS",
    accessibleName: "Enable penalty clocks",
    visualRole: "game",
  },
  {
    keyId: "disable-penalty-clocks",
    label: "DISABLE\nPENALTY CLOCKS",
    accessibleName: "Disable penalty clocks",
    visualRole: "game",
  },
  {
    keyId: "period-edit",
    label: "PERIOD •",
    accessibleName: "Edit period",
    visualRole: "game",
  },
  {
    keyId: "period-plus-1",
    label: "PERIOD +1",
    accessibleName: "Period plus 1",
    visualRole: "game",
  },
];

export const fixedConsoleKeys: OverlayKeyDefinition[] = [
  ...([7, 8, 9, 4, 5, 6, 1, 2, 3] as const).map((digit) => ({
    keyId: `digit-${digit}` as const,
    label: `${digit}`,
    accessibleName: `Digit ${digit}`,
    visualRole: "numeric" as const,
  })),
  {
    keyId: "clear",
    label: "CLEAR",
    accessibleName: "Clear",
    visualRole: "confirmation",
  },
  {
    keyId: "digit-0",
    label: "0",
    accessibleName: "Digit 0",
    visualRole: "numeric",
  },
  {
    keyId: "enter",
    label: "ENTER *",
    accessibleName: "Enter",
    visualRole: "confirmation",
  },
  {
    keyId: "auto-horn",
    label: "AUTO\nHORN",
    accessibleName: "Toggle automatic horn",
    visualRole: "clock",
  },
  {
    keyId: "horn",
    label: "HORN",
    accessibleName: "Horn",
    visualRole: "clock",
  },
  {
    keyId: "set-main-clock",
    label: "SET MAIN\nCLOCK •",
    accessibleName: "Set main clock",
    visualRole: "clock",
  },
  {
    keyId: "start",
    label: "START",
    accessibleName: "Start main clock",
    visualRole: "clock",
  },
  {
    keyId: "stop",
    label: "STOP",
    accessibleName: "Stop main clock",
    visualRole: "clock",
  },
];
