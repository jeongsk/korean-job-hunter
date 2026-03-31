# EXP-036: Fix Korean NLP Negation — Proximity-Based + Location Negation

**Date**: 2026-03-31
**Skill**: job-tracking
**Metric**: nlp_query_accuracy
**Verdict**: ✅ KEEP

## Hypothesis

The negation parser ("빼고/제외/말고") incorrectly negated ALL entities before the negation marker instead of only the entity immediately preceding it. This caused "카카오 지원한 거 중에 토스 빼고" to exclude both 카카오 AND 토스, when the intent is to exclude only 토스. Additionally, location entities had no negation support at all.

## Root Cause

Two bugs:
1. **Company negation**: `beforeNeg.includes(company)` checked if company appeared anywhere before "빼고" — both "카카오" (at start) and "토스" (right before "빼고") matched, so both got NOT LIKE
2. **Location negation**: Locations had no negation handling at all — "판교 빼고" was ignored

Secondary bug: JobKorea short-line company heuristic matched "서울 강남구" (6 chars) as a company name because location keywords weren't excluded.

## Changes

1. **Proximity-based negation**: Changed from `beforeNeg.includes(entity)` to `beforeNeg.trim().endsWith(entity)` — only the entity immediately before the negation marker gets negated
2. **Location negation**: Added same negation logic for location keywords with `appliedNegation` tracking
3. **Fallback preservation**: Status inversion still works as fallback when no entity-level negation was applied (e.g., "탈락한 거 빼고")
4. **JobKorea heuristic fix**: Added location keywords (서울, 경기, 부산, etc.) to short-line company exclusion regex
5. **Updated SKILL.md**: Documented proximity-based negation rules

## Test Results

```
test-korean-nlp-queries.js: 17/17 (was 16/17) ✅
test_korean_nlp_v2.js:      18/18 (was 16/18) ✅
test_jk_fallback.js:        14/14 (was 13/14) ✅
All other tests:            unchanged ✅
```

### Fixed Test Cases

| Input | Before | After |
|-------|--------|-------|
| "지원한 거 중에 판교 빼고" | 판교 LIKE (no negation) | 판교 NOT LIKE ✅ |
| "카카오 지원한 거 중에 토스 빼고" | 카카오 NOT LIKE, 토스 NOT LIKE | 카카오 LIKE, 토스 NOT LIKE ✅ |
| JobKorea no-company card | company: "서울 강남구" | company: "" ✅ |

## Impact

Natural Korean negation now works correctly for the most common patterns:
- "X 빼고" → exclude X (company or location)
- "A ... B 빼고" → keep A, exclude B
- Location negation fully supported for the first time
