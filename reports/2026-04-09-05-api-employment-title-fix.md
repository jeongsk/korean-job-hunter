# EXP-170: API Employment Type Normalization + Title Company Bracket Strip

**Date:** 2026-04-09
**Skill:** job-scraping
**Metric:** employment_type accuracy + title cleanliness

## Hypothesis

Wanted API returns `employment_type` as an object `{name: "정규직"}` rather than a normalized string. The parsePosition function compared it directly against `'full_time'` (a string comparison that always failed), so employment_type was stored as the raw object instead of `regular`. This broke the matching algorithm's employment type penalty (contract -10, intern -15) and NLP employment type queries (정규직 공고, 계약직 빼고).

Additionally, Wanted API `position` field includes company name in brackets: `[카카오] 시니어 프론트엔드 개발자`. This company prefix polluted the title field, affecting skill inference (inferSkills saw `[카카오]` as noise), title-based career stage detection, and display quality.

## Changes

1. **Employment type normalization**: Added proper extraction from API object `{name}` with Korean keyword matching (정규직→regular, 계약직/파견→contract, 인턴→intern, 프리랜서→freelance) and string normalization (full_time→regular).

2. **Title bracket cleanup**: Added regex `^\[[^\]]*\]\s*` to strip company bracket prefix from API titles.

## Results

| Metric | Before | After |
|--------|--------|-------|
| employment_type from `{name:"정규직"}` | `{name:"정규직"}` (raw object) | `regular` |
| employment_type from `full_time` | `full_time` (no match) | `regular` |
| Title `[카카오] 시니어 개발자` | `[카카오] 시니어 개발자` | `시니어 개발자` |
| New test cases | — | 12 |
| Total tests | 289 | 301 |
| Regressions | — | 0 |

## Impact

- Employment type matching penalties and NLP queries now functional for API-scraped jobs
- Title-based skill inference cleaner (no `[회사명]` noise)
- Career stage detection from title more accurate
