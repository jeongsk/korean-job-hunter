# EXP-107: Deadline Quality-Aware Dedup Scoring and Enrichment

**Date:** 2026-04-04
**Skill:** job-scraping (dedup-jobs.js)
**Metric:** deadline field quality in dedup merge

## Hypothesis

Deadline field scoring in dedup fieldScore() gave +2 to any non-empty deadline, treating `상시모집` (rolling recruitment) identically to actual ISO dates like `2026-04-30`. This meant:
1. A duplicate with `상시모집` could win the keeper selection over an entry with a real deadline date
2. When enriching, 상시모집 would be copied as eagerly as an actual date
3. Deadline urgency scoring (EXP-035) and NLP deadline queries (마감임박, 오늘 마감) are non-functional against 상시모집 entries

## Change

1. **fieldScore**: ISO date deadlines (`2026-04-30`, `2026-04-30T23:59:59`) now score +3, other formats +2, 상시모집 +1
2. **Deadline enrichment**: Moved from generic enrichFields loop to dedicated logic that:
   - Enriches 상시모집 keepers with actual ISO dates from duplicates
   - Falls back to 상시모집 only when keeper has no deadline at all
   - Never overwrites an existing ISO date
3. Removed `deadline` from generic `enrichFields` array to prevent 상시모집 from being set before date-preferring logic

## Results

| Metric | Before | After |
|--------|--------|-------|
| fieldScore (ISO date) | +2 | +3 |
| fieldScore (상시모집) | +2 | +1 |
| Enrichment preference | first-hit (any) | ISO dates > 상시모집 |
| New tests | 0 | 13 |
| Total tests | 1258 | 1271 |
| Regressions | 0 | 0 |

## Impact

Real deadline dates now properly prioritized in keeper selection. A Wanted entry with 상시모집 won't suppress a JobKorea entry with an actual deadline when the entries are otherwise similar. Deadline urgency scoring and NLP queries will work more reliably against deduplicated data.
