# EXP-166: Career Stage Specificity Scoring

**Date:** 2026-04-09
**Skill:** job-matching
**Metric:** discrimination (HIGH-MED gap)

## Hypothesis
Career stage alignment (15% weight) scored 85 for all mid-level matches regardless of specificity — jobs with 무관 (open to all levels) or bare 경력 (no year range) got the same career score as jobs with specific "3~7년" ranges, weakening HIGH-MED discrimination.

## Change
- Added specificity modifiers to career stage scoring in run-match-tests.js:
  - Specific year range detected (e.g., "3~7년"): base score 85
  - Bare 경력 / no specific range: 75 (-10)
  - 무관 (open to all levels): 70 (-15)
- Updated SKILL.md with career score modifier documentation
- Updated matcher-agent.md with specificity rules

## Results

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| HIGH-MED gap | 4pts | 5pts | +1 |
| HIGH range | 84-87 | 84-87 | 0 |
| MED range | 45-80 | 45-79 | max -1 |
| LOW range | 5-29 | 5-29 | 0 |
| MED-005 (bare 경력) | 80 | 78 | -2 |
| MED-006 (무관) | 80 | 77 | -3 |
| All tests | 1917/1917 | 1917/1917 | 0 regressions |

## Analysis
The HIGH-MED gap improved from 4 to 5 points. Jobs with explicit career stage information score higher than those with vague or no career requirements. This is correct behavior — a job that specifies "3~7년 경력" is a more confident match for a mid-level candidate than one that accepts anyone (무관) or just says "경력" without specifics.

The improvement is modest (+1pt) because MED-005 and MED-006 are genuinely good skill matches (React/TypeScript). The career specificity penalty correctly reduces their score without over-penalizing valid matches.

## Verdict: KEEP
