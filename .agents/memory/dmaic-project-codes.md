---
name: DMAIC project codes
description: The durable rule for creating and reusing numeric DMAIC project identifiers.
---

DMAIC project codes are database-generated numeric identities. A client must omit the code when saving a new Problem Statement and must use the returned code for subsequent reads and updates.

**Why:** A fixed textual workspace key prevented the product from identifying independent projects and could not provide a stable, user-visible project code.

**How to apply:** Treat the generated code as server-owned. Never synthesize it in the browser or API; persist it with the local draft only after it is returned by Neon.