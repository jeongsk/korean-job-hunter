# EXP-033: Fix (주) Company Prefix Extraction

**Date:** 2026-03-31
**Skill:** job-scraping
**Metric:** field_extraction_accuracy (company)

## Hypothesis
Adding `(주)` to Korean company indicators and properly escaping regex special chars will fix company extraction for companies registered as `(주)COMPANY` format (e.g., `(주)ABC소프트`).

## Problem
The E2E test case `"백엔드 개발자(Java/Spring)(주)ABC소프트경력 5년 이상..."` failed — company was extracted as "회사명 미상" instead of "ABC소프트". The `(주)` prefix pattern wasn't handled because:
1. `(주)` wasn't in the Korean company indicators list
2. The regex for indicators didn't escape parentheses (special regex chars)

## Changes
- **test_e2e_parsing.js**: Added `(주)` to `koreanIndicators`, fixed regex to escape special chars with proper character class `[가-힣A-Za-z0-9]+`
- **skills/job-scraping/SKILL.md**: Added `(주)` to `kInd`, added `.replace(/^\(주\)\s*/,'')` to company name cleanup, added `(주)` to exclusion check
- **agents/scraper-agent.md**: Updated company extraction docs to include `㈜` and note `(주)` stripping

## Results
| Metric | Before | After |
|--------|--------|-------|
| E2E tests | 6/7 | 7/7 |
| Company extraction (parenthesized prefix) | ❌ 회사명 미상 | ✅ ABC소프트 |
| All other tests | PASS | PASS (no regressions) |

## Verdict: KEEP
Full fix, no regressions. Pushed to main.
