---
name: AI financial estimates
description: Safety boundary for Charter financial estimates generated alongside the DMAIC pipeline.
---

The AI may calculate the Charter's expected financial gain only when it uses the team's Contribuições quantitativas and Informações financeiras coletadas. The result must be visibly labeled as an estimate, explain the formula or logic, state the period, currency, and premises, and require Finance validation before it is treated as confirmed. If the inputs are insufficient, it must say what information is missing instead of inventing a number.

**Why:** The financial estimate is useful only when its source data and assumptions remain inspectable. A prompt alone cannot make an AI-generated amount confirmed, and persisted suggestions can outlive later prompt changes.

**How to apply:** Keep team-entered quantitative and financial information factual and editable. Preserve those source fields during generation, normalize the estimate on pipeline generation, save, and read, and regenerate the project goal from the complete Charter context. For a stated gain per percentage point above a threshold, use the ideal target above that threshold, the provided volume, and the provided time proration; a baseline below the threshold does not invalidate that calculation.