# Testing strategy

## Unit

Vitest verifies the deterministic clock, immutable reducer, numeric-entry
workflow, edge/error behavior, selectors, scenario evaluation, and IndexedDB
repository. V8 coverage thresholds are 80% for statements, branches, functions,
and lines.

## Integration

React Testing Library verifies that accessible controls route through the pure
engine to the scoreboard and that correction/reset workflows remain usable.

## End to end

Playwright runs against the production build on Chromium, Firefox, WebKit, a
Pixel 7 viewport, and an iPad Mini viewport. Critical checks cover score entry,
numeric correction, manifest/service-worker availability, and phone overflow.

## Required completion gate

1. Formatting check
2. ESLint
3. Strict TypeScript
4. Unit/integration tests with coverage
5. Production build
6. Playwright critical flows
7. Dependency and security review
