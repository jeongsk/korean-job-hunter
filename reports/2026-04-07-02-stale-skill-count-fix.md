# EXP-149: Stale SKILL_MAP Count Fix

**Date:** 2026-04-07
**Skill:** job-scraping+job-matching
**Metric:** test_pass_rate

## Hypothesis
test_skill_inference.js expected SKILL_MAP to have 143 entries but it has 145 after EXP-145/146 added role-based NLP entries. This caused 1 test suite to fail out of 76.

## Change
Updated expectedSkillCount from 143 to 145 in test_skill_inference.js.

## Results
- Before: 76 suites, 1897 passed, 1 failed
- After: 76 suites, 1898 passed, 0 failed

## Verdict
Keep. Trivial fix restoring green CI.
