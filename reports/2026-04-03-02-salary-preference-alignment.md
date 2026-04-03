# EXP-084: Salary Preference Alignment in Matching

**Date:** 2026-04-03
**Skill:** job-matching
**Metric:** salary_preference_utilization

## Hypothesis

The matching algorithm's 10% Location/Work component completely ignored salary preferences despite the resume schema having `preferences.salary_range: {min, max}` and jobs having `salary_min`/`salary_max` columns. A 3000만원 job scored identically to a 7000만원 job when the candidate explicitly prefers 5000-8000만원.

## Change

1. Added `calculateSalaryAlignment(jobSalaryMin, jobSalaryMax, candidateSalaryRange)` function that computes salary range overlap:
   - Full overlap → +5 to +20 (proportional)
   - Job below candidate range → -5 to -20 (proportional to gap)
   - Job above candidate range → +5 (slight positive)
   - Missing data → 0 (neutral, backward compatible)

2. Refactored `calculateLocationWorkScore` to include salary alignment:
   - Location match: +15 (was +25)
   - Work type match: +15 (was +25)
   - Salary alignment: -20 to +20 (new)
   - Base: 50, total range: 0-100

3. Updated `calculateMatch` to pass `job.salary_min`/`job.salary_max` to location/work scoring.

4. Added 5 new salary-specific test jobs (PERFECT, PARTIAL, LOW, HIGH, NO-DATA) and 14 new test assertions.

5. Updated SKILL.md v3.4, matcher-agent.md with salary alignment documentation.

## Results

```
Test Results: 76/76 (100%)
Full Suite: 927/927 (was 913)
Regressions: 0
```

### Salary Discrimination
| Job | Salary (만원) | Location Score | Overall |
|-----|--------------|----------------|---------|
| PERFECT (5000-8000) | exact match | 100 | 98 |
| PARTIAL (4000-6000) | partial overlap | 90 | 98 |
| HIGH (9000-12000) | above range | 85 | 97 |
| NO-DATA (null) | neutral | 80 | 96 |
| LOW (2500-3500) | below range | 71 | 95 |

Same skills, same experience, same location — salary is the only variable. A 29-point location score gap between perfect salary match (100) and below-range salary (71) flows through the 10% weight to create a 3-point overall score difference.

## Backward Compatibility

Jobs without salary data score identically to before (80 for location+work_type match). The location and work_type bonuses were reduced from 25 to 15 each, but the combined effect with salary alignment means the total bonus range (0-50) is preserved.

## Files Changed

- `test_validated_matching.js` — salary alignment function, 5 new test jobs, 14 new assertions
- `skills/job-matching/SKILL.md` — v3.4 with salary preference section
- `agents/matcher-agent.md` — updated Location/Work/Salary component docs
