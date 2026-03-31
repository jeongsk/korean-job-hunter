# EXP-040: Space Before English Parenthetical Company Name Fix

**Date:** 2026-03-31
**Skill:** job-scraping
**Component:** Company extraction (rawCompany regex)

## Problem

When scraping live Wanted data, the company name "버티고우게임즈 (Vertigo Games)" was not extracted. The raw text pattern `버티고우게임즈 (Vertigo Games)경력` has a **space** between the Korean company name and the English parenthetical.

The rawCompany regex `([가-힣]+(?:\([^)]+\))?)경력` required the parens to immediately follow the Korean text, so the optional `(?:\([^)]+\))?` group failed to match.

## Discovery Method

Live scraping validation against actual Wanted search results for "프론트엔드". This bug was not caught by any existing unit test because no test case had a space before the English parenthetical.

## Fix

Added `\s*` before the parenthetical group in the rawCompany regex:

```
Before: ([가-힣]+(?:\([^)]+\))?)경력
After:  ([가-힣]+(?:\s*\([^)]+\))?)경력
```

## Files Changed

- `skills/job-scraping/SKILL.md` — v3.5 → v3.6, updated rawCompany regex
- `test_live_wanted.js` — added test case for space-before-parens pattern, fixed regex
- `test_live_parse.js` — new live data validation test with the failing case

## Validation

| Test Suite | Before | After |
|---|---|---|
| test_live_wanted.js | 8/8 (1 known untested) | 9/9 ✅ |
| test_live_parse.js | N/A (new) | 8/8 ✅ |
| All 13 existing test suites | PASS | PASS ✅ |
| Live Wanted scraping | Selector working | Selector working ✅ |
| Live JobKorea scraping | Selector working | Selector working ✅ |

## Lesson

Unit tests with synthetic data don't catch all real-world patterns. Periodic live scraping validation is essential for maintaining extraction accuracy. Company names with English translations in parens separated by spaces are common on Wanted (e.g., "버티고우게임즈 (Vertigo Games)", "제이앤피메디 (JNPMEDI)").
