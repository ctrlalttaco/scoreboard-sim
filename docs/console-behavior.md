# Console behavior contract

## Verified configuration

- On power-up, the official change-code sequence is to decline resume with
  CLEAR, enter the desired All Sport code, and press ENTER.
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

- The app recreates the resume-game prompt at initial load and whenever
  `Restart controller` is selected.
- Entering code 63 continues to a trainer configuration prompt for SOG code 196
  or 197 so one simulation can represent the primary and auxiliary controllers.
  Codes 196 and 197 are also accepted directly as configuration shortcuts.
- During reconstructed code entry, CLEAR removes the last digit. After an
  invalid code it clears the error and removes the last digit for correction;
  on an empty SOG prompt it returns to the primary game-code prompt.
- Startup keypad actions are excluded from drill/session scoring. Startup
  controls teach configuration setup; current scenarios begin after a
  configuration is confirmed.
- The youth-hockey preset is intentionally available only through the header
  shortcut because it is not a distinct verified game code.
- Exact LCD text is reconstructed and labeled in the interface.
- Period SOG resets when PERIOD +1 is used in code 197 mode.
- The 15-minute youth profile is a convenience preset, not a universal rule.
- The code 96 ice-session profile enables clock/horn operation while team keys
  are disabled.
- Automatic horn expiry records a momentary signal and never leaves the horn
  latched.
- Horn activation plays a locally synthesized, layered arena-horn sound. Manual
  horn audio follows the press-and-hold control; automatic horn audio uses a
  fixed 1.35-second burst. Operators can mute horn audio from the header.
