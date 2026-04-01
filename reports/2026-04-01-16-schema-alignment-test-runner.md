# EXP-058: Matches Schema Alignment + Unified Test Runner

**Date**: 2026-04-01
**Skill**: job-matching + infrastructure
**Experiment ID**: EXP-058

## Hypothesis
The matches table schema had drifted from the validated matcher v4.2 algorithm — missing `culture_score`, `career_score`, `location_score` columns and referencing stale column names (`preferred_score`, `work_type_score`, `commute_score`). Additionally, with 29+ test files, there was no `npm test` to run them all.

## Changes

### 1. Matches Table Schema Fix
- Added `culture_score`, `career_score`, `location_score` columns to matches table
- Legacy columns (`preferred_score`, `work_type_score`, `commute_score`) kept for backward compatibility
- Updated matcher-agent.md INSERT/SELECT to use correct v4.2 column names
- Added `test_schema_alignment.js` (9 tests) validating all 6 scoring columns + job_id NOT NULL + match_details + resume_id

### 2. Unified Test Runner
- Created `run_all_tests.js` — discovers and runs all `test_*.js` files
- Handles multiple output format patterns (N/M passed, Passed: N/M, X passed Y failed, etc.)
- Supports `--verbose` and `--filter <pattern>` flags
- Added `npm test`, `npm run test:verbose`, `npm run test:filter` to package.json
- Runs 29 test suites, 511+ tests in ~1 second

## Results
| Metric | Before | After |
|--------|--------|-------|
| matches scoring columns | 2/6 (skill, experience only) | 6/6 (all v4.2 components) |
| matcher-agent INSERT accuracy | Wrong column names | Aligned with schema |
| npm test | Missing | ✅ `npm test` runs all 29 suites |
| Total tests | 502 | 511 (+9 schema tests) |
| Regressions | 0 | 0 |

## Baseline Update
```json
{
  "timestamp": "2026-04-01T12:04:00Z",
  "experiment_id": "EXP-058",
  "skill": "job-matching",
  "focus": "schema_alignment",
  "metrics": {
    "matches_scoring_columns": "6/6",
    "schema_alignment_tests": "9/9",
    "total_tests": "511 (all pass)",
    "npm_test": "working",
    "test_suites": 29
  }
}
```
