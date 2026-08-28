---
name: Ishikawa persistence
description: Durable rules for AI-generated, operator-editable cause-and-effect diagrams.
---

Persist both the team's free-form source text and the structured 6M matrix with the project. Treat AI output only as the initial organization of hypotheses; every category and cause remains editable and explicitly saved by the operator.

**Why:** The diagram belongs to the project's evolving analysis, so regeneration or loading another project must not overwrite reviewed team knowledge.

**How to apply:** Keep generation separate from saving, normalize legacy project payloads on read, and restore the source text and matrix together when switching or reloading projects.