# EXP-132: Fix Mixed Korean/English Company Extraction & 주식회사 Stripping

**Date:** 2026-04-06 01:04 KST
**Skill:** job-scraping
**Metric:** company_extraction_accuracy

## Hypothesis

Company indicator regex `(주)\s*([가-힣]+...)` required Korean chars immediately after the indicator, causing mixed Korean/English company names like `(주)ABC소프트` to fail. Company name cleanup stripped `㈜` and `(주)` but not `주식회사` or `유한회사`.

## Changes

1. **kInd regex fix**: Changed `[가-힣]+(?:[가-힣·]*(?:[A-Za-z]+)?)` to `[A-Za-z가-힣]+(?:[A-Za-z가-힣·]*)` — allows mixed Korean/English chars after corporate indicators `(주)`, `㈜`, `주식회사`, `유한회사`.

2. **주식회사/유한회사 stripping**: Added `.replace(/^(주식회사|유한회사)\s*/, '')` to company name cleanup alongside existing `㈜` and `(주)` stripping.

## Results

| Metric | Before | After |
|--------|--------|-------|
| test_e2e_parsing.js | 6/7 (1 failed) | 7/7 ✅ |
| test_parsing_edge_cases.js | 15/18 (3 failed) | 18/18 ✅ |
| Total suite failures | 1 | 0 |
| Total tests | 1639 | 1649 |

### Fixed Cases
- `(주)ABC소프트경력 5년 이상` → company: `ABC소프트` (was `소프트`)
- `주식회사 카카오엔터테인먼트 프론트엔드 개발자` → company: `카카오엔터테인먼트` (was `주식회사 카카오엔터테인먼트`)

## Verdict: KEEP ✅

Zero regressions, 10 additional edge cases now passing.
