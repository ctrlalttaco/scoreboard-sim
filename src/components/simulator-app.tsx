"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { getRemainingMs } from "../simulator/clock";
import {
  createInitialSimulatorState,
  reduceSimulator,
} from "../simulator/engine";
import { rinkConfigurations } from "../simulator/configurations";
import {
  loadProgress,
  resetProgress,
  saveProgress,
} from "../simulator/persistence";
import { evaluateScenario, hockeyScenarios } from "../simulator/training";
import type {
  ConsoleKeyId,
  RinkConfigurationId,
  TrainingMode,
} from "../simulator/types";
import { ConsolePanel } from "./console-panel";
import { PwaStatus } from "./pwa-status";
import { Scoreboard } from "./scoreboard";
import { TrainingPanel } from "./training-panel";

type MobileView = "console" | "scoreboard" | "task";

const now = (): number =>
  typeof performance === "undefined" ? 0 : performance.now();

export function SimulatorApp() {
  const [state, dispatch] = useReducer(
    reduceSimulator,
    undefined,
    createInitialSimulatorState,
  );
  const [timestampMs, setTimestampMs] = useState(0);
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    hockeyScenarios[0].id,
  );
  const [mobileView, setMobileView] = useState<MobileView>("console");
  const announcedCompletions = useRef(new Set<string>());

  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() =>
      setTimestampMs(now()),
    );
    const timer = window.setInterval(() => setTimestampMs(now()), 250);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (state.clock.running && getRemainingMs(state.clock, timestampMs) === 0) {
      dispatch({ type: "CLOCK_EXPIRED", timestampMs });
    }
  }, [state.clock, timestampMs]);

  useEffect(() => {
    void loadProgress().then((progress) => {
      dispatch({
        type: "PROGRESS_RESTORED",
        completedScenarioIds: progress.completedScenarioIds,
        assessmentResults: progress.assessmentResults,
      });
    });
  }, []);

  const activeScenario = hockeyScenarios.find(
    ({ id }) => id === state.training.activeScenarioId,
  );
  const evaluation = useMemo(() => {
    if (!activeScenario || state.training.mode === "free") {
      return null;
    }
    return evaluateScenario(
      activeScenario,
      state,
      state.session.events.map(({ key }) => key),
    );
  }, [activeScenario, state]);

  useEffect(() => {
    if (
      !activeScenario ||
      !evaluation?.completed ||
      announcedCompletions.current.has(activeScenario.id)
    ) {
      return;
    }

    announcedCompletions.current.add(activeScenario.id);
    const completedScenarioIds = Array.from(
      new Set([...state.training.completedScenarioIds, activeScenario.id]),
    );
    const result =
      state.training.mode === "assessment"
        ? {
            scenarioId: activeScenario.id,
            elapsedMs:
              state.session.events.at(-1)?.elapsedMs ??
              Math.max(0, now() - state.session.startedAtMs),
            mistakes: evaluation.mistakes,
          }
        : undefined;
    const assessmentResults = result
      ? [
          ...state.training.assessmentResults.filter(
            ({ scenarioId }) => scenarioId !== activeScenario.id,
          ),
          result,
        ]
      : state.training.assessmentResults;
    dispatch({
      type: "SCENARIO_COMPLETED",
      scenarioId: activeScenario.id,
      result,
    });
    void saveProgress({
      version: 1,
      completedScenarioIds,
      assessmentResults,
    });
  }, [
    activeScenario,
    evaluation?.completed,
    evaluation?.mistakes,
    state.session.events,
    state.session.startedAtMs,
    state.training.assessmentResults,
    state.training.completedScenarioIds,
    state.training.mode,
  ]);

  const pressKey = (key: ConsoleKeyId) => {
    dispatch({
      type: "CONSOLE_KEY_PRESSED",
      key,
      timestampMs: now(),
    });
  };

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "SELECT" ||
        target?.tagName === "BUTTON"
      ) {
        return;
      }

      const digit = Number(event.key);
      if (/^\d$/.test(event.key)) {
        pressKey(`digit-${digit as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`);
        event.preventDefault();
      } else if (event.key === "Enter") {
        pressKey("enter");
        event.preventDefault();
      } else if (event.key === "Escape" || event.key === "Backspace") {
        pressKey("clear");
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  });

  const changeMode = (mode: TrainingMode) => {
    dispatch({ type: "TRAINING_MODE_CHANGED", mode });
  };

  const changeScenario = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    if (
      state.training.activeScenarioId &&
      state.training.activeScenarioId !== scenarioId
    ) {
      dispatch({ type: "SCENARIO_CANCELLED" });
    }
  };

  const startScenario = () => {
    const scenario =
      hockeyScenarios.find(({ id }) => id === selectedScenarioId) ??
      hockeyScenarios[0];
    announcedCompletions.current.delete(scenario.id);
    dispatch({
      type: "SCENARIO_STARTED",
      scenarioId: scenario.id,
      seed: scenario.initialState,
      timestampMs: now(),
    });
    setMobileView("console");
  };

  const resetLocalData = async () => {
    await resetProgress();
    dispatch({
      type: "PROGRESS_RESTORED",
      completedScenarioIds: [],
      assessmentResults: [],
    });
    dispatch({ type: "SESSION_RESET" });
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            LS
          </span>
          <div>
            <span className="eyebrow">HOCKEY &amp; ICE RINK OPERATIONS</span>
            <h1>Legacy Scoreboard Console Trainer</h1>
          </div>
        </div>
        <div className="header-actions">
          <label className="configuration-select">
            <span>Rink configuration</span>
            <select
              aria-label="Rink configuration"
              onChange={(event) =>
                dispatch({
                  type: "CONFIGURATION_CHANGED",
                  configurationId: event.target.value as RinkConfigurationId,
                })
              }
              value={state.configuration.id}
            >
              {rinkConfigurations.map((configuration) => (
                <option key={configuration.id} value={configuration.id}>
                  {configuration.label}
                </option>
              ))}
            </select>
          </label>
          <PwaStatus />
          <button
            className="reset-button"
            onClick={() => dispatch({ type: "SESSION_RESET" })}
            type="button"
          >
            Reset session
          </button>
        </div>
      </header>

      <div className="release-banner">
        <span>UNOFFICIAL TRAINING TOOL</span>
        <p>
          Source-backed key roles from the official 4000-series manual. No
          physical scoreboard connection.
        </p>
      </div>

      <nav aria-label="Mobile workspace" className="mobile-nav">
        {(["console", "scoreboard", "task"] as MobileView[]).map((view) => (
          <button
            aria-current={mobileView === view ? "page" : undefined}
            className={mobileView === view ? "is-active" : ""}
            key={view}
            onClick={() => setMobileView(view)}
            type="button"
          >
            {view}
          </button>
        ))}
      </nav>

      <div className="workspace">
        <div
          className={`scoreboard-region mobile-view-${mobileView}`}
          data-mobile-visible={mobileView === "scoreboard"}
        >
          <Scoreboard state={state} timestampMs={timestampMs} />
        </div>
        <div
          className={`console-region mobile-view-${mobileView}`}
          data-mobile-visible={mobileView === "console"}
        >
          <ConsolePanel
            onKey={pressKey}
            state={state}
            timestampMs={timestampMs}
          />
        </div>
        <div
          className={`training-region mobile-view-${mobileView}`}
          data-mobile-visible={mobileView === "task"}
        >
          <TrainingPanel
            evaluation={evaluation}
            onHint={() => dispatch({ type: "TRAINING_HINT_REQUESTED" })}
            onModeChange={changeMode}
            onScenarioChange={changeScenario}
            onStart={startScenario}
            scenarios={hockeyScenarios}
            selectedScenarioId={selectedScenarioId}
            state={state}
          />
        </div>
      </div>

      <footer className="app-footer">
        <p>
          Not affiliated with or endorsed by Daktronics. All Sport is a
          registered trademark of Daktronics, Inc.
        </p>
        <button onClick={() => void resetLocalData()} type="button">
          Clear local progress
        </button>
      </footer>
    </main>
  );
}
