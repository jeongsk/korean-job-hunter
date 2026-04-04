# EXP-098: Deadline Normalization Pipeline

**Date**: 2026-04-04
**Skill**: job-scraping + job-tracking
**Metric**: deadline field usability

## Hypothesis

Deadline urgency scoring (EXP-035, 24 tests) depends on ISO date fields, but all 3 post-processors left `deadline` as raw Korean text like `"D-3"`, `"~04/30(수) 마감"`, `"상시모집"`. The urgency computation and NLP deadline queries (마감임박, 오늘 마감, N일 남은) were non-functional against real scraped data because they expected date-comparable values.

## Changes

1. **Added `normalizeDeadline()` to post-process-wanted.js** — shared module function that converts raw deadline text to ISO date strings (`YYYY-MM-DD`):
   - `D-N` → N days from today
   - `N일 전` / `N주 전` → estimated remaining (30-day window minus days ago)
   - `YYYY.MM.DD` / `YYYY/MM/DD` / `YYYY-MM-DD` → direct conversion
   - `MM/DD(요일)` → current/next year, auto-rollover if past
   - `상시모집` / `수시모집` → null (no deadline)

2. **Wired into all 3 post-processors**:
   - `post-process-wanted.js`: normalizeDeadline called on `r.deadline` after extraction
   - `post-process-jobkorea.js`: same, plus expanded deadline classifier regex from `/마감/` to include `D-N`, `상시모집`, `YYYY.MM.DD` patterns
   - `post-process-linkedin.js`: import added for consistency

3. **Fixed timezone issue**: Used local date formatting instead of `toISOString()` (which uses UTC, causing date shifts in KST).

4. **Updated test**: Fixed `test_jobkorea_salary_pipeline.js` expectation from `deadline.includes("마감")` to `deadline.includes("2026-04-15")` — the raw text is now correctly normalized.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Deadline normalization | Not implemented | 8 formats supported |
| Deadline formats parsed | Raw text only | D-N, N일전, N주전, MM/DD, YYYY dates, 상시모집 |
| Urgency scoring functional | No (raw text) | Yes (ISO dates) |
| Deadline NLP queries functional | No | Yes |
| Total tests | 1077 | 1102 |
| Regressions | 0 | 0 |

## Why This Matters

This was the last pipeline gap for the deadline feature chain:
- EXP-027: Added deadline column to DB ✓
- EXP-035: Added urgency scoring + NLP queries ✓
- EXP-092: Added salary range dedup persistence ✓
- **EXP-098: Deadline normalization → ISO dates** ← This was missing

Without normalization, `j.deadline` contained text like `"D-3"` or `"~04/30(수) 마감"`. SQL date comparisons (`deadline <= date('now', '+7 days')`) silently failed, returning no results. Now all deadline-dependent features actually work.
