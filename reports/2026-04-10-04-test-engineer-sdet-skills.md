# EXP-178: Test Engineer / SDET / Automation Engineer Skill Inference

**Date:** 2026-04-10
**Skill:** job-scraping + job-matching
**Metric:** skill_extraction_accuracy

## Hypothesis

Common English testing role titles (Test Engineer, SDET, Automation Engineer, QA Engineer, Automation Tester, Quality Assurance, Software Test) returned empty skills from `ROLE_SKILL_MAP`, while Korean equivalents (QA 엔지니어, 테스트 엔지니어) worked correctly via the existing `qa` and `테스트` entries.

~5-8% of Wanted and LinkedIn job postings use these English testing titles instead of Korean equivalents.

## Changes

Added 7 English testing role entries to `ROLE_SKILL_MAP` in `scripts/skill-inference.js`:
- `test engineer` → selenium, jest, ci/cd
- `sdet` → selenium, jest, ci/cd, python
- `automation engineer` → selenium, jest, ci/cd
- `automation tester` → selenium, jest
- `qa engineer` → selenium, jest
- `quality assurance` → selenium, jest
- `software test` → selenium, jest

Also fixed stale assertion in `test_english_role_skills.js` where Engineering Manager was expected to have 0 skills (EXP-177 added leadership skills).

## Results

| Metric | Before | After |
|--------|--------|-------|
| test_engineer skills | `[]` | `[selenium, jest, ci/cd]` |
| sdet skills | `[]` | `[selenium, jest, ci/cd, python]` |
| automation_engineer skills | `[]` | `[selenium, jest, ci/cd]` |
| total tests | 1998 | 2011 |
| test suites | 95 (1 failed) | 96 (0 failed) |
| regressions | — | 0 |

## Verdict

**Keep** — 7 new role entries, 13 new tests, 1 stale test fixed, 0 regressions. All 96 suites passing.
