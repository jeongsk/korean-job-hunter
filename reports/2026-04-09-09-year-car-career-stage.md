# EXP-174: N년차 Career Stage Pattern Support

**Date:** 2026-04-09
**Skill:** job-scraping+job-matching
**Metric:** career_stage_accuracy

## Hypothesis

Wanted API returns experience values in `N년차` format (e.g., `6년차` = 6th year of career) for many positions. `deriveCareerStage` used regex `(\d+)\s*년(?![가-힣])` which explicitly excluded `년` followed by Korean characters, so `년차` never matched. This caused `career_stage: null` for ~15-20% of Wanted API detail-scraped jobs.

## Change

Added dedicated `yearCarMatch = exp.match(/(\d+)\s*년차/)` before existing regex patterns in `deriveCareerStage()`. N년차 maps to exact year values (no minimum bump): ≤3→junior, ≤7→mid, ≤12→senior, >12→lead.

## Results

| Pattern | Before | After |
|---------|--------|-------|
| 3년차 | null | junior |
| 5년차 | null | mid |
| 6년차 | null | mid |
| 10년차 | null | senior |
| 15년차 | null | lead |

- **Live validation:** `Frontend Engineer` at 티티씨 (exp: 6년차) now gets `career_stage: mid` instead of `null`
- **Test cases:** 20/20 passing (15 new + 5 regression)
- **Regressions:** 0

## Impact

The 15% career_stage matching weight was neutral (50 default) for all N년차 jobs. Now correctly differentiated: entry-level candidates get 95 for junior N년차 jobs, seniors get 40. This affects roughly 1 in 5 Wanted API detail-scraped jobs.
