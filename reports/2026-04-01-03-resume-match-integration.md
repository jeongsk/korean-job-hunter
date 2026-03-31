# EXP-044: Resume → Matching Pipeline Integration Tests

**Date:** 2026-04-01
**Skill:** resume-agent / job-matching
**Metric:** pipeline integration correctness
**Verdict:** ✅ KEEP

## Problem

After 43 experiments improving individual skills in isolation, there was no test verifying that the resume-agent's master.yaml output correctly feeds into the matching algorithm. Schema mismatches, type errors, or data loss between the two agents could go undetected.

## Hypothesis

Creating an integration test suite that exercises the full data flow from master.yaml schema → matching algorithm input will catch any pipeline gaps and prevent regressions.

## Changes

1. **test_resume_match_integration.js**: 52 integration tests covering:
   - Skill summary extraction → skill score computation
   - Experience years → experience scoring with range matching
   - Career stage validation and matching
   - Preference arrays → location/work-type scoring
   - Cultural preferences (6 dimensions) → culture score
   - Primary domain detection → domain alignment penalty
   - Full pipeline: resume data → complete weighted score
   - Schema completeness verification (all matcher-required fields)
   - Edge cases: minimal resume, empty job skills, missing fields
2. **resume-agent.md**: Updated description with integration test reference

## Results

| Metric | Before | After |
|--------|--------|-------|
| Resume→match integration tests | 0 | 52/52 (100%) |
| Pipeline schema verified | ❌ | ✅ |
| Discrimination gap (perfect vs bad) | untested | 20+ points |
| All existing tests | PASS | PASS (0 regressions) |

## Key Findings

- **No schema gaps found**: The master.yaml schema from resume-agent correctly maps to all matching algorithm inputs
- **52 tests cover 9 integration areas**: skill extraction, experience, career stage, preferences, culture, domain alignment, full pipeline scoring, schema completeness, and edge cases
- **Discrimination verified**: Perfect match scores 87+, bad match scores 20+ points lower
- **Edge cases handled**: Minimal resumes with 1 skill produce reasonable scores; empty job skills default to neutral (50)

## Test Breakdown

| Category | Tests |
|----------|-------|
| Skill extraction & overlap | 5 |
| Experience scoring | 5 |
| Career stage | 2 |
| Preferences (location + work type) | 7 |
| Cultural preferences | 6 |
| Domain alignment | 4 |
| Full pipeline scoring | 8 |
| Schema completeness | 10 |
| Edge cases | 5 |
| **Total** | **52** |
