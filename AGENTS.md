# Project instructions

- Read `docs/product-requirements.md`, `docs/architecture.md`,
  `docs/console-behavior.md`, and `docs/fidelity-sources.md` before changing
  simulator behavior.
- Do not invent All Sport 4000 prompts, key sequences, limits, or defaults.
- Mark unsupported or product-defined behavior with its evidence confidence.
- Keep authoritative console, clock, hockey/rink, and training logic outside
  React.
- Use strict TypeScript and avoid `any`.
- Treat state as immutable and return fresh objects for state changes.
- Add or update tests before each behavior change. Maintain at least 80%
  statement, branch, function, and line coverage for simulator logic.
- Keep scenario definitions declarative and source-aware.
- Store no personally identifiable information.
- Preserve full keyboard operation, 44px touch targets, visible focus, phone
  usability, and offline operation.
- Do not add hardware, radio, serial, network-protocol, or scoreboard-output
  code.
- Run formatting, linting, type checking, coverage, the production build, and
  applicable Playwright tests before completion.
