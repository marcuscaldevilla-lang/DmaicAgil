---
name: CSV input integrity
description: Rules for reliably importing CSV data into Sprint 1 analyses.
---

Analyses must not silently proceed when imported source data is malformed, ambiguous, or no longer matches the active indicator and selected calendar-month window.

**Why:** Incorrectly interpreted input or a stale visual can make downstream statistics appear valid while using the wrong data.

**How to apply:** Treat “last N months” as complete calendar months, surface a clear import failure or incompatibility state, and prevent prior results from being mistaken for the current selection whenever the source cannot be interpreted safely.