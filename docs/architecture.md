# Architecture

## Runtime

The product is a single Next-compatible React application built with vinext for
the Sites runtime. It has no backend, account system, D1 database, or network
dependency for simulation.

## State pipeline

```text
Semantic console key
  -> pure simulator reducer
  -> exclusive power-on/resume and game-code state
  -> optional pending numeric operation
  -> immutable hockey/rink and clock update
  -> semantic session event
  -> scenario evaluator
  -> React selectors and views
```

`src/simulator/` contains the authoritative state. React components render that
state and dispatch semantic events only.

Power-on setup is isolated from normal numeric-entry workflows. While it is
active, only the keypad controls needed by the current startup step are
accepted; game, team, clock, penalty, and horn actions are locked.
Startup key entry is intentionally outside training session history; current
drills evaluate configured game operation, not controller boot procedures.

## Clock

The running snapshot stores a remaining value and a reference timestamp. The
display derives `remaining - elapsed` and clamps at zero. Display intervals
invalidate the view; they do not subtract authoritative time or enter session
history.

## Training

Scenarios are typed, declarative, Zod-validated definitions containing initial
state, expected semantic actions, final-state conditions, hints, and source
references. Evaluation compares the action sequence and state independently.

## Persistence and offline

IndexedDB stores a versioned list of completed scenario IDs plus elapsed time
and mistake counts for completed assessments. The service worker uses a
versioned cache for the app shell and same-origin runtime assets. Corrupt or
unknown progress records fall back to an empty profile.
