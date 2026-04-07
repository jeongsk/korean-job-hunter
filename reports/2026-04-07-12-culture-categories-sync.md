# EXP-159: Culture Categories Synced — 7 Traits + Structured culture_keywords Support

**Date:** 2026-04-07
**Skill:** job-matching
**Metric:** culture_scoring_accuracy

## Hypothesis

The matching algorithm's culture scoring used only 5 culture categories (innovative, collaborative, fast-paced, structured, autonomous) while the post-processors extracted 7 categories (also including learning_focused and work_life_balance since EXP-063). Additionally, the matching algorithm always scanned raw job text instead of using the structured `culture_keywords` field already stored in the database, missing pre-computed culture signals and potentially re-detecting different traits than what was extracted.

## Changes

1. **Added 2 missing culture categories** to matching algorithm: `learning_focused` and `work_life_balance` with Korean+English keyword sets aligned to post-processor patterns
2. **Structured culture_keywords priority**: When `job.culture_keywords` is a non-empty array, matching uses those pre-computed traits instead of scanning raw text. Falls back to text scanning when the field is empty/null.
3. Created `test_culture_alignment.js` with 10 test cases
4. Updated SKILL.md to v3.15

## Results

| Metric | Before | After |
|--------|--------|-------|
| Culture categories in matching | 5 | 7 |
| Uses structured culture_keywords | No | Yes (with fallback) |
| New tests | 0 | 10 |
| Total tests | 1881 (81 suites) | 1891 (82 suites) |
| Regressions | — | 0 |

## Impact

- Jobs with culture_keywords=['learning_focused', 'work_life_balance'] now correctly scored on those traits instead of getting generic 40 baseline
- learning_focused keywords (성장, 교육, 멘토링) and work_life_balance keywords (워라밸, 유연근무) now detected in culture scoring
- Structured culture_keywords bypass means consistent trait detection between extraction and matching — no more divergence between what post-processors extract and what matching looks for
- Backward compatible: jobs without culture_keywords still use text scanning with the expanded keyword set
