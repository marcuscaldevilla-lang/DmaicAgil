---
name: Process map persistence
description: Durable persistence and initialization rules for editable DMAIC process maps.
---

Store each process map as structured, versioned JSON inside the project's analysis artifacts. A project without a map receives an independent clone of the initial template; never share mutable template references between projects.

**Why:** The map must participate in the existing workspace revision, local-draft recovery, and conflict flow without adding a parallel database lifecycle or coupling projects together.

**How to apply:** Treat nodes, edges, and Y/X variables as project-owned workspace data. Normalize absent legacy values at the client boundary and save through the serialized workspace queue.