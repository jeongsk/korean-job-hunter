# EXP-126: API Detail Salary Extraction from JD Descriptions

**Date:** 2026-04-05 17:04 KST
**Skill:** job-scraping
**Focus:** api_salary_extraction

## Hypothesis

The Wanted API detail fetcher (`fetchDetail` in scrape-wanted-api.js) extracts skills, culture keywords, work_type, and experience ranges from JD descriptions — but never extracts salary. The `normalizeSalary` function exists in post-process-wanted.js and is imported, but never called. JD descriptions frequently contain salary information like "연봉 5000~8000만원" that goes unused, leaving salary_min/salary_max as null for all API-scraped jobs.

## Gap

| Field | Before | After (with this fix) |
|-------|--------|----------------------|
| salary | null | "연봉 5000~8000만원" |
| salary_min | null | 5000 |
| salary_max | null | 8000 |

This means salary-based matching (10% weight with EXP-084 salary alignment), salary NLP queries (연봉 5000 이상), and salary dedup enrichment were all non-functional for API-scraped jobs.

## Change

**post-process-wanted.js:**
- Added `extractSalaryLine(description)` function that scans JD text for salary patterns:
  - 연봉/월급 with colon separator (연봉: 7000만원)
  - ₩ absolute won notation (₩50,000,000 ~ ₩80,000,000)
  - Standalone 만원 ranges (5000 ~ 8000만 원)
  - 억 notation (연봉 1~2억)
  - 면접후결정 / 회사내규에 따름 (negotiable)
- Returns the first matching salary text, which is then passed to existing `normalizeSalary()`

**scrape-wanted-api.js:**
- Added salary extraction in detail enrichment loop (after description is fetched, before experience extraction)
- Only activates when `job.salary` is not already populated

**test_api_salary_extraction.js:**
- 21 test cases covering: 연봉 range, single value, 면접후결정, 회사내규, ₩ notation, 억 notation, 월급→연봉 conversion, colon format, standalone 만원, empty/null, multiple mentions

## Results

| Metric | Before | After |
|--------|--------|-------|
| API salary extraction | none | 6 format families |
| API salary_min/salary_max | always null | populated from JD |
| Total tests | 1476 | 1497 |
| Regressions | 0 | 0 |

## Impact

Salary-based features now functional for API-scraped jobs:
- **Matching**: EXP-084 salary alignment (-20 to +20 score delta) works
- **NLP queries**: 연봉 5000 이상 returns API-scraped jobs
- **Dedup**: Salary enrichment during merge (EXP-092, EXP-105) preserves data
