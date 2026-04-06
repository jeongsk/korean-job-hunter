# EXP-144: Korean 리드/리더 Career Stage Detection

**Date:** 2026-04-06
**Skill:** job-scraping + job-matching
**Metric:** career_stage accuracy

## Problem

`deriveCareerStageFromTitle()` in `scripts/skill-inference.js` only detected English "Lead"/"Staff"/"Principal" but not Korean "리드"/"리더". Korean job titles with lead seniority like:

- 프론트엔드 개발 리드 (React Native) — actual Wanted API result
- 개발 팀 리더
- 리드 엔지니어

All returned `career_stage: "mid"` (fallback from generic `경력` experience value) instead of `"lead"`.

This affected:
- **15% career_stage matching weight** — lead positions scored identically to mid-level
- **NLP queries** — "리드 포지션" couldn't find Korean-titled lead jobs
- **Live API scraping** — 12 Wanted 프론트엔드 results, one "프론트엔드 개발 리드" was misclassified

## Change

Added Korean 리드/리더 pattern to `deriveCareerStageFromTitle()`:
```js
if (/(?:^|[\s(\[/,]|개발\s)(?:리드|리더)(?:$|[\s)\]/,]|자|개발|매니저|엔지니어)/.test(title)) return 'lead';
```

Word boundary required on both sides to prevent false positive: "칠리드레스" contains "리드" substring but should not match.

## Results

- **10 new test cases** (8 positive + 2 negative)
- **All existing tests pass** — 0 regressions
- Live API: "프론트엔드 개발 리드 (React Native)" → career_stage: "lead" (was "mid")

## Files Changed

- `scripts/skill-inference.js` — added 리드/리더 pattern
- `scripts/test_career_stage_title.js` — 10 new test cases
- `agents/scraper-agent.md` — updated career_stage documentation
