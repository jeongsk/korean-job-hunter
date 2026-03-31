# EXP-038: CamelCase English Company + Title-Suffix Stripping

**Date:** 2026-03-31
**Skill:** job-scraping
**Metric:** company extraction accuracy
**Verdict:** ✅ KEEP

## Hypothesis

Adding camelCase boundary splitting for English company names and Korean title-suffix stripping in backward-walk company extraction fixes two remaining test failures.

## Problems

1. **Pure English companies glued to titles**: "React DeveloperVingle경력..." — "Vingle" is a company name but has no Korean characters and no space separator. The backward-walk and token-based approaches both missed it because they only look for Korean characters.

2. **Title suffixes absorbed into company**: "프론트엔드 개발자카카오경력..." — the backward-walk extracts "개발자카카오" and cuts "개발자" from the title text, producing title "프론트엔드" instead of "프론트엔드 개발자".

## Changes

1. **test_exp033.js**: Added title-suffix stripping regex (`개발자|엔지니어|매니저|...`) from front of backward-walk candidate. Preserves stripped suffix in title by adjusting the cut offset.

2. **test_company_fallback.js**: Added camelCase boundary detection on last English token — `([a-z])([A-Z][a-z]+)$` splits "DeveloperVingle" into company "Vingle".

3. **SKILL.md v3.5**: Added camelCase English company fallback after numKorean fallback. Updated version to 3.5.

4. **scraper-agent.md**: Documented camelCase English fallback (EXP-038).

## Results

| Metric | Before | After |
|--------|--------|-------|
| test_exp033 | 6/7 | **7/7** |
| test_company_fallback | 10/11 | **11/11** |
| All other tests | PASS | PASS |
| Total passing | 2 failures | **0 failures** |

## Test Coverage

All test files pass with zero regressions. Total assertions across all tests: 160+.
