# EXP-115: NLP Work Type Keyword Leak Fix + Hybrid Detection

**Date:** 2026-04-05
**Skill:** job-tracking
**Metric:** nlp_keyword_accuracy

## Hypothesis

Work type Korean keywords (재택근무, 풀리모트, 원격근무, 전면재택, 완전재택) leaked into title/company keyword search because `consumedWords` only captured short forms (재택, 원격, 리모트). Additionally, `주 N일 출근` hybrid pattern was missing from NLP parser entirely.

## Changes

### 1. Work Type Keyword Consumption Fix
- Added all Korean compound forms to consumedWords: 재택근무, 전면재택, 원격근무, 풀리모트, 완전재택
- Expanded remote detection regex to include 전면재택 and 완전재택

### 2. Hybrid Work Type Detection
- Added `주\s*\d\s*일\s*출근` pattern for hybrid detection (e.g., 주 3일 출근)
- Added `출근` to consumedWords when hybrid is detected

### 3. StopWord Expansion
- Added 10 new stopWords: 전면재택, 완전재택, 출근, 상시모집, 수시모집, 상시채용, 전부, 모두, 모든

## Results

| Metric | Before | After |
|--------|--------|-------|
| Keyword leaks | 5 | 0 |
| Hybrid N일 detection | ❌ | ✅ |
| NLP v3 tests | 78 | 85 |
| Total tests | 1315 | 1322 |
| Regressions | — | 0 |

### Before Fix
```
재택근무 공고 → ["j.work_type = 'remote'", "(j.title LIKE '%재택근무%' OR j.company LIKE '%재택근무%')"]
풀리모트 공고 → ["j.work_type = 'remote'", "(j.title LIKE '%풀리모트%' OR j.company LIKE '%풀리모트%')"]
주 3일 출근 공고 → ["(j.title LIKE '%출근%' OR j.company LIKE '%출근%')"]  // no work_type filter!
```

### After Fix
```
재택근무 공고 → ["j.work_type = 'remote'"]  // clean
풀리모트 공고 → ["j.work_type = 'remote'"]  // clean
주 3일 출근 공고 → ["j.work_type = 'hybrid'"]  // correctly detected
```

## Root Cause

The NLP parser consumed only the base forms of work type keywords (재택, 원격, 리모트) but users naturally type compound forms (재택근무, 원격근무, 풀리모트). The unconsumed remainder leaked into the fallback keyword search that generates title/company LIKE clauses. The hybrid work type "주 N일 출근" pattern was present in post-processors (EXP-025) but never added to the NLP query parser.

## Files Changed

- `scripts/nlp-parser.js` — fixed consumedWords, added hybrid pattern, expanded stopWords
- `test_korean_nlp_v3.js` — added 7 test cases (IDs 98-104)
- `data/autoresearch/baseline.json` — updated
- `data/autoresearch/experiments.jsonl` — appended EXP-115
