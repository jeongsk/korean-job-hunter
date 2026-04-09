# EXP-179: Newbie Range Career Stage Threshold Lowering

**Date:** 2026-04-10
**Skill:** job-scraping + job-matching
**Metric:** career_stage_accuracy

## Hypothesis

`deriveCareerStageFromTitle` used the **upper bound** of newbie ranges (신입~N년) with the same thresholds as pure year ranges. This inflated career stages: "Java 백엔드 개발자 (신입~8년)" → senior, "프론트엔드 개발자 (신입-5년)" → mid. But 신입-inclusive jobs skew junior/mid — they're casting a wide net, not targeting seniors.

~15-20% of Wanted API jobs have 신입-N년 in their titles. Inflated career stages caused poor NLP filtering (e.g., "미드 레벨 공고" would miss 신입~8년 jobs) and inaccurate matching.

## Changes

Lowered newbie range thresholds in `scripts/skill-inference.js` deriveCareerStageFromTitle:

| Upper bound | Old threshold | New threshold | Rationale |
|-------------|--------------|---------------|-----------|
| ≤3          | junior       | junior        | unchanged |
| ≤5          | mid          | **junior**    | 신입-5년 targets juniors, not mid |
| ≤7          | mid          | mid (≤10)     | subsumed by ≤10 |
| ≤8          | senior       | **mid**       | 신입~8년 is mid-level job |
| ≤10         | senior       | **mid**       | wide range but 신입-inclusive |
| ≤12         | senior       | senior (≤15)  | subsumed by ≤15 |
| ≤15         | lead         | **senior**    | 신입~15년 accepts seniors |
| >15         | lead         | lead          | unchanged |

Updated `test-newbie-range-career-stage.js` (16 test cases), `agents/scraper-agent.md`.

## Results

| Metric | Before | After |
|--------|--------|-------|
| 신입~5년 | mid | junior |
| 신입~8년 | senior | mid |
| 신입~10년 | senior | mid |
| 신입~15년 | lead | senior |
| Pure ranges (3-7년, N년 이상) | unchanged | unchanged |
| Matching tests (157) | all pass | all pass |
| Newbie range tests | 15 pass | 16 pass |
| Regressions | — | 0 |

## Live Validation

Wanted API job "Java 백엔드 개발자 (신입~8년)" now correctly maps to career_stage=mid instead of senior. "Backend 개발자(주니어)" still correctly returns junior.

## Verdict

**Keep** — More accurate career stage mapping for ~15-20% of API jobs with newbie ranges. 0 regressions. +1 edge case test.
