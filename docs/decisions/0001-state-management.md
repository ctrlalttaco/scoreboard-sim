# ADR 0001: Pure reducer state management

Status: accepted.

Use a typed pure reducer and domain selectors. Do not add a global state
library until workflow complexity proves the need. This keeps console behavior
testable without React and makes identical inputs deterministic.
