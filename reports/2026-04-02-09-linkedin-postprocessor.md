# EXP-070: LinkedIn Post-Processor

**Date**: 2026-04-02
**Skill**: job-scraping
**Status**: ✅ Keep (32/32 tests pass, 0 regressions)

## Problem

LinkedIn scraping pipeline had **no post-processor** — unlike Wanted (`post-process-wanted.js`, EXP-068) and JobKorea (`post-process-jobkorea.js`, EXP-069). Raw LinkedIn cards only contained `title`, `company`, `location`, `link`. Missing: experience level, skills, salary, work_type.

This meant:
- LinkedIn-sourced jobs had no skills for the matching algorithm (0% skill coverage)
- No salary data despite descriptions often containing salary info
- No experience filtering (senior/mid/junior)
- No work_type detection (remote/hybrid/onsite)

## Solution

Created `scripts/post-process-linkedin.js` with:

1. **Experience level extraction** — 5 levels: senior/lead/principal → senior (5yr), mid-senior/중급 → mid (3yr), junior/신입 → junior (0yr), intern (0yr). Korean N년차 pattern also detected. Fixed Korean word boundary issue (`\b` doesn't work with Korean chars in parentheses → context-aware boundary matching).

2. **Skill inference** — 50+ tech patterns from title + description. Normalizations: k8s→kubernetes, golang→go. Multi-word skills preserved (react native, spring boot, next js).

3. **Salary extraction** — Reuses shared `normalizeSalary()` from Wanted post-processor. Supports 연봉/월급/억 ranges, single values, 면접후결정.

4. **Work type detection** — remote/hybrid/onsite from Korean + English keywords.

5. **Location normalization** — Korean↔English city mapping (Pangyo→판교, Seoul→서울), 대한민국 stripping.

## Test Results

| Category | Tests | Status |
|----------|-------|--------|
| Experience level | 9 | ✅ |
| Skill inference | 7 | ✅ |
| Salary extraction | 5 | ✅ |
| Work type | 4 | ✅ |
| Full integration | 7 | ✅ |
| **Total new** | **32** | **✅** |
| All existing | 671 | ✅ |
| **Grand total** | **703** | ✅ |

## Files Changed

- `scripts/post-process-linkedin.js` — new (LinkedIn post-processor)
- `test_linkedin_postprocess.js` — new (32 tests)
- `skills/job-scraping/SKILL.md` — updated to v5.1
- `agents/scraper-agent.md` — added LinkedIn post-processor section

## Bugs Fixed During Development

1. Regex `/년(?:차|이상|+)/` — `+` quantifier on nothing → fixed to `/(년(?:차|이상))/`
2. `normalizeSalary()` returns `{min, max}` not `{salary_min, salary_max}` → fixed property names
3. `\b` word boundary doesn't match Korean chars adjacent to parentheses → replaced with context-aware patterns
4. `.replace(/[\s.]+/g, '')` collapsed multi-word skills (react native → reactnative) → changed to preserve spaces

## Impact

LinkedIn scraping pipeline now produces the same enriched output as Wanted and JobKorea. Matching algorithm can use skills, experience, and salary from LinkedIn-sourced jobs. Cross-source dedup (EXP-067) and NLP queries (salary, experience) now work for LinkedIn data too.
