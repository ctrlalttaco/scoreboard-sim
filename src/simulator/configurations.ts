import type { RinkConfiguration, RinkConfigurationId } from "./types";

export const rinkConfigurations: readonly RinkConfiguration[] = [
  {
    id: "hockey-no-sog",
    label: "Hockey · no SOG",
    description: "Primary hockey console without shots-on-goal display.",
    mode: "hockey",
    sportCode: "62",
    auxiliaryCode: null,
    overlayId: "ll-2274",
    defaultClockMs: 20 * 60_000,
    shotsOnGoalMode: "none",
    confidence: "verified",
  },
  {
    id: "hockey-sog-game",
    label: "Hockey · game SOG",
    description: "Hockey code 63 with auxiliary game-total SOG code 196.",
    mode: "hockey",
    sportCode: "63",
    auxiliaryCode: "196",
    overlayId: "ll-2274",
    defaultClockMs: 20 * 60_000,
    shotsOnGoalMode: "game",
    confidence: "verified",
  },
  {
    id: "hockey-sog-period",
    label: "Hockey · period SOG",
    description: "Hockey code 63 with auxiliary period SOG code 197.",
    mode: "hockey",
    sportCode: "63",
    auxiliaryCode: "197",
    overlayId: "ll-2274",
    defaultClockMs: 20 * 60_000,
    shotsOnGoalMode: "period",
    confidence: "verified",
  },
  {
    id: "youth-hockey",
    label: "Youth hockey · 15:00",
    description:
      "A trainer preset using hockey code 63 and 15-minute periods; confirm local league rules.",
    mode: "hockey",
    sportCode: "63",
    auxiliaryCode: "197",
    overlayId: "ll-2274",
    defaultClockMs: 15 * 60_000,
    shotsOnGoalMode: "period",
    confidence: "product-policy",
  },
  {
    id: "ice-session-timer",
    label: "Ice session timer · 15:00",
    description:
      "Four-digit multi-purpose timer for practice, resurfacing, or public-skate sessions.",
    mode: "rink-timer",
    sportCode: "96",
    auxiliaryCode: null,
    overlayId: "ll-2270",
    defaultClockMs: 15 * 60_000,
    shotsOnGoalMode: "none",
    confidence: "verified",
  },
] as const;

export const getRinkConfiguration = (
  id: RinkConfigurationId = "hockey-sog-game",
): RinkConfiguration =>
  rinkConfigurations.find((configuration) => configuration.id === id) ??
  rinkConfigurations[1];
