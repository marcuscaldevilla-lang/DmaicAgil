---
name: Paired measurement analysis
description: Statistical design and persistence boundary for multivariable CSV analysis in the Measurement phase.
---

The Measurement CSV is independent from the Definition CSV. Its first column is the shared X axis and each later numeric column is a variable observed on that same row, so comparisons must preserve row pairing.

Use repeated-measures ANOVA with a Greenhouse–Geisser correction for the global comparison, followed by paired t-tests with Holm adjustment for all pairwise comparisons. Do not substitute an independent-groups equal-variance ANOVA merely because variable dispersions differ.

**Why:** A row can represent one shared month while columns represent factory units. Treating columns as independent discards the shared-month structure; assuming equal independent variances is especially misleading when one unit is substantially more variable.

**How to apply:** Keep Definition and Measurement datasets distinct in persistence and recovery. Validate every non-X cell as numeric, calculate locally from the paired rows, and label prioritization as an investigation aid rather than causal proof.