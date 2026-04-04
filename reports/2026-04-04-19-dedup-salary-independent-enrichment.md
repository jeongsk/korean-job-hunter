# EXP-105: Independent salary_min/salary_max Enrichment in Dedup

**Date:** 2026-04-04 19:04 KST
**Skill:** job-scraping
**Component:** scripts/dedup-jobs.js

## Hypothesis

The salary enrichment in dedup-jobs.js had a logical bug: it only triggered when BOTH `salary_min` AND `salary_max` were null (`!keeper.salary_min && !keeper.salary_max`). This meant partial salary data (e.g., salary_min=5000 but salary_max=null from a single-value posting like "연봉 5000만원 이상") would never be enriched from duplicates. Additionally, the `break` on first-hit meant split salary data across two duplicates was lost.

## Change

1. Changed condition from `!keeper.salary_min && !keeper.salary_max` to `keeper.salary_min == null || keeper.salary_max == null` — checks each field independently
2. Changed loop to iterate all duplicates, collecting each missing field separately, only breaking when both are found
3. Uses `== null` (not `!value`) to correctly handle `0` as a valid salary value

## Results

| Metric | Before | After |
|--------|--------|-------|
| salary enrichment | both-or-nothing | per-field independent |
| split duplicate support | broken (first break) | working (iterates all) |
| test count | 1248 | 1258 |
| regressions | — | 0 |

## Test Cases (10 new)

- Both null → enriched from duplicate ✅
- salary_min set, salary_max null → only salary_max enriched ✅
- salary_min null, salary_max set → only salary_min enriched ✅
- Both set → no enrichment ✅
- Split across two duplicates → both enriched ✅
- salary_min=0 (falsy) → salary_max still enriched ✅
- Multiple duplicates → fills from best source ✅
- Old bug reproduction: partial salary → no enrichment (confirms bug existed) ✅
- Old bug reproduction: split across dupes → break prevents second (confirms bug existed) ✅

## Impact

This was a real data loss bug. When the same job appeared on multiple sources, if the keeper entry had partial salary data (e.g., only salary_min from a "연봉 5000 이상" posting), the salary_max from a richer duplicate was silently discarded. Salary-based matching (10% weight) and NLP salary queries would return incomplete results for deduplicated jobs.
