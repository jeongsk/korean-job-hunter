# EXP-120: normalizeDeadline Unix Timestamp + ISO Datetime Support

**Date:** 2026-04-05 11:04 KST
**Skill:** job-scraping
**Focus:** deadline_normalization_api_parity

## Hypothesis

`normalizeDeadline` rejected all non-string inputs with `typeof raw !== 'string'` guard. The Wanted API `due_time` field is a Unix timestamp (number), not a Korean text string. API-sourced jobs always had null deadlines, making deadline urgency scoring (EXP-035) and NLP deadline queries (마감임박, 오늘 마감, N일 남은) non-functional for the primary scraping method.

## Gap Analysis

| Input Format | Before | After |
|-------------|--------|-------|
| Unix timestamp (number, seconds) | null | ISO date |
| Unix timestamp (number, ms) | null | ISO date |
| Numeric string ("1746000000") | null | ISO date |
| ISO datetime ("2026-04-30T23:59:59Z") | "2026-04" (partial) | "2026-04-30" |
| D-N, 상시모집, YYYY-MM-DD | working | working (unchanged) |

## Change

- Added numeric input handling to `normalizeDeadline()` with seconds/ms heuristic (< 1e12 = seconds)
- Added numeric string detection (9-13 digit regex) for API JSON serialization
- Added ISO 8601 datetime parsing (`YYYY-MM-DDThh:mm:ssZ` or with timezone offset)
- Added sanity check: timestamps before 2000-01-01 return null
- Created `test_deadline_timestamp.js` with 20 test cases

## Results

| Metric | Before | After |
|--------|--------|-------|
| Deadline format families | 5 (string only) | 8 (+number, +numeric string, +ISO datetime) |
| API deadline coverage | 0% (always null) | Full |
| New tests | 0 | 20 |
| Total tests | 1393 | 1413 |
| Regressions | 0 | 0 |

## Impact

API-sourced jobs (the primary Wanted scraping method since browser returns 403) now have functional deadlines. The deadline urgency scoring system (critical/high/medium/low/expired) and all NLP deadline queries work for API-sourced data. Previously every API-scraped job had a null deadline field regardless of the actual posting deadline.
