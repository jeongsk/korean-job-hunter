# EXP-102: Salary Normalization Extended Formats

**Date:** 2026-04-04 15:04 KST
**Skill:** job-scraping
**Metric:** salary format coverage

## Problem

`normalizeSalary()` in `scripts/post-process-wanted.js` returned `null` for 3 common Korean salary format families that appear on LinkedIn Korea and Korean job aggregators:

| Format | Example | Before |
|--------|---------|--------|
| Bare number range after 연봉 | `연봉 5000~8000` | `null` |
| ₩ absolute won notation | `₩50,000,000` | `null` |
| 천만 unit | `연봉 5천만원` | `null` |

When salary normalization fails, `salary_min`/`salary_max` stay null in the DB. This means:
- Salary preference alignment (EXP-084) scores neutrally for these jobs
- Salary NLP queries (`연봉 6000 이상`) skip them entirely
- Salary-based sorting doesn't work

## Hypothesis

Adding fallback patterns for bare ranges, ₩ notation, and 천만 unit to `normalizeSalary()` would increase salary field completeness for real scraped data without breaking existing formats.

## Changes

Added 3 fallback patterns to `normalizeSalary()` after existing 만원/억 matching:

1. **Bare number ranges** — when preceded by 연봉/월급/연수입, match `N~M` or `N-M` with sanity bounds (100–99999)
2. **천만 unit** — `N천만` → N×1000 만원
3. **₩ absolute won** — `₩50,000,000` → 5000만원 (÷10000)

## Results

| Metric | Before | After |
|--------|--------|-------|
| Total tests | 1192 | 1209 |
| Salary format families | 2 (만원/원, 억) | 5 (+bare range, ₩, 천만) |
| Regressions | 0 | 0 |

All 9 new format patterns verified:
- `연봉 5000~8000` → `{min:5000, max:8000}` ✅
- `₩50,000,000 - ₩80,000,000` → `{min:5000, max:8000}` ✅
- `연봉 5천만원` → `{min:5000, max:5000}` ✅

## Files Changed

- `scripts/post-process-wanted.js` — added 3 fallback patterns to `normalizeSalary()`
- `test_salary_extended_formats.js` — 17 new test cases (new file)
- `data/autoresearch/baseline.json` — updated
- `data/autoresearch/experiments.jsonl` — EXP-102 entry

## Commit

`59ec70a` — EXP-102: salary normalization - bare ranges, ₩ notation, 천만 unit
