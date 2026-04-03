# EXP-094: Dedup fieldScore and Enrichment for career_stage and reward

**Date:** 2026-04-04
**Skill:** job-scraping
**Metric:** dedup_field_completeness

## Hypothesis
`career_stage` was in enrichFields but not in fieldScore — entries with career_stage could lose the tiebreak to entries without it during dedup, then the career_stage would be enriched from the loser. But if both entries had career_stage with different values, the lower-scoring entry's career_stage was discarded even if it was more accurate. Also `reward` (referral bonus) was selected from DB but neither scored nor enriched — reward data was silently lost during dedup merge.

## Change
1. Added `career_stage` to fieldScore (+2, reflecting 15% match weight importance)
2. Added `reward` to fieldScore (+1)
3. Added `reward` to enrichFields array so it's copied from duplicates to keeper

## Baseline
- career_stage in fieldScore: no
- reward in fieldScore: no
- reward in enrichFields: no
- Total tests: 1033

## Results
- career_stage in fieldScore: yes (+2)
- reward in fieldScore: yes (+1)
- reward in enrichFields: yes
- Total tests: 1040
- Regressions: 0

## Delta
+7 tests, 2 fieldScore entries added, 1 enrichField added, 0 regressions

## Verdict
KEEP — career_stage and reward no longer silently lost during dedup. Same gap pattern as EXP-086 (employment_type), EXP-091 (career_stage DB column), EXP-092 (salary_min/max).
