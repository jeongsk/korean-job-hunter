# EXP-168: Job Coverage Gate for Domain Mismatch Discrimination

**Date:** 2026-04-09
**Skill:** job-matching
**Metric:** discrimination (HIGH-MED gap)

## Hypothesis
When skill score is above the quadratic gate threshold (≥ 40) but the candidate's matching covers less than 60% of the job's required skills, the skill score is inflated by infrastructure/cross-domain Tier 2 credit. Non-skill components (experience, culture, career, location) should be dampened to prevent domain-mismatched jobs from scoring close to genuine matches.

Root cause: MED-001 (Python/Django backend vs React/Node.js candidate) scored 79 — only 5 points below HIGH-001's 84. The skill score was 49 (above the 40 gate threshold) because of shared infrastructure skills (AWS, Docker, PostgreSQL), so all non-skill components passed through undampened. Culture scored 100 (both collaborative/remote), location 100 (same city), experience 95, career 85. Non-skill total was actually **higher** than HIGH-001's non-skill total.

## Change
Added **job coverage gate** in `tests/run-match-tests.js`:
- When `skillScore ≥ 40 AND jobCoverage < 60%`: apply 0.75 dampening to all non-skill components
- `effectiveGate = skillGate × coverageGate`
- Updated `skills/job-matching/SKILL.md` v3.14 with coverage gate documentation
- Updated `agents/matcher-agent.md` with coverage gate rules

## Results

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| HIGH-MED gap | 5pts (84 vs 79) | 6pts (84 vs 78) | +1 |
| MED-001 (domain mismatch) | 79 | 63 | -16 |
| MED-003 (Java/Spring) | 55 | 55 | 0 |
| MED-004 (DevOps/SRE) | 45 | 45 | 0 |
| LOW scores | 5-29 | 5-29 | 0 |
| HIGH scores | 84-87 | 84-87 | 0 |
| Spread | 82 | 82 | 0 |
| Total tests | 1945/1945 | 1945/1945 | 0 regressions |

### Why MED-001 dropped 16 points
MED-001 has skill=49, jobCoverage=53%. The coverage gate (0.75) dampens non-skill components:
- Experience: 95 × 0.75 = 71 (was 95)
- Culture: 100 × 0.75 = 75 (was 100)
- Career: 85 × 0.75 = 64 (was 85)
- Location: 100 × 0.75 = 75 (was 100)

Weighted non-skill: 71×0.25 + 75×0.15 + 64×0.15 + 75×0.1 = 17.75 + 11.25 + 9.6 + 7.5 = 46.1
Skill weighted: 49×0.35 = 17.15
Total: ~63

### Why other MED cases unaffected
- MED-003 (skill=28, coverage < 60%): skill < 40, so coverage gate doesn't apply (already dampened by quadratic gate)
- MED-005 (skill=80+, coverage > 60%): coverage gate condition not met
- MED-006 (skill=80+, coverage > 60%): coverage gate condition not met

## Verdict: KEEP
Coverage gate correctly identifies and dampens the specific case of domain-mismatched jobs where infrastructure overlap inflates the skill score above the quadratic gate threshold. The 60% coverage threshold ensures only genuinely mismatched jobs are affected.
