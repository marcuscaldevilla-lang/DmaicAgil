---
name: DMAIC Ágil Suite deliverable editing pattern
description: When/how to let the team edit a Gemini-generated DMAIC deliverable in place, vs building a separate manual-entries array like VOC/CTQ.
---

The DMAIC Ágil Suite's pipeline response (`DmaicPipeline`) holds several AI-generated deliverables (charter, vocCtq, sipoc, msaValidation, vitalXs, gutPrioritization, actionPlan, controlPlan, indicatorsY). Two different editing patterns coexist:

1. **VOC/CTQ** uses a separate `manualVocCtq` array (independent of `pipeline.vocCtq`), because VOC/CTQ is conceptually a list of independently addable rows that must exist and be saveable even before any pipeline has been generated (a consultant can start entering VOC rows manually pre-pipeline). This needed its own field in `DmaicAnalysisArtifacts`, its own dirty/saved state, and its own `saveWorkspace('voc')` handling.

2. **SIPOC** (and, by extension, any future single-structured-object deliverable that only makes sense once a pipeline exists) is edited by mutating `pipelineData` directly (`setPipelineData(prev => prev ? { ...prev, sipoc: next } : prev)`) and reusing the existing generic `saveWorkspace(source)` flow — no new `DmaicAnalysisArtifacts` field was needed, since `createAnalysisArtifacts()` already includes `pipeline: pipelineData`. Editing is disabled (read-only example shown instead) until a pipeline exists, avoiding edits that would be silently discarded.

**Why:** Building a parallel manual-array system (like VOC's) is only justified when the deliverable must be editable/persistable *before* pipeline generation. Otherwise it's unnecessary duplication — the pipeline object is already the single source of truth and already flows through save/load/local-draft-recovery.

**How to apply:** For a new AI-generated deliverable that's a single object (not a pre-pipeline-editable row list), prefer pattern 2: edit `pipelineData` in place, add a `<name>Dirty`/`<name>Saved` pair of booleans, a new `WorkspaceSaveSource` literal, and a branch in `saveWorkspace`'s `onSuccess`. Only reach for VOC's separate-array pattern if the deliverable genuinely needs to exist without a pipeline.
