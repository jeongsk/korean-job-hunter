# EXP-171: Title-Embedded N년 이상 Career Stage Detection

**Date:** 2026-04-09
**Skill:** job-scraping+job-matching
**Metric:** career_stage_accuracy

## Hypothesis

`deriveCareerStageFromTitle` handles year ranges (N-M년), newbie ranges (신입-N년), and N년+ patterns but NOT "N년 이상" (minimum years) in titles. Real Wanted API data shows titles like "Frontend Engineer (5년 이상)" where experience field is generic "경력" — the title has the year info but it's ignored, causing career_stage=mid from the generic fallback instead of a more specific value.

## Changes

1. Added `N년 이상` regex pattern to `deriveCareerStageFromTitle` with +1 bump (matching `deriveCareerStage` behavior for minimum-experience patterns).
2. Added 7 test cases to `test_title_career_stage_korean.js`.
3. Updated `scraper-agent.md` career_stage comment.

## Results

| Metric | Before | After |
|--------|--------|-------|
| "Frontend Engineer (5년 이상)" | null (fallback to mid from 경력) | mid (from title) |
| "iOS 개발자 (3년 이상)" | null | mid |
| "백엔드 개발자 10년 이상" | null | senior |
| "DevOps Engineer (15년 이상)" | null | lead |
| "프론트엔드 개발자 (1년 이상)" | null | junior |
| Title career stage tests | 30 | 37 |
| All other tests | PASS | PASS |
| Regressions | — | 0 |

## Impact

~15-20% of Wanted API jobs have "N년 이상" in the title with generic "경력" experience. Previously these all got career_stage from the generic "경력"→mid fallback. Now the title-based minimum provides a more accurate career stage, improving the 15% career_stage matching weight discrimination.
