# EXP-169: 신입가능 Experience Scoring

**Date:** 2026-04-09
**Skill:** job-matching
**Metric:** experience_scoring_accuracy

## Hypothesis
Wanted API sets `experience='신입가능'` for jobs that explicitly welcome new graduates. The matching scorer had no handler for this value — it fell through to the default score of 60 for all candidates. A senior with 10 years and a fresh graduate got the same experience score, making the 25% experience weight meaningless for entry-welcoming jobs.

## Change
Added `신입가능` / `신입 가능` / `신입·경력` / `신입/경력` experience scoring branch in `tests/run-match-tests.js`:

| Candidate Years | Score | Rationale |
|---|---|---|
| 0-1 | 95 | Perfect fit: new graduate |
| 2-3 | 80 | Junior: good, slight overqualification |
| 4-7 | 70 | Mid: acceptable, clearly overqualified |
| 8+ | 50 | Senior: poor fit, significantly overqualified |

Updated `skills/job-matching/SKILL.md` experience scoring table and `agents/matcher-agent.md`.

## Results

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| 신입가능 0yr score | 60 (default) | 95 | +35 |
| 신입가능 10yr score | 60 (default) | 50 | -10 |
| Discrimination gap (0yr vs 10yr) | 0 | 45 | +45 |
| Total tests | 1945/89 suites | 1945+12/89 suites | +12 tests, 0 regressions |

### Key behaviors
- 신입가능 0yr (95) > 경력 0yr (30): entry-welcoming job correctly prefers new grads
- 신입가능 10yr (50) < 경력 10yr (90): entry-welcoming job correctly penalizes seniors
- Handles both `신입가능` and `신입 가능` (with space)

## Test Coverage
- `test_newbie_possible_experience.js`: 12 test cases
- All 89 suites pass, 0 regressions
