# EXP-180: Culture Inference from Job Metadata

**Date:** 2026-04-10
**Skill:** job-scraping + job-matching
**Metric:** culture_weight_activation

## Hypothesis

API-scraped jobs have no JD description, so `extractCultureKeywords()` always returns `[]`. The 15% culture matching weight scores neutral (50) for all API-sourced jobs, providing zero discrimination. Inferring culture from available metadata (title, company name, work_type, experience) activates the culture weight without requiring detail API calls.

## Changes

1. Added `inferCultureFromMetadata(title, company, meta)` to `scrape-wanted-api.js`
2. Integrated into `parsePosition()` — `culture_keywords` now populated for API-scraped jobs
3. 5 inference categories from metadata:
   - **Startup indicators** (스타트업, startup, 벤처, 랩스, Labs) → fast_paced + innovative + autonomous
   - **Remote work_type** → work_life_balance + autonomous
   - **Hybrid work_type** → work_life_balance
   - **Large company** (카카오, 네이버, 삼성, 쿠팡, etc.) → structured + collaborative
   - **Seniority** (시니어/Senior/리드/Lead) → autonomous; (신입/주니어/Junior) → learning_focused
4. 26 new test cases in `test_culture_metadata_inference.js`

Also fixed 2 stale test expectations from EXP-179:
- `test_calendar_year_false_positive.js`: 신입-5년 expected mid → junior
- `test_title_career_stage_korean.js`: 신입-5년 expected mid → junior

## Results

| Metric | Before | After |
|--------|--------|-------|
| API jobs with culture_keywords | 0% (0/12) | ~40% (5/12 live test) |
| Culture test cases | 0 | 26 |
| Total tests | 349 (2 failing) | 350 (0 failing) |
| Regressions | — | 0 |

Live validation (프론트엔드 keyword, 12 jobs):
- 프론트엔드 리드 @ 윤회: `["autonomous"]`
- 카카오뱅크: `["structured","collaborative"]`
- 주니어 @ 페칭: `["learning_focused"]`

## Impact

The 15% culture weight now provides non-trivial discrimination for ~40% of API-scraped jobs. Previously all API jobs scored exactly 50 on culture, making this weight component meaningless for the majority of scraped data. Combined inferences (e.g., startup + remote + senior) produce richer culture profiles.
