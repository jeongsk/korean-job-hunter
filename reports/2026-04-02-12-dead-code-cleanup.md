# EXP-073: Dead Code Cleanup - job-tracking JS files and legacy shell scripts

**Date:** 2026-04-02T04:04:00Z
**Skill:** all (housekeeping)
**Metric:** codebase hygiene

## Hypothesis
5 JS files in skills/job-tracking/ (1991 lines) and 9 legacy shell scripts in project root are dead code — never referenced by any SKILL.md, agent prompt, or test. They add confusion and maintenance burden similar to the hallucinated code cleaned in EXP-028/029/030.

## Changes
- Removed `skills/job-tracking/autonomous-tracker.js` (336 lines)
- Removed `skills/job-tracking/enhanced-tracker.js` (476 lines)
- Removed `skills/job-tracking/quality-validator.js` (466 lines)
- Removed `skills/job-tracking/tracking-benchmark.js` (313 lines)
- Removed `skills/job-tracking/tracking-optimizer.js` (400 lines)
- Removed 9 legacy shell scripts from project root (debug_scraping.sh, test_actual_scraping.sh, etc.)
- Removed test_korean_nlp_v2.js.bak

## Results
| Metric | Before | After |
|---|---|---|
| Dead JS files | 5 (1991 lines) | 0 |
| Dead shell scripts | 9 | 0 |
| Test suites | 37 | 37 |
| Tests passing | 727 | 727 |
| Regressions | - | 0 |

## Verdict: KEEP
No functional impact. 1991+ lines of dead code removed. All tests pass unchanged.
