# EXP-163: Spring→Java Conflict Fix & Turborepo Domain Mapping

**Date:** 2026-04-08 07:04 KST
**Skill:** job-matching + job-scraping
**Metric:** skill_extraction_accuracy + domain_alignment_coverage

## Hypothesis

FRAMEWORK_CONFLICTS included 'spring' as a backend conflict detector, blocking 'java' from role supplements when Spring was detected. This is semantically wrong — Spring IS Java's framework. "Spring 백엔드" should return [spring, java, node.js, python] but only returned [spring].

Additionally, turborepo was in skill-inference.js SKILL_MAP but had no PRIMARY_DOMAINS mapping, causing domain coverage test failure.

## Changes

1. Removed 'spring' from FRAMEWORK_CONFLICTS backend conflictDetectors. Spring detection no longer blocks java (or any other backend defaults). Java itself remains a conflict detector that blocks node.js/python for non-Java backends.
2. Added turborepo to PRIMARY_DOMAINS (js/ts domain) in test_validated_matching.js
3. Added turborepo to DOMAIN_MAP in tests/run-match-tests.js

## Results

| Metric | Before | After |
|---|---|---|
| Spring 백엔드 skills | [spring] | [spring, java, node.js, python] ✅ |
| Domain coverage | 133/134 (turborepo missing) | 134/134 ✅ |
| Total tests | 179/181 pass, 2 fail | 181/181 pass ✅ |
| Matching tests | 133/134 pass | 134/134 pass ✅ |

- **Regressions:** 0
- **Bugs fixed:** 2

## Impact

Spring is the most common Java framework in Korean job market. Previously, "Spring 백엔드 개발자" only got [spring] as an explicit skill, losing java/node.js/python from the role supplement. The 35% skill matching weight was artificially deflated for Spring jobs — a Spring backend job appeared less relevant to a Java developer than it should.
