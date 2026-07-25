"use client";

import type {
  ScenarioEvaluation,
  TrainingScenario,
} from "../simulator/training";
import type { SimulatorState, TrainingMode } from "../simulator/types";

interface TrainingPanelProps {
  state: SimulatorState;
  scenarios: TrainingScenario[];
  selectedScenarioId: string;
  evaluation: ScenarioEvaluation | null;
  onModeChange: (mode: TrainingMode) => void;
  onScenarioChange: (scenarioId: string) => void;
  onStart: () => void;
  onHint: () => void;
}

const modeLabels: Record<TrainingMode, string> = {
  free: "Free",
  guided: "Guided",
  assessment: "Assess",
};

export function TrainingPanel({
  state,
  scenarios,
  selectedScenarioId,
  evaluation,
  onModeChange,
  onScenarioChange,
  onStart,
  onHint,
}: TrainingPanelProps) {
  const scenario =
    scenarios.find(({ id }) => id === selectedScenarioId) ?? scenarios[0];
  const isActive = state.training.activeScenarioId === scenario.id;
  const completed = state.training.completedScenarioIds.includes(scenario.id);

  return (
    <aside aria-label="Training task" className="training-panel">
      <div className="training-header">
        <div>
          <span className="eyebrow">OPERATOR DRILL</span>
          <h2>Training task</h2>
        </div>
        <span className={`status-dot ${isActive ? "is-active" : ""}`}>
          {state.console.startup ? "STARTUP" : isActive ? "LIVE" : "READY"}
        </span>
      </div>

      <div aria-label="Training mode" className="mode-switcher" role="group">
        {(Object.keys(modeLabels) as TrainingMode[]).map((mode) => (
          <button
            aria-pressed={state.training.mode === mode}
            className={state.training.mode === mode ? "is-selected" : ""}
            key={mode}
            onClick={() => onModeChange(mode)}
            type="button"
          >
            {modeLabels[mode]}
          </button>
        ))}
      </div>

      <label className="scenario-select">
        <span>Scenario</span>
        <select
          onChange={(event) => onScenarioChange(event.target.value)}
          value={scenario.id}
        >
          {scenarios.map((item, index) => (
            <option key={item.id} value={item.id}>
              {index + 1}. {item.title}
              {state.training.completedScenarioIds.includes(item.id)
                ? " ✓"
                : ""}
            </option>
          ))}
        </select>
      </label>

      <article className="task-card">
        <div className="task-meta">
          <span>{scenario.difficulty}</span>
          <span>{scenario.expectedActions.length} actions</span>
          {completed ? <span className="complete-label">complete</span> : null}
        </div>
        <h3>{scenario.title}</h3>
        <p>{scenario.description}</p>
      </article>

      {state.console.startup ? (
        <div className="practice-note">
          <strong>Complete controller startup first.</strong>
          <span>
            Use the console keypad to resume or enter a game code. Training
            controls unlock when the console is ready.
          </span>
        </div>
      ) : state.training.mode === "free" ? (
        <div className="practice-note">
          <strong>Free practice is active.</strong>
          <span>
            Operate the console without scoring or hints. Choose Guided or
            Assess when you want this drill evaluated.
          </span>
        </div>
      ) : (
        <>
          <button className="primary-action" onClick={onStart} type="button">
            {isActive ? "Restart scenario" : "Start scenario"}
          </button>

          {isActive && evaluation ? (
            <section
              aria-live="polite"
              className={`evaluation ${evaluation.completed ? "is-complete" : ""}`}
            >
              <div className="evaluation-summary">
                <strong>
                  {evaluation.completed ? "Drill complete" : "In progress"}
                </strong>
                <span>{evaluation.mistakes} mistakes</span>
              </div>
              <ul>
                {evaluation.objectives.map((objective) => (
                  <li key={objective.description}>
                    <span aria-hidden="true">
                      {objective.complete ? "✓" : "○"}
                    </span>
                    {objective.description}
                  </li>
                ))}
              </ul>
              {state.training.mode === "guided" &&
              !evaluation.completed &&
              evaluation.nextAction ? (
                <p className="next-action">
                  <small>NEXT EXPECTED</small>
                  {evaluation.nextAction}
                </p>
              ) : null}
              {state.training.mode === "guided" ? (
                <button
                  className="secondary-action"
                  onClick={onHint}
                  type="button"
                >
                  Show hint
                </button>
              ) : (
                <p className="assessment-note">
                  Hints are hidden during assessment.
                </p>
              )}
              {state.training.mode === "guided" &&
              state.training.hintsRequested > 0 ? (
                <p className="hint">
                  {
                    scenario.hints[
                      Math.min(
                        state.training.hintsRequested - 1,
                        scenario.hints.length - 1,
                      )
                    ]
                  }
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      <div className="source-note">
        <span>Source basis</span>
        <strong>Official ED-9999 hockey section</strong>
        <small>Codes 62/63/96 + SOG 196/197 · mixed prompt confidence</small>
      </div>
    </aside>
  );
}
