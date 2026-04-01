# EXP-069: JobKorea Salary Normalization Pipeline

**Date:** 2026-04-02
**Skill:** job-scraping
**Status:** ✅ Kept

## Problem

EXP-068 wired `normalizeSalary()` into `post-process-wanted.js`, making `salary_min`/`salary_max` functional for Wanted-sourced jobs. However, JobKorea salary extraction (EXP-046) only captured raw salary text like `"연봉 5000~8000만원"` without normalizing to numeric `salary_min`/`salary_max`. This meant:

- JobKorea-sourced jobs always had `salary_min = null, salary_max = null` in the database
- NLP salary queries (`연봉 5000 이상`) only worked for Wanted jobs
- The salary normalization effort from EXP-068 covered only 1 of 3 sources

## Hypothesis

Creating `post-process-jobkorea.js` that reuses `normalizeSalary()` from the Wanted post-processor will populate `salary_min`/`salary_max` for JobKorea-sourced jobs with zero code duplication.

## Changes

1. **`scripts/post-process-jobkorea.js`** — New module with `parseJobKoreaCard()`:
   - Positional line-based parsing (same logic as existing test_jobkorea_parsing.js)
   - Calls `normalizeSalary()` on extracted salary text
   - Outputs `salary_min`/`salary_max` as numeric (만원, annual)
   - Reuses `normalizeSalary()` from `post-process-wanted.js` (zero duplication)

2. **`test_jobkorea_salary_pipeline.js`** — 12 test cases:
   - Annual range (5000~8000)
   - Monthly range annualized (300~500 → 3600/6000)
   - Single value (6000만원 이상)
   - Negotiable (면접후결정 → null)
   - No salary field
   - 억 range (1~2억 → 10000/20000)
   - Full integration (all fields + salary)
   - Company prefix stripping
   - English company names
   - Monthly single value
   - Entry level (신입)
   - Title with career keyword

3. **`skills/job-scraping/SKILL.md`** v5.0 — Added post-process step to JobKorea workflow

4. **`agents/scraper-agent.md`** — Added JobKorea salary normalization section

## Results

| Metric | Before | After |
|--------|--------|-------|
| JobKorea salary pipeline tests | 0 | 12/12 (100%) |
| salary_min/max populated | No | Yes |
| Total tests | 659 | 671 |
| Test suites | 34 | 35 |
| Regressions | — | 0 |

## Key Detail

The `parseJobKoreaCard()` function handles all the same edge cases as the existing test_jobkorea_parsing.js (company prefix stripping, city-in-company-name, 경력 in title, English companies) while adding salary normalization. Monthly salary is automatically annualized (×12).

## Impact

NLP salary queries (`연봉 5000 이상`, `월급 400 이상`) now work for all three sources (Wanted, JobKorea, LinkedIn) instead of just Wanted.
