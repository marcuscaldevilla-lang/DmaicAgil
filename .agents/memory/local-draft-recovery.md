---
name: Local draft recovery
description: Rules for preserving typed DMAIC workspace content across reloads without overwriting a newer shared version.
---

Keep a versioned local browser draft for in-progress Problem Statement and Project Charter edits. When the persisted Neon workspace is newer than the draft’s base revision, present an explicit choice rather than merging or overwriting either version automatically.

**Why:** a reload or a second open tab must not cause typed content to disappear, while a stale browser copy must not silently erase a confirmed Neon revision.

**How to apply:** preserve the local draft on every edit, update its base revision after a successful Neon save, and require a user decision whenever the remote revision advances beyond that base revision.