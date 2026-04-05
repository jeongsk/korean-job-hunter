# EXP-136: Korean Alias False Positive Fix — 뷰/다트 substring + 삼성 double-filter

**Date:** 2026-04-06 06:04 KST
**Skill:** job-tracking + job-scraping + job-matching
**Verdict:** ✅ Keep

## Bugs Found

### Bug 1: 뷰 False Positive (Vue skill)

**Query:** `뷰티샵 공고` / `뷰포트 관련 공고`
**Expected:** No vue skill filter
**Got:** `j.skills LIKE '%vue%'` — false match

**Root cause:** Korean alias `뷰` in vue regex `/vue(?:\.?js)?|뷰/i` matches as substring of longer Korean words (뷰티샵, 뷰포트). No Korean word boundary check.

**Fix:** Added negative lookahead `뷰(?![가-힣])` in both nlp-parser.js and skill-inference.js.

### Bug 2: 다트 False Positive (Dart skill)

**Query:** `다트게임 공고`
**Expected:** No dart skill filter
**Got:** `j.skills LIKE '%dart%'` — false match

**Root cause:** Same issue — `다트` matches as substring of `다트게임`.

**Fix:** Added negative lookahead `다트(?![가-힣])` in both nlp-parser.js and skill-inference.js.

### Bug 3: 삼성 Double Filter (Company + Location)

**Query:** `삼성 공고`
**Expected:** Single company filter
**Got:** Both `j.company LIKE '%삼성%'` AND `j.location LIKE '%삼성%'` — redundant filtering

**Root cause:** 삼성 appears in both the companies list and the locations list (삼성역 area). Both match independently, generating two filters for the same entity.

**Fix:** Location loop now checks if the location name already has a company filter before adding a location filter.

## Changes

| File | Change |
|------|--------|
| `scripts/nlp-parser.js` | 뷰/다트 Korean lookahead; 삼성 location skip when company matched |
| `scripts/skill-inference.js` | 뷰/다트 Korean lookahead |
| `skills/job-tracking/SKILL.md` | v2.16 |
| `agents/tracker-agent.md` | v3.11 |
| `test_nlp_korean_alias_false_positive.js` | 13 new test cases |

## Test Results

- **Before:** 67 test files, all passing
- **After:** 68 test files, all passing (+13 new tests)
- **Regressions:** 0
