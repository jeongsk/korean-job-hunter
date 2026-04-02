# EXP-072: NLP-to-SQL Integration Bug Fixes

**Date:** 2026-04-02 12:04 KST
**Skill:** job-tracking
**Metric:** nlp_sql_correctness

## Hypothesis
The NLP-to-SQL integration test suite (`test_nlp_sql_integration.js`) had 5 failing tests out of 20, indicating real parsing bugs that would affect Korean language queries against the database.

## Bugs Fixed

1. **Negation company lookup direction**: Parser looked AFTER `빼고` for the company to exclude, but Korean "카카오 빼고" has the company BEFORE `빼고`. Fixed by checking both before and after.

2. **Status negation**: "탈락한 거 빼고" (excluding rejected ones) was matching `탈락` as positive status filter with no negation applied. Now when `빼고` follows a status match with no company found, the last status filter is negated (IN → NOT IN, = → !=).

3. **Today/tomorrow deadline comparison**: `CAST(julianday(d) - julianday('now') AS INTEGER)` truncates 0.96→0, causing tomorrow's deadline to match "today". Fixed with `ROUND(..., 4) BETWEEN -0.5 AND 0.5`.

4. **Score sort pattern**: `/(점수|매칭)순/` didn't match "점수높은 순". Extended to `/(점수|매칭)순|(점수|매칭).*순/`.

5. **신입 filter scope**: `(LIKE '%신입%' OR LIKE '%무관%')` was too broad — "경력 무관" (experience irrelevant) matched 신입 queries. Narrowed to `LIKE '%신입%'` only.

## Results
- **Before:** 20 tests, 15 passed, 5 failed
- **After:** 20 tests, 20 passed, 0 failed
- **Full suite:** 727/727 passing (was 707 + 1 failing suite)
- **Regressions:** 0

## Files Changed
- `test_nlp_sql_integration.js` — parser bug fixes + test expectation correction
