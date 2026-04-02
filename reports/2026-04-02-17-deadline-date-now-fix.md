# EXP-078: Deadline julianday('now') → date('now') Fix

**Date:** 2026-04-02
**Skill:** job-tracking
**Metric:** nlp_sql_correctness

## Hypothesis
`julianday('now')` returns the current UTC timestamp (with fractional day), but deadline columns store date-only strings (e.g., '2026-04-02') which `julianday()` parses as midnight UTC. This mismatch causes "오늘 마감" filter to also match tomorrow's deadline when current UTC time is past noon.

## Root Cause
At 12:04 UTC (9:04 PM KST):
- `julianday('now')` = midnight April 2 + 0.503 days
- `julianday('2026-04-03')` (tomorrow's deadline) = midnight April 3
- Difference = 0.497, falls within BETWEEN -0.5 AND 0.5 → false match

## Change
Replaced `julianday('now')` with `julianday(date('now'))` in all deadline comparison filters across:
- `test_nlp_sql_integration.js` (오늘 마감, 내일 마감 filters)
- `skills/job-tracking/SKILL.md` (days_left, deadline check)
- `agents/tracker-agent.md` (deadline query examples)

`date('now')` returns today's date as a string, so `julianday(date('now'))` = midnight today UTC, giving clean integer-day differences.

## Results
- **Before:** 831 passed, 1 failed (오늘 마감 matched 네이버 instead of 토스)
- **After:** 856 passed, 0 failed
- **Regressions:** 0

## Note
The KST timezone offset means `date('now')` is technically UTC midnight, not KST midnight. For a Korean user querying "오늘 마감" at 11 PM KST, the UTC date already rolled to the next day. A future improvement could use `date('now', '+9 hours')` for full KST alignment, but this requires agent-side SQL control.
