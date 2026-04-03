# EXP-092: salary_min/salary_max Dedup Persistence

**Date:** 2026-04-04
**Skill:** job-scraping (dedup-jobs.js)
**Metric:** salary_range_persistence_through_dedup

## Hypothesis

`salary_min`/`salary_max` are computed by all 3 post-processors (Wanted, JobKorea, LinkedIn) but never included in `dedup-jobs.js` SELECT query or enrichment fields. When a better-scoring duplicate is kept (e.g., JobKorea with richer skills) but a lower-scoring one (e.g., Wanted) had the normalized salary range, the `salary_min`/`salary_max` values are lost. This breaks salary-based NLP queries like "연봉 5000 이상" because the numeric range used for comparison is always NULL after dedup.

Same pattern as EXP-086 (employment_type), EXP-080 (skills), and EXP-091 (career_stage) — all had the same "computed but not persisted through dedup" bug.

## Changes

1. Added `salary_min`, `salary_max` to SQL SELECT in `dedup-jobs.js`
2. Added numeric bonus in `fieldScore()` when `salary_min` or `salary_max` exist
3. Added enrichment logic: if keeper has neither `salary_min` nor `salary_max`, copies from first duplicate that has them
4. Added `numericFields` set to ensure SQL UPDATE uses unquoted numbers/NULL (not `'5000'` string)
5. Created `test_dedup_salary.js` with 7 assertions

## Results

| Metric | Baseline | Result |
|--------|----------|--------|
| salary_min in SELECT | ❌ | ✅ |
| salary_max in SELECT | ❌ | ✅ |
| salary in fieldScore | ✅ | ✅ |
| salary_min/max in enrichFields | ❌ | ✅ |
| numeric SQL handling | ❌ | ✅ |
| Total tests | 1023 | 1030 |
| Regressions | 0 | 0 |

## Verdict: KEEP ✅

Salary range data now survives dedup. Same class of bug as EXP-086/080/091 — pipeline field computed but dropped at the dedup merge step.
