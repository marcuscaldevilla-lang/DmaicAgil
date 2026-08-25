---
name: Versioned workspace saves
description: Concurrency rules for versioned DMAIC workspace snapshots.
---

Queued saves for the same active workspace must read the revision and project code when each queued request starts, not when it is first enqueued. A switch to another project must instead isolate the old queued operation and prevent its response from updating the newly active workspace.

**Why:** Capturing a revision for several quick saves causes the later request to send a stale revision and receive a false conflict. Reading the newly active project at execution without an isolation token can send an old snapshot to the wrong project.

**How to apply:** Keep saves serialized. Associate each enqueued save with the current workspace session; within that unchanged session, use the latest successful revision and project code for the next request. After a session change, do not let stale callbacks mutate the active UI.