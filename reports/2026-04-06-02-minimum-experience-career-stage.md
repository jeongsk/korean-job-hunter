# EXP-134: Minimum-Experience Career Stage Correction

**Date:** 2026-04-06
**Skill:** job-scraping + job-matching
**Metric:** career_stage_accuracy

## Hypothesis

For "N년 이상" (minimum experience) patterns, `deriveCareerStage` used the minimum year value directly to determine career stage. This meant "3년 이상" (3+ years) → years=3 → `junior`, even though jobs requiring 3+ years target mid-level developers. The career stage feeds into the 15% career_stage matching weight and NLP queries like "시니어 공고", so incorrect staging directly impacts matching quality.

## Change

Added `isMinimum` flag for "N년 이상" and "N년↑" patterns. When `isMinimum=true`, the reference year is bumped by +1 before threshold comparison:
- `"3년 이상"`: 3+1=4 → `mid` (was `junior`)
- `"6년 이상"`: 6+1=7 → `mid` (unchanged, boundary)
- `"10년 이상"`: 10+1=11 → `senior` (unchanged)

Range patterns ("3~7년") and bare patterns ("6년") are unaffected — they use the upper bound and exact value respectively.

## Test Results

- All 1665+ tests passing
- 2 test assertions updated (test_career_stage_pipeline.js, test_api_experience_extraction.js)
- 0 regressions

## Impact

Jobs with "3년 이상" experience requirements (estimated ~30% of Korean postings) now correctly map to `mid` career stage instead of `junior`. This improves:
- **15% career_stage matching weight**: A mid-level candidate (5 years) now gets gap=0 (95 pts) vs gap=1 (75 pts) against "3년 이상" jobs — +20 point improvement
- **NLP queries**: "시니어 공고" and "미드 공고" return more accurate results
- **Pipeline consistency**: deriveCareerStage now used by all 3 post-processors with the same correction
