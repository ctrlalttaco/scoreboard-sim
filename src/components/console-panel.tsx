"use client";

import { useRef } from "react";

import {
  fixedConsoleKeys,
  gameOverlayKeys,
  teamOverlayKeys,
  type OverlayKeyDefinition,
} from "../simulator/overlay";
import { selectLcdLines } from "../simulator/selectors";
import type { ConsoleKeyId, SimulatorState, TeamId } from "../simulator/types";

interface ConsolePanelProps {
  state: SimulatorState;
  timestampMs: number;
  onKey: (key: ConsoleKeyId) => void;
}

const labelLines = (label: string) =>
  label
    .split("\n")
    .map((line, index) => <span key={`${line}-${index}`}>{line}</span>);

const ConsoleKey = ({
  definition,
  disabled = false,
  onKey,
  pressed,
}: {
  definition: OverlayKeyDefinition;
  disabled?: boolean;
  onKey: (key: ConsoleKeyId) => void;
  pressed?: boolean;
}) => {
  const isHorn = definition.keyId === "horn";
  const hornPressed = useRef(false);
  const className = `console-key role-${definition.visualRole} ${
    pressed ? "is-pressed" : ""
  } ${disabled ? "is-disabled" : ""}`;

  if (isHorn) {
    const pressHorn = () => {
      if (!hornPressed.current) {
        hornPressed.current = true;
        onKey("horn");
      }
    };
    const releaseHorn = () => {
      if (hornPressed.current) {
        hornPressed.current = false;
        onKey("horn-release");
      }
    };

    return (
      <button
        aria-label={definition.accessibleName}
        className={className}
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            pressHorn();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            releaseHorn();
          }
        }}
        onPointerCancel={releaseHorn}
        onPointerDown={pressHorn}
        onPointerLeave={releaseHorn}
        onPointerUp={releaseHorn}
        type="button"
      >
        {labelLines(definition.label)}
      </button>
    );
  }

  return (
    <button
      aria-label={definition.accessibleName}
      className={className}
      disabled={disabled}
      onClick={() => onKey(definition.keyId)}
      type="button"
    >
      {labelLines(definition.label)}
    </button>
  );
};

const TeamCluster = ({
  team,
  state,
  onKey,
}: {
  team: TeamId;
  state: SimulatorState;
  onKey: (key: ConsoleKeyId) => void;
}) => {
  const timerOnly = state.configuration.mode === "rink-timer";
  const noShots = state.configuration.shotsOnGoalMode === "none";

  return (
    <section
      className={`team-cluster team-${team}`}
      aria-label={`${team} keys`}
    >
      <div className="cluster-title">{team.toUpperCase()}</div>
      <div className="team-key-grid">
        {teamOverlayKeys(team).map((definition) => {
          const isShots = definition.keyId.includes("-shots-");
          const disabled = timerOnly || (isShots && noShots);
          return (
            <ConsoleKey
              definition={definition}
              disabled={disabled}
              key={definition.keyId}
              onKey={onKey}
              pressed={
                state.console.lastKey === definition.keyId ||
                (definition.keyId.endsWith("-penalty") &&
                  !definition.keyId.endsWith("player-penalty") &&
                  state.game[team].teamPenalty)
              }
            />
          );
        })}
      </div>
    </section>
  );
};

const FixedKeypad = ({
  state,
  onKey,
}: {
  state: SimulatorState;
  onKey: (key: ConsoleKeyId) => void;
}) => {
  const numericKeys = fixedConsoleKeys.slice(0, 12);
  const controlKeys = fixedConsoleKeys.slice(12);

  return (
    <section className="fixed-keypad" aria-label="Fixed console keypad">
      <div className="number-pad">
        {numericKeys.map((definition) => (
          <ConsoleKey
            definition={definition}
            key={definition.keyId}
            onKey={onKey}
            pressed={state.console.lastKey === definition.keyId}
          />
        ))}
      </div>
      <div className="console-navigation" aria-label="Console navigation">
        <button
          aria-label="Previous penalty slot"
          className="console-key role-clock"
          onClick={() => onKey("arrow-up")}
          type="button"
        >
          ▲
        </button>
        <button
          aria-label="Next penalty slot"
          className="console-key role-clock"
          onClick={() => onKey("arrow-down")}
          type="button"
        >
          ▼
        </button>
      </div>
      <div className="clock-controls">
        {controlKeys.map((definition) => (
          <ConsoleKey
            definition={definition}
            key={definition.keyId}
            onKey={onKey}
            pressed={
              state.console.lastKey === definition.keyId ||
              (definition.keyId === "auto-horn" && state.game.autoHorn) ||
              (definition.keyId === "horn" && state.game.hornActive)
            }
          />
        ))}
      </div>
    </section>
  );
};

export function ConsolePanel({ state, timestampMs, onKey }: ConsolePanelProps) {
  const lcd = selectLcdLines(state, timestampMs);
  const isPrompt = Boolean(
    state.console.pendingOperation || state.console.mode === "error",
  );
  const auxiliary = state.configuration.auxiliaryCode
    ? ` + SOG ${state.configuration.auxiliaryCode}`
    : "";

  return (
    <section aria-label="Console simulator" className="console-panel">
      <div className="console-heading">
        <div>
          <span className="eyebrow">TRAINING RECREATION</span>
          <h2>4000 Series Console</h2>
        </div>
        <span className="source-chip">
          CODE {state.console.sportCode}
          {auxiliary} · {state.console.overlayId.toUpperCase()}
        </span>
      </div>

      <div className="console-chassis">
        <div className="lcd-bezel">
          <div
            aria-label={`${lcd.line1}. ${lcd.line2}`}
            aria-live={isPrompt ? "polite" : "off"}
            className="lcd-display"
            role={isPrompt ? "status" : undefined}
          >
            <span data-testid="lcd-line-1">{lcd.line1}</span>
            <span data-testid="lcd-line-2">{lcd.line2}</span>
          </div>
          <small>
            Hockey key roles follow ED-9999. Prompt wording is labeled as a
            training recreation where exact firmware text is unavailable.
          </small>
        </div>

        <div className="overlay-board">
          <TeamCluster onKey={onKey} state={state} team="home" />
          <section className="game-cluster" aria-label="Game keys">
            <div className="game-key-grid">
              {gameOverlayKeys.map((definition) => (
                <ConsoleKey
                  definition={definition}
                  disabled={state.configuration.mode === "rink-timer"}
                  key={definition.keyId}
                  onKey={onKey}
                  pressed={
                    state.console.lastKey === definition.keyId ||
                    (definition.keyId === "enable-penalty-clocks" &&
                      state.game.penaltyClocksEnabled) ||
                    (definition.keyId === "disable-penalty-clocks" &&
                      !state.game.penaltyClocksEnabled)
                  }
                />
              ))}
            </div>
            <span>
              {state.configuration.mode === "hockey" ? "HOCKEY" : "RINK TIMER"}
            </span>
          </section>
          <TeamCluster onKey={onKey} state={state} team="guest" />
        </div>

        <FixedKeypad onKey={onKey} state={state} />
      </div>
    </section>
  );
}
