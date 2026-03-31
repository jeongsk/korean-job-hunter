# EXP-042: Live LinkedIn Validation & Location Fix

**Date**: 2026-04-01
**Skill**: job-scraping
**Status**: ✅ Kept

## Problem

No live integration tests existed for LinkedIn scraping. All LinkedIn testing was unit-based with synthetic data. Real-world validation was needed.

## Discovery

1. **LinkedIn selectors work** — `.jobs-search__results-list li` and `.base-card` both return valid data from live LinkedIn job search
2. **LinkedIn authwall** — intermittent redirect to `/authwall` (login wall), not documented in SKILL.md
3. **Location bug** — `normalizeLocation("대한민국")` returned `"대한민국"` instead of `""` because the regex required a comma prefix

## Root Cause

The 대한민국 stripping regex was `/,\s*대한민국\s*$/` — requiring a comma. LinkedIn sometimes returns location as just `"대한민국"` (no city, no comma).

## Fix

- Changed regex to `/,?\s*대한민국\s*$/` (comma optional)
- Applied to SKILL.md v3.8 and test_linkedin_parsing.js
- Added authwall detection guidance to SKILL.md

## Results

| Metric | Before | After |
|--------|--------|-------|
| Live LinkedIn tests | 0 | 14/14 |
| Standalone 대한민국 | ❌ Not stripped | ✅ Stripped |
| Authwall guidance | None | Documented |
| All existing tests | PASS | PASS |

## Files Changed

- `skills/job-scraping/SKILL.md` — v3.7 → v3.8 (location fix + authwall)
- `test_linkedin_parsing.js` — location regex fix
- `test_live_linkedin.js` — NEW: 14 live data tests
- `data/autoresearch/baseline.json` — updated
- `data/autoresearch/experiments.jsonl` — EXP-042 entry
