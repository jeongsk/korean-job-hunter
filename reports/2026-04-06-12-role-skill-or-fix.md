# EXP-146: Role-Based NLP Skill Inference Uses OR Instead of AND

**Date:** 2026-04-06
**Skill:** job-tracking (NLP parser)
**Experiment ID:** EXP-146

## Hypothesis

Role-based skill inference in the NLP parser (added EXP-145) used AND logic requiring ALL skills to be present in a job's skills column. This was semantically incorrect — a "백엔드" job uses Java OR Python OR Node.js, not all three. The AND filter returned zero results against real job data.

## Change

Changed role-based skill filters from individual AND entries to a single OR group:

**Before:**
```sql
WHERE j.skills LIKE '%node.js%' AND j.skills LIKE '%python%' AND j.skills LIKE '%java%'
```

**After:**
```sql
WHERE (j.skills LIKE '%node.js%' OR j.skills LIKE '%python%' OR j.skills LIKE '%java%')
```

Applied to all 5 role mappings: 풀스택, 프론트엔드, 백엔드, 안드로이드, 프론트.

## Results

| Metric | Before | After |
|--------|--------|-------|
| 백엔드 공고 query results | 0 | 4 (including 2 백엔드-titled) |
| NLP SQL integration tests | 37/38 | 38/38 |
| All other tests | PASS | PASS |
| Regressions | 0 | 0 |

## Also Fixed in This Run

Committed EXP-145 (uncommitted from previous session):
- Employment type negation (정규직 빼고, 계약직 제외)
- MLOps regex variants (ML/Ops, ML Ops)
- Korean role titles in skill-inference ROLE_SKILL_MAP
- 50+ expanded stopWords for Korean query noise

## Commit

- `EXP-145`: `ccc96b3`
- `EXP-146`: `9235cdd`
