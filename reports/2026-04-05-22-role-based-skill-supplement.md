# EXP-130: Role-Based Skill Supplement (Always, Not Fallback)

**Date:** 2026-04-05
**Skill:** job-scraping + job-matching
**Experiment ID:** EXP-130

## Hypothesis

ROLE_SKILL_MAP in `skill-inference.js` was designed to infer skills from Korean role titles (프론트엔드, 백엔드, 데브옵스, etc.). However, it only fired when `skills.length === 0` — meaning when zero explicit tech keywords were found.

The problem: most Korean role titles already match at least one SKILL_MAP entry:
- 데브옵스 → matches `devops` → ROLE_SKILL_MAP skipped → missing docker, kubernetes, ci/cd
- sre → matches `sre` → ROLE_SKILL_MAP skipped → missing kubernetes, prometheus, docker
- 머신러닝 → matches `machine learning` → ROLE_SKILL_MAP skipped → missing python, tensorflow
- 클라우드 → matches aws/docker/kubernetes → ROLE_SKILL_MAP skipped

Of 28 ROLE_SKILL_MAP entries, ~15 were completely dead because the role name itself matched a SKILL_MAP pattern.

## Change

Modified `inferSkills()` in `scripts/skill-inference.js`:
- **Before:** `if (skills.length === 0) { /* apply ROLE_SKILL_MAP */ }`
- **After:** Always apply ROLE_SKILL_MAP, adding skills not already in the list

## Results

| Metric | Before | After |
|--------|--------|-------|
| 데브옵스 엔지니어 skills | `[devops]` | `[devops, docker, kubernetes, ci/cd]` |
| sre 엔지니어 skills | `[sre]` | `[sre, kubernetes, prometheus, docker]` |
| 머신러닝 엔지니어 skills | `[machine learning]` | `[machine learning, python, tensorflow]` |
| Role supplement active for | 0% of role titles with existing matches | 100% |
| Total tests | 1583 | 1593 |
| Regressions | — | 0 |

## Impact

The 35% skill matching weight now correctly uses role-supplementary skills for Korean job titles. Previously, a 데브옵스 job listing would only get `devops` as a skill, making it score very low against a Docker/Kubernetes candidate. Now it gets the full `[devops, docker, kubernetes, ci/cd]` set.

## Files Changed

- `scripts/skill-inference.js` — ROLE_SKILL_MAP logic from fallback to always-supplement
- `test_skill_inference.js` — 8 new EXP-130 test cases
- `test_validated_matching.js` — 2 new matching discrimination tests + inferSkills import
