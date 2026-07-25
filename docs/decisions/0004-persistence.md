# ADR 0004: Native IndexedDB persistence

Status: accepted.

Use a tiny native IndexedDB repository because version 1 persists one local
progress record. The record includes a schema version, copies arrays at the
boundary, and falls back safely for unknown or corrupt data.
