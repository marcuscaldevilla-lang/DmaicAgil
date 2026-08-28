---
name: Paired measurement analysis
description: Statistical design and persistence boundary for multivariable CSV analysis in the Measurement phase.
---

The Measurement CSV is independent from the Definition CSV. Its first column is the shared X axis and each later numeric column is a variable observed on that same row, so comparisons must preserve row pairing.

Interpret the wide Measurement CSV through a transient long representation: `Valor` is the numeric measure, `Unidade` is the grouping factor derived from each numeric column name, and the first column identifies the paired observation. Persist the original wide CSV, not the derived rows.

Use repeated-measures ANOVA with a Greenhouse–Geisser correction for the global comparison, followed by paired t-tests with Holm adjustment for all pairwise comparisons. Do not substitute an independent-groups equal-variance ANOVA merely because variable dispersions differ.

Calculate Shapiro–Wilk with the Royston/AS R94 weight correction and p-value transformation used by R, SciPy, and jamovi. A correlation against expected normal quantiles is Shapiro–Francia-like and must not be labeled Shapiro–Wilk.

**Why:** A row can represent one shared month while columns represent factory units. Treating columns as independent discards the shared-month structure; assuming equal independent variances is especially misleading when one unit is substantially more variable. The long view matches Jamovi's `Valor`/`Unidade` parameterization without forcing users to reshape their input. Approximate normal-quantile weights produced materially different p-values from jamovi on the same observations.

**How to apply:** Keep Definition and Measurement datasets distinct in persistence and recovery. Validate every non-X cell as numeric, calculate locally from the paired rows, and label prioritization as an investigation aid rather than causal proof. Reuse the shared Shapiro–Wilk implementation in every analysis surface.