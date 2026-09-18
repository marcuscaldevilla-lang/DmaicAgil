---
name: Process map persistence
description: Durable persistence and initialization rules for editable DMAIC process maps.
---

Store each process map as structured, versioned JSON inside the project's analysis artifacts. Its initial version is generated from the Define-phase SIPOC and textual VOC/CTQ inputs: Process becomes steps, Inputs become reference Xs, and Outputs become reference Ys/products in process. After generation, the map is operator-owned and must not be overwritten by later automatic refreshes.

**Why:** The first map must reflect the project's actual Define work instead of a fixed example, while still participating in the existing workspace revision, local-draft recovery, and conflict flow.

**How to apply:** Seed from SIPOC/VOC only when the project has no process map yet. Treat the resulting nodes, edges, and Y/X variables as project-owned data, normalize absent legacy values at the client boundary, and save through the serialized workspace queue.