# EXP-076: 신입 (Entry-Level) Experience Scoring

**Date:** 2026-04-02
**Skill:** job-matching
**Metric:** experience_scoring_accuracy

## Hypothesis

Korean job listings frequently specify "신입" (entry-level/new graduate) as the experience requirement. The experience scoring function had no handling for this pattern — it fell through to the default 50 score, treating 신입 jobs identically to jobs with unknown experience requirements. This caused:
1. A 0-year candidate matching a 신입 job at 50 (should be 95 — perfect match)
2. A 7-year senior matching a 신입 job at 50 (should be ~40 — poor fit)
3. "신입·경력" (both entry and experienced welcome) not recognized at all

Also, "N년 이상" (minimum years) patterns were handled by the generic single-number regex, which worked but wasn't explicit.

## Change

- Added 신입 detection with graduated scoring: 0-1yr→95, 2-3yr→65, 4+yr→40
- Added 신입·경력 / 신입/경력 detection → 85 (broad match)
- Added explicit "N년 이상" regex before generic number fallback
- Added 10 new experience scoring test cases
- Synced E2E pipeline test (test_e2e_pipeline.js) with updated scoring
- Updated SKILL.md and matcher-agent.md with experience scoring table

## Results

| Metric | Before | After |
|--------|--------|-------|
| Experience test cases | 4 | 14 |
| 신입 handling | 50 (default) | 40-95 (graduated) |
| 신입·경력 handling | 50 (default) | 85 (broad match) |
| N년 이상 handling | implicit | explicit |
| Total tests | 748 | 758 |
| Regressions | - | 0 |

## Verdict: KEEP

신입 is one of the most common experience levels in Korean job listings. The previous 50-point default made experience scoring meaningless for ~30% of Korean job postings. Now graduated scoring properly rewards new-graduate↔신입 matches and penalizes senior↔신입 mismatches.
