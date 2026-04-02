# EXP-075: Cross-Source Culture Keyword Parity + innovat* Regex Fix

**Date:** 2026-04-02
**Skill:** job-scraping + job-matching
**Verdict:** ✅ Keep

## Problem

The 15% culture matching weight (EXP-063) was only functional for Wanted-sourced jobs. JobKorea and LinkedIn post-processors never extracted `culture_keywords`, meaning:
- A JobKorea job with "혁신적이고 자율적인 문화" got `culture_keywords: []` — the matching algorithm's culture component scored 50 (neutral default) regardless of actual culture signals.
- LinkedIn jobs with "innovative team, work-life balance" in descriptions were equally blind.

Additionally, the `innovative` culture regex in `CULTURE_PATTERNS` matched `innovation` but not `innovative` — an English keyword gap affecting all sources.

## Hypothesis

Reusing `extractCultureKeywords` from post-process-wanted.js in JobKorea and LinkedIn post-processors activates the 15% culture weight across all sources. Fixing the `innovat*` regex catches English "innovative" that was previously missed.

## Changes

1. **JobKorea post-processor** (`scripts/post-process-jobkorea.js`):
   - Imported `extractCultureKeywords` from post-process-wanted
   - Added `culture_keywords` array to parsed output
   - Added `work_type` detection (remote/hybrid/onsite) — previously always omitted

2. **LinkedIn post-processor** (`scripts/post-process-linkedin.js`):
   - Imported `extractCultureKeywords` from post-process-wanted
   - Added `culture_keywords` array from title + description text

3. **Culture regex fix** (`scripts/post-process-wanted.js`):
   - Changed `innovation` → `innovat` to match both "innovation" and "innovative"

4. **16 new tests** (`test_cross_source_culture_parity.js`):
   - 5 shared `extractCultureKeywords` unit tests
   - 5 JobKorea tests (culture, work_type, salary regression)
   - 3 LinkedIn tests (English culture, Korean culture, empty)
   - 1 cross-source parity test (same text → same keywords across all 3 sources)
   - 2 regression tests (salary, skills not broken)

## Results

| Metric | Before | After |
|--------|--------|-------|
| Sources with culture extraction | 1/3 (Wanted) | 3/3 (all) |
| `innovative` English match | ❌ | ✅ |
| JobKorea work_type | missing | remote/hybrid/onsite |
| Total tests | 732 | 748 |
| Regressions | 0 | 0 |

## Impact

The matching algorithm's 15% culture weight is now functional for all 3 data sources. Previously, JobKorea and LinkedIn jobs always scored neutral (50) on culture regardless of actual culture signals in the job text. This particularly affects discrimination when comparing jobs from different sources — a JobKorea listing emphasizing "자율, 워라밸" now correctly scores higher on culture alignment for candidates preferring those traits.
