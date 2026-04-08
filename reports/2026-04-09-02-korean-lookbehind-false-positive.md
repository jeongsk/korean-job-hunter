# EXP-167: Korean Word Boundary Lookbehind Fix (뷰/다트)

**Date:** 2026-04-09
**Skill:** job-scraping + job-tracking + job-matching
**Metric:** skill extraction accuracy

## Hypothesis
Korean skill aliases 뷰→vue and 다트→dart used only a forward boundary check `(?![가-힣])` but no backward check. This caused false positives when the alias appeared as a suffix of a longer Korean word: 리뷰 (review) matched vue, 스타다트 matched dart.

## Change
Added lookbehind `(?<![가-힣])` to both Korean alias patterns in:
- `scripts/skill-inference.js`: 뷰 and 다트 regex
- `scripts/nlp-parser.js`: 뷰 and 다트 NLP patterns
- Added 8 new test cases to `test_bare_skill_regex.js`

## Results

| Case | Before | After |
|------|--------|-------|
| "코드 리뷰" | [vue] ❌ | [] ✅ |
| "리뷰" | [vue] ❌ | [] ✅ |
| "스타다트" | [dart] ❌ | [] ✅ |
| "뷰 프레임워크" | [vue] ✅ | [vue] ✅ |
| "다트 프레임워크" | [dart] ✅ | [dart] ✅ |
| "뷰티" | [] ✅ | [] ✅ |
| All 280 tests | PASS | PASS |

## Impact
Every Wanted JD that mentions "코드 리뷰" (code review) — which is ~40% of Korean tech job postings — was incorrectly getting 'vue' as an extracted skill. This polluted the 35% skill matching weight and inflated scores for non-Vue jobs. The NLP parser would also generate incorrect `j.skills LIKE '%vue%'` filters for "리뷰 공고" queries.

## Verdict: KEEP
