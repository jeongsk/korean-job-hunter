# EXP-121: Role-Based Skill Inference + Career Stage for Bare "경력"

**Date:** 2026-04-05 12:04 KST
**Skill:** job-scraping + job-matching
**Focus:** skill_extraction_career_stage_coverage

## Hypothesis

Two production gaps discovered via live Wanted API scraping:

1. **Career stage null for bare "경력"**: Wanted API returns `experience: "경력"` (without year range) for most listings. `deriveCareerStage("경력")` returned null because no year digits were present. This made the 15% career_stage matching weight always score 50 (neutral).

2. **Zero skills from Korean role titles**: ~50% of Wanted listings have role-based titles like "프론트엔드 개발자" with no explicit tech keywords. `inferSkills` only matches technology names (react, python, etc.), so these listings got `skills: []`, making the 35% skill weight score 0%.

## Change

### deriveCareerStage fix
- Added bare "경력" (no digits) → "mid" default before year-range matching
- Preserves correct behavior for "경력 10년 이상" → senior (digits present → year matching)
- "경력무관" → null unchanged (matches 무관 check first)

### Role-based skill inference (ROLE_SKILL_MAP)
- 9 Korean role → skill mappings as fallback when `inferSkills` returns []
- 프론트엔드 → react, typescript, javascript
- 백엔드 → node.js, python, java
- 풀스택 → react, node.js, typescript
- 안드로이드 → kotlin, java
- iOS/아이오에스 → swift, swiftui
- 데브옵스 → docker, kubernetes, ci/cd
- 데이터 엔지니어 → spark, airflow, python
- 데이터 사이언티스트 → python, machine learning
- 머신러닝 → python, machine learning, tensorflow
- Only activates when zero explicit tech keywords found
- "React 개발자" returns `['react']` (explicit match, no fallback)

## Results

| Metric | Before | After |
|--------|--------|-------|
| deriveCareerStage("경력") | null | mid |
| inferSkills("프론트엔드 개발자") | [] | [react, typescript, javascript] |
| inferSkills("백엔드 엔지니어") | [] | [node.js, python, java] |
| New tests | 0 | 15 |
| Total tests | 1413 | 1428 |
| Regressions | 0 | 0 |

## Impact

Wanted API is the primary scraping method (browser returns 403). Most listings have experience="경력" and role-based titles. Previously these jobs had null career_stage and empty skills — 50% of the matching algorithm's weight (35% skills + 15% career_stage) was scoring neutral/zero for the majority of scraped jobs. Now both fields are populated with reasonable defaults.
