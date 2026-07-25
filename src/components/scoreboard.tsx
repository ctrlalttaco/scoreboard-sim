import { formatGameClock } from "../simulator/clock";
import { getPenaltyRemainingMs, selectClockText } from "../simulator/selectors";
import type {
  HockeyTeamState,
  SimulatorState,
  TeamId,
} from "../simulator/types";

interface ScoreboardProps {
  state: SimulatorState;
  timestampMs: number;
}

const PenaltyList = ({
  penalties,
  timestampMs,
}: {
  penalties: HockeyTeamState["penalties"];
  timestampMs: number;
}) => (
  <div className="penalty-list">
    {penalties.slice(0, 2).map((penalty, index) => (
      <span key={`${penalty.playerNumber}-${index}`}>
        <small>PL {penalty.playerNumber}</small>
        <strong>
          {formatGameClock(getPenaltyRemainingMs(penalty, timestampMs))}
        </strong>
      </span>
    ))}
    {penalties.length === 0 ? (
      <span className="penalty-empty">NO PEN</span>
    ) : null}
  </div>
);

const TeamScore = ({
  label,
  state,
  team,
  timestampMs,
}: {
  label: string;
  state: SimulatorState;
  team: TeamId;
  timestampMs: number;
}) => {
  const teamState = state.game[team];
  return (
    <section className="scoreboard-team" aria-label={`${label} team`}>
      <div className="team-label">
        <span
          aria-label={`${team} penalty ${teamState.teamPenalty ? "on" : "off"}`}
          className={`possession-mark ${
            teamState.teamPenalty ? "is-active" : ""
          }`}
        >
          {teamState.teamPenalty ? "●" : "○"}
        </span>
        <span>{label}</span>
      </div>
      <strong className="scoreboard-score" data-testid={`${team}-score`}>
        {teamState.score}
      </strong>
      <div className="team-stats">
        <span>
          <small>SOG</small>
          <strong data-testid={`${team}-shots`}>
            {state.configuration.shotsOnGoalMode === "none"
              ? "—"
              : teamState.shotsOnGoal}
          </strong>
        </span>
        <span>
          <small>TIMEOUTS</small>
          <strong>{teamState.timeoutsRemaining}</strong>
        </span>
        <span className={teamState.teamPenalty ? "bonus is-active" : "bonus"}>
          {teamState.teamPenalty ? "PENALTY" : "EVEN"}
        </span>
      </div>
      <PenaltyList penalties={teamState.penalties} timestampMs={timestampMs} />
    </section>
  );
};

export function Scoreboard({ state, timestampMs }: ScoreboardProps) {
  const timerOnly = state.configuration.mode === "rink-timer";

  return (
    <section
      aria-label="Virtual scoreboard"
      className={`scoreboard ${timerOnly ? "scoreboard-timer" : ""}`}
      data-mode={state.configuration.mode}
      data-testid="scoreboard"
    >
      <div className="scoreboard-topline">
        <span>ICE RINK OPERATIONS</span>
        <span className="scoreboard-status">
          {state.clock.running ? "CLOCK RUNNING" : "CLOCK STOPPED"}
        </span>
      </div>
      <div className="scoreboard-main">
        {timerOnly ? null : (
          <TeamScore
            label="HOME"
            state={state}
            team="home"
            timestampMs={timestampMs}
          />
        )}
        <section className="scoreboard-center" aria-label="Game status">
          <small>{timerOnly ? "RINK TIMER" : "GAME CLOCK"}</small>
          <strong className="scoreboard-clock">
            {selectClockText(state, timestampMs)}
          </strong>
          {timerOnly ? (
            <div className="period-display">
              <small>PROGRAM</small>
              <strong>ICE</strong>
            </div>
          ) : (
            <div className="period-display">
              <small>PERIOD</small>
              <strong>{state.game.period}</strong>
            </div>
          )}
          <div
            className={`horn-indicator ${
              state.game.hornActive ? "is-active" : ""
            }`}
          >
            {state.game.hornActive ? "HORN ACTIVE" : "HORN READY"}
          </div>
        </section>
        {timerOnly ? null : (
          <TeamScore
            label="GUEST"
            state={state}
            team="guest"
            timestampMs={timestampMs}
          />
        )}
      </div>
    </section>
  );
}
