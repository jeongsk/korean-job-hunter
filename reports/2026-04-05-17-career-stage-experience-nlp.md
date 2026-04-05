# EXP-125: Career Stage-Based Experience NLP Queries

**Date:** 2026-04-05 16:04 KST
**Skill:** job-tracking
**Focus:** experience query accuracy

## Hypothesis

NLP experience queries ("3년 이상", "5년차") used fragile `LIKE '%N%'` on the raw experience text field. This caused false matches: "3년 이상" → `LIKE '%3%'` would match "13년", "23년", "3~5년". The structured `career_stage` column (added in EXP-091) was never used for experience filtering.

## Change

**nlp-parser.js:**
- "N년 이상" now maps to `career_stage IN()` based on deriveCareerStage thresholds (≤3→junior, ≤7→mid, ≤12→senior, >12→lead)
- "N년차" uses career_stage with inclusive semantics (suitable jobs for that experience level)
- "신입" adds `career_stage = 'entry'` as primary filter with LIKE fallback for legacy data
- "경력" standalone adds `career_stage IN ('junior','mid','senior','lead')` with LIKE fallback

**test_korean_nlp_v3.js:**
- Updated 6 existing test expectations from LIKE to career_stage IN()
- Added 5 new test cases covering boundary values (3yr, 7yr, 10yr, 15yr, 10년차)

**test_salary_nlp_integration.js:**
- Updated 2 test expectations for 5년차 and 신입 filters

## Results

| Metric | Before | After |
|--------|--------|-------|
| Experience query method | `LIKE '%N%'` (fragile) | `career_stage IN()` (structured) |
| False match on "3년" matching "13년" | ✅ Yes (bug) | ❌ No (fixed) |
| "신입" uses career_stage | ❌ No | ✅ Yes (with fallback) |
| Total tests | 1471 | 1476 |
| Regressions | 0 | 0 |

## Example Queries

| Input | Before (fragile) | After (accurate) |
|-------|------------------|-------------------|
| "3년 이상 공고" | `LIKE '%3%'` | `career_stage IN ('entry','junior','mid','senior','lead')` |
| "5년차 공고" | `LIKE '%5%'` | `career_stage IN ('mid','senior','lead')` |
| "10년 이상 공고" | `LIKE '%10%'` | `career_stage IN ('senior','lead')` |
| "15년 이상 공고" | `LIKE '%15%'` | `career_stage = 'lead'` |
| "신입 공고" | `LIKE '%신입%' OR '%무관%'` | `career_stage='entry' OR LIKE fallback` |
| "경력 공고" | `NOT LIKE '%신입%' OR '%무관%'` | `career_stage IN (...) OR LIKE fallback` |
