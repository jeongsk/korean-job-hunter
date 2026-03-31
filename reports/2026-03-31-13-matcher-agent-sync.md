# EXP-039: matcher-agent.md Sync with Validated SKILL.md

**Date:** 2026-03-31
**Skill:** job-matching
**Component:** matcher-agent.md (agent prompt)

## Hypothesis

The matcher-agent.md prompt had drifted from the validated SKILL.md after EXP-037 tuning, causing agents to use incorrect scoring parameters:
1. Skill gate used old step-function (0.25/0.5/0.75/1.0) instead of quadratic `(skillScore/40)²`
2. Domain penalty was 25% (×0.75) instead of 40% (×0.60)

This means any agent executing matching via the prompt would produce different results than the validated test suite.

## Changes

- Updated skill gate to quadratic formula with minimum 0.04 (matching SKILL.md EXP-037)
- Updated domain penalty from ×0.75 to ×0.60 (40%, matching SKILL.md EXP-037)
- Bumped agent version to v4.1

## Results

| Metric | Before | After |
|--------|--------|-------|
| Gate formula | step-function (4 tiers) | quadratic `(s/40)²` min 0.04 |
| Domain penalty | 25% (×0.75) | 40% (×0.60) |
| All tests | PASS | PASS (0 regressions) |

## Verdict

**Keep.** Agent prompt now matches validated scoring logic exactly.

## Lesson

Agent prompts must be re-synced after every SKILL.md tuning experiment. The drift from EXP-037 went unnoticed for ~11 hours across 1 experiment cycle.
