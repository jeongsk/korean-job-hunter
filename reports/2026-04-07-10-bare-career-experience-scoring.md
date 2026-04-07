# EXP-157: Bare 경력 Experience Scoring — Graduated Instead of Neutral 50

**Date:** 2026-04-07
**Skill:** job-matching
**Metric:** experience_scoring_accuracy

## Hypothesis

Bare `경력` (experienced, no specific year requirement) is the most common experience value from the Wanted API, yet the matching algorithm scored it as neutral 50 for all candidates regardless of actual experience. A 0-year candidate and a 7-year candidate scored identically on the 25% experience weight, making it meaningless for the majority of API-scraped jobs.

## Root Cause

`calculateExperienceScore()` had specific handling for `신입·경력` (85), `경력무관` (80), `신입` (graduated), ranges, and minimums — but bare `경력` (just the word, no digits, no modifiers) fell through all pattern matches and returned the default 50.

This is the most common Wanted API experience value because `is_newbie=false` maps to `경력` without any year detail. EXP-156 added title-based enrichment to extract year ranges from titles like "백엔드 개발자 (3년 이상)", but the majority of titles don't contain year information, leaving `experience='경력'` for most API jobs.

## Change

Added bare `경력` pattern matching with graduated scoring:

| Candidate Years | Score | Rationale |
|----------------|-------|-----------|
| 0 | 30 | No experience — poor fit for "experienced" job |
| 1 | 60 | Minimal — barely acceptable |
| 3 | 80 | Junior — good fit |
| 5-10 | 90 | Mid/Senior — great fit |
| 15+ | 75 | Very senior — slightly overqualified |

Updated `test_validated_matching.js` (6 new test cases), `skills/job-matching/SKILL.md`, and `agents/matcher-agent.md`.

## Results

| Metric | Before | After |
|--------|--------|-------|
| 경력 + 0yr | 50 (neutral) | 30 (poor fit) |
| 경력 + 3yr | 50 (neutral) | 80 (good fit) |
| 경력 + 5yr | 50 (neutral) | 90 (great fit) |
| 경력 + 15yr | 50 (neutral) | 75 (slight overqualified) |
| Experience discrimination | 0 pts | 60 pts |
| Total tests | 128/128 | 134/134 |
| Regressions | — | 0 |

## Impact

- **60-point experience discrimination gap** for bare 경력 jobs (was 0)
- Affects the 25% experience weight for most Wanted API-scraped jobs
- Combined with EXP-156 title enrichment, experience scoring now works for both specific (3년 이상) and generic (경력) job postings
- All 83 test suites pass with 0 regressions
