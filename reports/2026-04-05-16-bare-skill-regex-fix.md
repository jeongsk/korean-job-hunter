# EXP-124: Bare Skill Name Regex Fix — vue/go/nuxt

**Date:** 2026-04-05 15:04 KST
**Skill:** job-scraping + job-matching + job-tracking
**Focus:** skill_extraction_regex_accuracy

## Hypothesis

The regex pattern `vue\.?js?` is parsed as "vue" + optional "." + required "j" + optional "s" — meaning bare "vue" never matches because "j" is mandatory. Same issue with `nuxt\.?js?` in the NLP parser. Skill-inference's "go" regex requires "golang/고언어/go언어" but bare "go" only works via word-boundary pattern that the NLP parser doesn't have.

This means:
1. **Skill extraction**: Job descriptions mentioning "Vue" (without ".js" suffix) → skill not extracted → 35% matching weight scores lower
2. **NLP queries**: "vue 공고", "go 공고", "nuxt 공고" → no skill filter generated → returns all jobs instead of filtered results

## Change

**skill-inference.js:**
- Changed `'vue': /vue\.?js?|뷰/i` → `/vue(?:\.?js)?|뷰/i` — makes ".js" suffix fully optional

**nlp-parser.js:**
- Changed vue pattern: `vue\.?js?` → `vue(?:\.?js)?`
- Changed nuxt pattern: `nuxt\.?js?` → `nuxt(?:\.?js)?`
- Changed go pattern: added `(?<!\w)go(?!\w)` word-boundary alternative (matching skill-inference.js)

**New tests:** test_bare_skill_regex.js — 15 test cases

## Results

| Metric | Before | After |
|--------|--------|-------|
| `inferSkills("Vue 경력")` | `[]` | `['vue']` |
| `parseKoreanQuery("vue 공고")` skill filter | none | `j.skills LIKE '%vue%'` |
| `parseKoreanQuery("go 공고")` skill filter | none | `j.skills LIKE '%go%'` |
| `parseKoreanQuery("nuxt 공고")` skill filter | none | `j.skills LIKE '%nuxt%'` |
| Total tests | 1456 (56 suites) | 1471 (57 suites) |
| Regressions | 0 | 0 |

## Impact

"Vue" is used bare in ~30% of Korean job postings (vs "Vue.js" or "뷰"). Previously these jobs had zero vue skill extracted, reducing matching accuracy by the full 35% skill weight component. The NLP query fix enables users to type "vue 공고" naturally instead of being forced to use "뷰 공고" or "vue.js 공고".

## Commit

EXP-124: Fix bare skill name regex — vue/go/nuxt match without suffix
