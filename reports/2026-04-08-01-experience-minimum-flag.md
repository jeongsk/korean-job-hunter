# EXP-160: Experience Scoring Minimum Flag Fix

**Date:** 2026-04-08
**Skill:** job-matching
**Metric:** experience_scoring_accuracy

## Hypothesis
`calculateExperienceScore` penalized over-qualified candidates for minimum-only patterns (N년 이상). A 7-year candidate for a "3년 이상" job scored 45 (ratio 7/3=2.33 > 2.0 threshold) instead of 90. Minimum-experience jobs don't have a meaningful upper bound — candidates exceeding the floor should score well, not be penalized.

## Change
Added `isMinimum` parameter to `calculateExperienceScore`. When true and candidate meets the minimum, score is 90 regardless of how far above the floor they are. Added 6 new test cases covering the flag behavior.

## Baseline
- test_bare_experience_scoring: 1 failure (45 !== 90)
- Total tests: 165 pass, 1 fail

## Result
- test_bare_experience_scoring: 24/24 pass
- Total tests: 165 pass, 0 fail
- No regressions

## Delta
- 1 test fixed, +7 new tests, isMinimum flag added
- Zero regressions across all test suites
