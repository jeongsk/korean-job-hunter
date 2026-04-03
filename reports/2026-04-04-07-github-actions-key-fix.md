# EXP-093: GitHub Actions Key Mismatch in Similarity Maps

**Date:** 2026-04-04 06:04 KST
**Skill:** job-matching
**Metric:** similarity_map_correctness

## Hypothesis

`github_actions` (underscore) key in TIER2 similarity map doesn't match `github actions` (space) output from skill-inference.js — same class of bug as EXP-088 (rest_api→rest api) but this key was missed.

Additionally, `'github actions'` appeared as a duplicate JS object key in TIER2 (lines 41 and 58), meaning the second declaration overwrote the first, silently losing the jenkins↔github actions connection.

## Changes

1. **TIER2 key fix**: `github_actions` → `github actions` in test_validated_matching.js and test_e2e_pipeline.js
2. **Duplicate key merge**: `'github actions': ['jenkins']` and `'github actions': ['ci/cd']` merged into single `'github actions': ['jenkins', 'ci/cd']`
3. **New tests**: 
   - Skill-inference key format consistency check (catches future underscore mismatches)
   - Forward lookup: jenkins → github actions = 0.75
   - Reverse lookup: github actions → jenkins = 0.75

## Results

| Metric | Before | After |
|--------|--------|-------|
| Jenkins ↔ GitHub Actions similarity | 0 (broken) | 0.75 (correct) |
| Total tests | 1030 | 1033 |
| Regressions | — | 0 |

## Impact

Any job matching involving Jenkins and GitHub Actions skills was getting 0 similarity instead of 0.75. This affected the 35% skill weight component when comparing CI/CD-related jobs against candidates with related but different CI/CD tool experience.

The root cause was a JavaScript object literal behavior: duplicate keys are silently overwritten by the last occurrence. The first `'github actions': ['jenkins']` was replaced by `'github actions': ['ci/cd']`, making jenkins lookup work (via `'jenkins': ['github actions']`) but reverse lookup fail.

## Lesson

EXP-088 fixed the `rest_api` key mismatch but missed `github_actions`. The systematic fix is a key format validation test — now added as the first test in the EXP-093 block, which checks ALL skill-inference keys against TIER map keys for underscore/space mismatches.
