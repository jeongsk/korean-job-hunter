# EXP-139: Title-Based Career Stage Override for Wanted API

**Date:** 2026-04-06 09:04 KST
**Skill:** job-scraping + job-matching
**Metric:** career_stage_accuracy

## Hypothesis

Wanted API returns `"경력"` for almost all non-newbie jobs regardless of seniority. Titles like "시니어 프론트엔드 개발자" and "Frontend Engineer Lead" got `career_stage: mid` because `deriveCareerStage("경력")` returns `"mid"` (EXP-121 bare 경력 default). The 15% career_stage matching weight couldn't distinguish senior from mid-level positions for API-sourced jobs.

Live data confirmed:
- `[미리캔버스] 시니어 프론트엔드 개발자` → `mid` (should be `senior`)
- `시니어 프론트엔드 개발` → `mid` (should be `senior`)
- `Frontend Engineer Lead` → `mid` (should be `lead`)

## Change

Added `deriveCareerStageFromTitle()` to shared `skill-inference.js` module. Detects seniority from:
- **Korean:** 시니어 → senior, 주니어/신입 → junior
- **English:** Senior/Sr. → senior, Lead/Staff/Principal/Tech Lead/Team Lead → lead, Junior/Jr./Associate/Entry-Level → junior

Updated `scrape-wanted-api.js` `parsePosition()`:
```js
// Before:
const careerStage = deriveCareerStage(experience);

// After:
const careerStage = deriveCareerStageFromTitle(title) || deriveCareerStage(experience);
```

Title-based detection takes precedence; falls back to experience-based when no seniority indicator in title.

## Results

| Metric | Before | After |
|--------|--------|-------|
| 시니어 프론트엔드 개발자 | mid | senior ✅ |
| Frontend Engineer Lead | mid | lead ✅ |
| 프론트엔드 개발자 (no indicator) | mid | mid (fallback) ✅ |
| Test suite | 72/72 | 73/73 ✅ |
| Regressions | — | 0 |

28 new test cases covering Korean titles, English titles, no-indicator fallback, false positive prevention (Leading ≠ lead), and combined title+experience logic.

## Impact

Career stage directly affects the 15% matching weight. Previously, a senior developer searching for senior positions would see senior and mid-level jobs scored identically on this component. Now the 15% weight properly differentiates career levels for the majority of Wanted API-sourced jobs (which use 시니어/Lead in titles).
