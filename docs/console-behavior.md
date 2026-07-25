# Console behavior contract

## Verified configuration

- Hockey codes 62 and 63 use sport insert LL-2274.
- Code 62 omits shots-on-goal output; code 63 supports the SOG option.
- Auxiliary code 196 represents game SOG and code 197 period SOG.
- Multi-purpose timer code 96 provides a four-digit timer.

## Verified hockey keys

- `SCORE` edits a team score; `SCORE +1` increments immediately.
- `PLAYER PENALTY` exposes six memory slots. ENTER opens a slot, then player
  number and penalty time are entered and confirmed. New penalties default to
  2:00.
- Arrow keys select penalty slots and CLEAR removes the selected penalty.
- ENABLE/DISABLE PENALTY CLOCKS controls whether penalty clocks run with the
  game clock.
- `TIMEOUTS LEFT` and `PERIOD` edit numeric values; `PERIOD +1` increments.

## Trainer policies

- Exact LCD text is reconstructed and labeled in the interface.
- Period SOG resets when PERIOD +1 is used in code 197 mode.
- The 15-minute youth profile is a convenience preset, not a universal rule.
- The code 96 ice-session profile enables clock/horn operation while team keys
  are disabled.
- Automatic horn expiry records a momentary signal and never leaves the horn
  latched.
