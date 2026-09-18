---
name: OpenAPI Zod codegen
description: Compatibility constraint for the workspace's OpenAPI-to-Zod generation.
---

Use `type: number` with numeric bounds for OpenAPI fields when this workspace's generated Zod client needs a positive whole-number-like value; avoid `type: integer`.

**Why:** The current Orval/Zod combination generates `zod.int()` for OpenAPI integer fields, but the installed Zod version does not provide that API, causing the shared-library typecheck to fail immediately after code generation.

**How to apply:** When adding a count or similar contract field, validate positivity/range in the schema and server boundary as needed, then run the API code generator and shared-library typecheck before relying on generated clients.