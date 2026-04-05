# EXP-135: NLP Parser Bugfix — 면접후결정 + N년차 이상

**Date:** 2026-04-06 05:04 KST
**Skill:** job-tracking
**Verdict:** ✅ Keep

## Bugs Found

### Bug 1: 면접후결정 → Interview Status (Misclassification)

**Query:** `면접후결정 공고`
**Expected:** Salary negotiable filter
**Got:** `a.status = 'interview'` + keyword leak

**Root cause:** Status pattern `/면접(잡힌|보는)?/` matched "면접후결정" at the "면접" prefix. The optional group `(잡힌|보는)?` allowed zero-length match.

**Fix:** Added negative lookahead: `/면접(?!후결정)(잡힌|보는)?/`
Added 면접후결정 as salary negotiable filter: `(j.salary LIKE '%면접후결정%' OR j.salary LIKE '%협의%' OR j.salary IS NULL)`

### Bug 2: 3년차 이상 → All Career Stages (Over-inclusive)

**Query:** `3년차 이상 리액트`
**Expected:** `j.career_stage IN ('mid','senior','lead')`
**Got:** `j.career_stage IN ('entry','junior','mid','senior','lead')` — no filtering at all

**Root cause:** N년 이상 regex `/(\d+)\s*년\s*(이상|이상의)?/` matched "3년" from "3년차 이상", consuming just "3년" and leaving "차" unconsumed. Since years=3 and ≤3 threshold, it returned ALL stages. The N년차 branch was then skipped (`if (yoeMatch && !expMatch)`).

**Fix:** Added negative lookahead `(?!차)` to N년 이상 regex: `/(\d+)\s*년(?!차)\s*(이상|이상의)?/`
Added `(\s*이상)?` capture to N년차 regex for explicit "이상" handling.

## Changes

| File | Change |
|------|--------|
| `scripts/nlp-parser.js` | Negative lookaheads on 면접 and N년 regex; 면접후결정 salary filter; N년차 이상 branch |
| `skills/job-tracking/SKILL.md` | v2.15 |
| `agents/tracker-agent.md` | v3.10 |
| `test_nlp_parser_bugs.js` | 15 new test cases |

## Test Results

- **Before:** 1733 passed, 0 failed
- **After:** 1748 passed, 0 failed (+15 new tests)
- **Regressions:** 0
