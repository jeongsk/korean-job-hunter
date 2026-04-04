# EXP-112: Comma-Formatted Reward Extraction Fix

**Date:** 2026-04-05 02:04 KST
**Skill:** job-scraping
**Metric:** reward_extraction_accuracy

## Hypothesis

Wanted 보상금 amounts with comma-formatted numbers (1,000만원, 2,000만원) were not captured by the reward regex `\d+만원`, causing the reward text to leak into the job title field.

## Root Cause

The reward extraction regex in `post-process-wanted.js` line 126:
```js
/(보상금|합격금|성과금)[\s]*(\d+만원)/
```

`\d+` only matches consecutive digits. When Wanted renders `보상금 1,000만원`, the comma breaks the match and the entire reward string remains in the working text, eventually appearing in the parsed title.

## Change

Changed `\d+` to `[\d,]+` in the reward regex to accept comma-formatted numbers.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Comma reward extraction | ❌ leaks to title | ✅ extracted |
| Non-comma reward | ✅ | ✅ (unchanged) |
| Total tests | 1295 | 1299 |
| Regressions | — | 0 |

## Test Cases Added

- `보상금 1,000만원` → reward extracted, title clean
- `보상금 2,000만원` → reward extracted, title clean  
- `보상금 1,500만원` → reward extracted, title clean
- `보상금 100만원` → reward extracted (regression guard)

## Impact

High-value reward amounts (1,000만원+) were systematically leaking into job titles because Wanted formats large rewards with commas. This affected the most attractive job listings.
