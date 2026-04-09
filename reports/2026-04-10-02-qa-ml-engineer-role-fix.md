# EXP-176: QA Role Skill Accuracy + ML Engineer English Role Mapping

**Date:** 2026-04-10
**Skill:** job-scraping+job-matching
**Metric:** skill_extraction_accuracy

## Hypothesis

QA/테스트 ROLE_SKILL_MAP returns [jest, cypress, playwright] as false positives for manual QA positions that don't use these specific frameworks. ML Engineer (English) title returns only `machine learning` from SKILL_MAP while Korean 머신러닝 엔지니어 gets python+tensorflow+pytorch from ROLE_SKILL_MAP — English title missing from role map.

## Changes

1. Changed QA/테스트 ROLE_SKILL_MAP: `['jest', 'cypress', 'playwright']` → `['selenium', 'jest']`
   - Selenium is the most widely-used QA tool in Korean job market (both manual and automated)
   - Jest covers unit testing broadly
   - Cypress/Playwright are too specific for the generic QA role fallback

2. Added `'ml engineer'` and `'machine learning engineer'` to ROLE_SKILL_MAP
   - Returns `['python', 'tensorflow', 'pytorch']` matching Korean 머신러닝 equivalent
   - Previously only returned `['machine learning']` from SKILL_MAP match

## Results

| Metric | Before | After |
|--------|--------|-------|
| QA 엔지니어 skills | jest, cypress, playwright | selenium, jest |
| ML Engineer skills | machine learning only | machine learning + python + tensorflow + pytorch |
| Total tests | 1998 | 1998 |
| Regressions | — | 0 |

## Impact

- **QA accuracy**: Manual QA jobs no longer get false-positive cypress/playwright skills. Selenium is a more reasonable default for the broader QA category.
- **ML Engineer parity**: English ML Engineer title now gets the same supplementary skills as Korean 머신러닝 엔지니어, fixing the language gap in the 35% skill matching weight.
