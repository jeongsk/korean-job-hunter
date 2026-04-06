# EXP-151: Newbie-Range Career Stage Fix

**Date:** 2026-04-07
**Skill:** job-scraping + job-matching
**Metric:** career_stage_accuracy

## Hypothesis
Job titles with "신입-N년" or "0-N년" range patterns (common on Wanted) always returned `career_stage=junior` because the `신입` keyword matched before year range logic was reached. This makes positions accepting mid-level candidates (신입-5년) invisible to career_stage-aware matching.

## Change
Added "신입-N년" / "0-N년" range pattern detection in `deriveCareerStageFromTitle()` BEFORE the generic `신입` → junior check. Upper bound determines career stage:
- ≤3 years → junior
- ≤7 years → mid
- ≤12 years → senior
- \>12 years → lead

## Results

| Title | Before | After |
|-------|--------|-------|
| 프론트엔드 개발자(신입-5년, Next.js/React/Typescript) | junior | mid ✅ |
| 백엔드 개발자 신입~3년 | junior | junior ✅ |
| 개발자(신입-10년) | junior | senior ✅ |
| 개발자(0-3년) | junior | junior ✅ |
| 신입 개발자 | junior | junior ✅ |

- 15 new test cases, all passing
- 0 regressions in existing tests

## Verdict
Keep. Fixes a real gap where Wanted's "신입-N년" pattern causes all such jobs to get career_stage=junior, reducing the 15% career_stage matching weight for candidates with 3-10 years of experience.
