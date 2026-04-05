# EXP-123: Extract Experience Range from Wanted API Detail Descriptions

**Date:** 2026-04-05 14:04 KST
**Skill:** job-scraping
**Focus:** api_experience_extraction_accuracy

## Hypothesis

The Wanted API scraper (primary method since 403 fix) always sets `experience` to bare "경력" or "신입가능" from the search API's `is_newbie` flag, even when the detail description contains specific year ranges like "6년 이상" or "3~5년". This makes the experience field uninformative for display and reduces career_stage derivation accuracy.

## Gap

| Field | Before | After (with details) |
|-------|--------|---------------------|
| experience | "경력" | "6년 이상" |
| career_stage | "mid" (default) | "mid" (derived from 6년) |

For a "10년 이상" job, career_stage now correctly becomes "senior" instead of the default "mid" from bare "경력".

## Change

- Added `extractExperienceRange()` function with 5 priority-ordered regex patterns:
  1. N년~M년 이상 (range with minimum)
  2. N~M년 or N-M년 (range)
  3. N년 이상 (minimum)
  4. N년차 (career year)
  5. 신입 in 자격요건 section (entry-level)
- Wired into detail fetching: when a range is extracted, updates `experience` field and re-derives `career_stage`
- Created test_api_experience_extraction.js with 19 test cases

## Results

| Metric | Before | After |
|--------|--------|-------|
| API experience specificity | bare "경력"/"신입가능" only | specific year ranges from JD |
| API career_stage accuracy | always "mid" for 경력 | correctly derived from year range |
| Total tests | 1437 | 1456 |
| Regressions | 0 | 0 |

## Real Data Verification

"프론트엔드" search → MGRV Product Engineer:
- Before: experience="경력", career_stage="mid"
- After: experience="6년 이상", career_stage="mid"

## Commit

`2f69135` — pushed to main
