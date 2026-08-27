---
name: Legacy schema migration must be mirrored client- and server-side
description: When a persisted JSON field's shape changes (e.g. object-of-arrays to array-of-rows), normalize old rows on both the client AND the server, not just the client.
---

In DMAIC Ágil Suite (and similarly-shaped apps), the API server validates its GET/PUT workspace responses with a strict generated zod schema (`GetDmaicWorkspaceResponse.safeParse(...)`) before ever reaching the browser, and returns HTTP 500 if the persisted JSON blob (from Neon) doesn't match the current schema.

When migrating a field's on-disk shape (example: SIPOC went from `{ suppliers: string[], inputs: string[], ... }` to `DmaicSipocRow[]`), adding a client-side legacy-normalizer (e.g. `normalizeSipocSnapshot` in App.tsx) is not sufficient on its own. Old rows already saved in Neon get read server-side first, validated against the new strict schema, and fail with a 500 *before* the client-side normalizer ever runs — breaking the whole app on load for any workspace with old-format data.

**Why:** The server's `normalizeAnalysisArtifacts`/`normalizePersistedPipeline` functions (in `artifacts/api-server/src/routes/dmaic.ts`) already had a precedent for this — legacy VOC/CTQ objects are normalized there before the strict-schema `safeParse`. Any new field-shape migration must follow the same precedent or the safeParse call becomes a landmine for every previously-saved row.

**How to apply:** Whenever changing the JSON shape of a field inside `analysisArtifacts`/`pipeline` that already has persisted rows, write matching legacy-detection + normalization logic in *both* places: the client normalizer (used for local drafts / freshly-fetched data before rendering) and the server's `normalizePersistedPipeline`/`normalizeAnalysisArtifacts` (used before the strict zod `safeParse` that gates the GET/PUT response). Test by curling the live `/api/dmaic/workspace` endpoint against real old-format data, not just by looking at the UI.
