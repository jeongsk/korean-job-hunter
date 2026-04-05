# EXP-137: Search-Time Work Type Detection from Title

**Date:** 2026-04-06 07:04 KST
**Skill:** job-scraping
**Metric:** work_type_field_population

## Hypothesis

`work_type` was hardcoded to `null` in `parsePosition()` for API-sourced jobs. The `detectWorkType()` function existed in scrape-wanted-api.js but was only called during detail enrichment (requires `--details` flag, which makes N extra HTTP requests). Jobs with 재택/원격/리모트/하이브리드 in their title had `null` work_type, making the 10% work_type matching weight always neutral for API-sourced jobs without detail fetch.

## Change

Changed `parsePosition()` in scripts/scrape-wanted-api.js from:
```js
work_type: null,      // enriched via detail page
```
to:
```js
work_type: detectWorkType(title),  // detect from title; enriched via detail page
```

The existing `detectWorkType()` already handles Korean (재택, 원격근무, 하이브리드) and English (remote, hybrid) patterns. Detail enrichment still overrides with a more accurate detection from full JD description text.

## Results

| Metric | Before | After |
|--------|--------|-------|
| work_type at search time | `null` (always) | Detected from title |
| "[재택근무] 프론트엔드" | `null` | `remote` ✅ |
| "React Developer - Remote" | `null` | `remote` ✅ |
| "백엔드 (하이브리드)" | `null` | `hybrid` ✅ |
| "프론트엔드 개발자" | `null` | `onsite` ✅ |
| New test cases | 0 | 14 |
| Regressions | 0 | 0 |

## Why This Matters

~10-15% of Korean job postings include work arrangement keywords in the title (재택, 원격, 하이브리드). Previously these all scored `null` on the 10% location/work_type matching component, making remote-friendly and hybrid jobs indistinguishable from fully-onsite positions. A candidate preferring remote work would see no preference bonus for "재택 프론트엔드" jobs at search time.

## Verdict: KEEP ✅

14 new tests, 0 regressions.
