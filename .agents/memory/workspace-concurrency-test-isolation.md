---
name: Workspace concurrency test isolation
description: Safe regression-testing rules for optimistic workspace revisions.
---

Concurrency regression tests must run against an injected in-memory workspace repository rather than a live database row or the application's active workspace key.

**Why:** A test that clears and restores a fixed workspace can erase a real save that occurs while the test is running, which is the exact data-loss risk the revision mechanism is meant to prevent.

**How to apply:** Keep the route's persistence dependency injectable; have production supply the Neon-backed repository and tests supply an isolated in-memory implementation. For a concurrent-save check, submit two writes for the same revision with `Promise.all` and assert one success and one 409.