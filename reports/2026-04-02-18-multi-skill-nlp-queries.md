# EXP-079: Multi-Skill NLP Queries

**Date:** 2026-04-02
**Skill:** job-tracking
**Metric:** multi-skill query accuracy

## Hypothesis
The NLP parser only matched the first skill due to `if (skillMatched) break;` after the outer loop. Queries like "React TypeScript 공고" would only filter by React, ignoring TypeScript. Additionally, when "spring boot" matched, "spring" would also generate a separate (redundant) filter.

## Changes
1. **Removed single-skill break** — skill loop now continues to match all skills in the query
2. **Added substring dedup** — if a longer canonical (e.g., "spring boot") is already consumed, shorter substrings ("spring") are skipped via `consumedWords` containment check
3. **Fixed Korean alias extraction** — `koMatch` regex now uses the pattern source to detect Korean characters correctly
4. **Applied to both parsers** — `test_korean_nlp_v3.js` and `test_nlp_sql_integration.js`

## Test Cases Added
- #46: "React TypeScript 공고" → 2 skill filters
- #47: "파이썬 장고 공고" → 2 Korean aliases matched
- #48: "도커 k8s 서울 공고" → 2 skills + location
- #49: "React Python 지원한 공고" → 2 skills + status
- #50: "react native TypeScript 공고" → multi-word skill + second skill (no double-react)
- 3 SQL integration tests verifying actual DB query results

## Results
- **864 tests passing** (up from 856)
- **8 new tests** (5 parser + 3 SQL integration)
- **0 regressions**
- "spring boot" queries no longer produce duplicate "spring" filter
- "react native" queries no longer produce duplicate "react" filter

## Baseline Update
```json
{
  "timestamp": "2026-04-02T13:04:00Z",
  "experiment_id": "EXP-079",
  "skill": "job-tracking",
  "focus": "multi_skill_nlp_queries",
  "hypothesis": "Removing single-skill break and adding substring dedup enables AND-combined multi-skill NLP queries",
  "metrics": {
    "total_tests": "864 (all pass)",
    "npm_test": "working",
    "test_suites": 41,
    "all_passing": true,
    "regressions": 0
  }
}
```
