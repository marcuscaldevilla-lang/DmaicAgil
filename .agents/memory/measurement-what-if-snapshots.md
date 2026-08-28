---
name: Measurement What If snapshots
description: Safety and auditability rules for AI scenario analysis after Measurement prioritization.
---

Persist every Measurement What If question and answer with the exact summarized statistical context used for generation. Send only descriptive statistics, ANOVA, pairwise results, priorities, and relevant Charter goal context; never send raw CSV rows.

**Why:** A saved answer must remain reviewable even if the Measurement dataset or Charter later changes, while minimizing data exposure and preventing the model from becoming the source of statistical evidence.

**How to apply:** Treat AI output as a labeled scenario estimate. Require explicit formulas, assumptions, missing-data notices, limits, and team validation. Never let generation mutate saved targets, priorities, Charter fields, or Measurement data automatically.