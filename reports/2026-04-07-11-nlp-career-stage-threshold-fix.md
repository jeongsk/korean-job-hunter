# EXP-158: NLP Career Stage Threshold Fix for N년 이상 Queries

**Date:** 2026-04-07
**Skill:** job-tracking
**Metric:** nlp_query_accuracy

## Hypothesis
NLP parser's N년 이상 career_stage filter thresholds were misaligned with deriveCareerStage logic, causing queries like "5년 이상 공고" to exclude mid-level jobs that a 5-year developer would qualify for.

## Problem
Three threshold bands were wrong:
- 3년 이상 → mid+ (excluded junior, but deriveCareerStage(3)=junior)
- 5년 이상 → senior+ (excluded mid, but deriveCareerStage(5)=mid)
- 7년 이상 → senior+ (excluded mid, but deriveCareerStage(7)=mid)

Real impact: "경력 5년 이상 서울" returned only senior+ jobs, missing the mid-level jobs that 5년 이상 positions typically accept.

## Fix
Aligned NLP thresholds with deriveCareerStage boundaries:
- 1-3년 이상 → junior+ (junior = 1-3 years in deriveCareerStage)
- 4-7년 이상 → mid+ (mid = 4-7 years)
- 8-12년 이상 → senior+ (unchanged)
- 13+ → lead (unchanged)

## Additional Fixes
- Removed duplicate line in test_korean_nlp_v3.js causing SyntaxError (line 100)
- Updated stale test expectations in test_nlp_parser_bugs.js

## Results
- 80/80 test suites passing (was 78/80)
- 2 previously-failing suites fixed: test_korean_nlp_v3.js, test_nlp_parser_bugs.js
- 0 regressions

## Verdict: KEEP
