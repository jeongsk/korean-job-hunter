# EXP-068: Salary Pipeline Integration

**Date:** 2026-04-02  
**Skill:** job-scraping  
**Status:** ✅ Keep

## Problem

Salary normalization logic existed in `test_salary_normalization.js` (23 tests, EXP-060/062) but was never wired into the production post-processor (`scripts/post-process-wanted.js`). The `salary_min`/`salary_max` DB columns added in EXP-027 were always `null` in parsed output.

This meant:
- NLP salary queries (연봉 5000 이상) could never match real scraped data
- Salary-based sorting was non-functional
- The entire salary NLP pipeline was dead code in production

## Changes

1. **Added `normalizeSalary()` to `post-process-wanted.js`** — converts raw salary text to numeric `{min, max}` (만원, annual)
2. **Added 억 pattern to salary capture regex** — `(연봉|월급|연수입)[\s]*(...|억 patterns)` captures Korean large-salary notation
3. **Populates `salary_min`/`salary_max` on every parsed job** — ready for DB INSERT
4. **Created `test_salary_pipeline.js`** — 12 tests (6 unit + 6 integration)

## Results

| Metric | Before | After |
|--------|--------|-------|
| salary_min/max populated | ❌ never | ✅ always |
| 억 capture | ❌ no | ✅ yes |
| Pipeline tests | 0 | 12/12 |
| Total tests | 647 | 659 |
| Regressions | — | 0 |

## Examples

```
연봉 5000~8000만원 → salary_min: 5000, salary_max: 8000
연봉 6000만원 이상 → salary_min: 6000, salary_max: 6000
월급 300~500만원  → salary_min: 3600, salary_max: 6000 (×12)
연봉 1~2억        → salary_min: 10000, salary_max: 20000
면접후결정         → salary_min: null, salary_max: null
```
