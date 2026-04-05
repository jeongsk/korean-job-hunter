# EXP-118: NLP-SQL Integration Test Expansion

**Date:** 2026-04-05 09:07 KST
**Skill:** job-tracking
**Focus:** nlp_sql_integration_coverage

## Hypothesis

NLP-SQL integration test (`test_nlp_sql_integration.js`) had only 28 tests and a DB schema missing 4 columns (employment_type, career_stage, culture_keywords, office_address) added in EXP-086/091/095. The NLP parser generates `j.employment_type` and `j.career_stage` SQL filters that were never validated against a real database — only as unit tests in `test_korean_nlp_v3.js`.

## Change

- Added `employment_type`, `career_stage`, `culture_keywords`, `office_address` columns to test DB schema
- Added j7 seed job (삼성, intern/entry-level) with distinct employment_type and career_stage
- Added 10 new SQL integration tests:
  - Employment type: 정규직, 계약직, 인턴
  - Career stage: 시니어, 리드, 주니어
  - Composite: 정규직+시니어+카카오, 자바+정규직, 쿠버네티스+서울, 블록체인(empty result)
- Fixed 2 existing test expectations affected by j7 seed data (관심 and 파이썬 counts)

## Results

| Metric | Before | After |
|--------|--------|-------|
| NLP-SQL tests | 28 | 38 |
| DB schema columns | 16 | 20 |
| Seed jobs | 6 | 7 |
| Total tests | 1364 | 1374 |
| Regressions | 0 | 0 |

## Impact

Employment type and career stage NLP filters now validated end-to-end: Korean input → NLP parsing → SQL filter generation → SQLite execution → result validation. Previously these features only had unit test coverage (parsing-only), meaning runtime SQL errors (e.g., missing column) would go undetected until production.
