# EXP-166: Experience Spacing Fix & Test Reference Error

**Date:** 2026-04-08
**Skill:** job-scraping
**Metric:** experience_extraction_accuracy + test_reliability

## Hypothesis
Three test suites were silently failing: experience field had `경력 N년이상` (no space) instead of `경력 N년 이상`, and test_live_wanted.js had a `ReferenceError: raw is not defined` crash that masked all other test results in that file.

## Changes

1. **post-process-wanted.js line 144**: Changed `.replace(/\s/g, '')` to `.replace(/(\d)\s*([~-])\s*(\d)/g, '$1$2$3')` — only normalizes range delimiter spacing (e.g., `3 ~ 5년` → `3-5년`) instead of stripping all whitespace including the space before `이상`.

2. **test_live_wanted.js line 59**: Fixed `raw.id` → `item.id` in error logging. The variable `raw` didn't exist in that scope; only `item` from the loop iterator was available.

## Results

| Suite | Before | After |
|-------|--------|-------|
| test_e2e_parsing.js | 4/7 | 7/7 |
| test_live_wanted.js | CRASH (ReferenceError) | 12/12 |
| test_post_process_wanted.js | 28/30 | 30/30 |
| Full suite | 275/278 | 278/278 |

**0 regressions.**

## Impact
- Experience values now consistently preserve Korean spacing: `경력 8년 이상`, `경력 4년 이상`
- This affects deriveCareerStage which pattern-matches on `이상` — the missing space could have caused `8년이상` to not match certain regex patterns
- test_live_wanted.js was completely broken — every run crashed before reporting any results, masking potential regressions
