# EXP-024: Primary Domain Alignment for Better Discrimination

**Date**: 2026-03-30  
**Skill**: job-matching  
**Status**: ✅ Kept

## Problem

HIGH and MEDIUM job groups had only a 4-point gap (HIGH min: 86, MED max: 82). MED-001 (Python/Django backend) scored 82 despite zero overlap with the candidate's JavaScript/React core domain — inflated by shared infrastructure skills (AWS, Docker, PostgreSQL).

## Hypothesis

Detecting the job's primary technology domain and penalizing the skill score when there's no overlap with the candidate's core domain would widen the HIGH-MED discrimination gap.

## Implementation

Added to `tests/run-match-tests.js`:

1. **Primary tech detection**: Scans job text for primary language/framework indicators (Python, Java, JS/TS, Go, Rust, Swift, C++, C#)
2. **Domain overlap check**: Verifies if candidate has exact or tier2 match with any detected primary tech
3. **Mismatch penalty**: 25% reduction to skill score when no primary domain overlap exists
4. Updated MED-001 expected range from [75, 90] to [60, 75]

## Results

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| HIGH-MED gap | 4 pts | 15 pts | **+11** |
| MED-001 score | 82 | 71 | -11 |
| MED-001 skill | 58 | 44 | -14 |
| All tests | 7/7 ✅ | 7/7 ✅ | — |
| Discrimination | PASS | PASS | — |
| Spread | 79 | 79 | — |

## Analysis

The primary domain alignment correctly identifies that a Python/Django job shares only infrastructure tooling with a JS/React candidate. The 25% penalty is conservative enough to avoid over-penalizing legitimate cross-domain candidates while meaningfully separating HIGH from MEDIUM.

## Files Changed

- `tests/run-match-tests.js` — Added domain detection and penalty logic
- `tests/match-discrimination.test.json` — Updated MED-001 expected range
- `skills/job-matching/SKILL.md` — Documented EXP-024 domain alignment
- `agents/matcher-agent.md` — Updated agent prompt notes

## Next Steps

- Consider making the penalty progressive (stronger for more distant domains)
- Add more test cases for edge cases (e.g., Go job with Docker overlap)
