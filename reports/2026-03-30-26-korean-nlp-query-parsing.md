# EXP-026: Korean NLP Query Parsing for Job Tracker

**Date:** 2026-03-30
**Skill:** job-tracking
**Status:** ✅ KEEP

## Hypothesis

Adding Korean natural language query parsing to the tracker agent will enable conversational Korean interaction without requiring raw SQL knowledge.

## Changes

### Korean NLP Query Parser
- Status detection: 면접, 지원한, 관심, 합격, 탈락, 지원할, 불합격 → SQL status filters
- Work type: 재택/원격/리모트 → `work_type = 'remote'`, 하이브리드 → `work_type = 'hybrid'`
- Company matching: 20 known Korean tech companies → `company LIKE '%{name}%'`
- Location: 24 city/district keywords → `location LIKE '%{keyword}%'`
- Job title keywords: remaining Korean words → search both title and company
- Negation: 빼고/제외/말고 → NOT filters
- Sorting: 점수순/매칭순 → `ORDER BY m.score DESC`
- Stop-word filtering: 45+ Korean grammar/function words excluded

### Enhanced Tracker Agent (v2)
- Korean NLP query understanding with examples
- Conversion funnel analytics (applied→interview→offer rates)
- Weekly activity summary
- Top unapplied matches query
- Smart suggestions (stale apps, high-score unapplied, follow-ups)
- Upsert support for idempotent status updates

### Enhanced Job Tracking Skill (v2)
- Complete NLP query mapping tables
- Composite query builder algorithm
- Pipeline analytics queries
- Smart suggestion rules
- Known companies and location keyword lists

## Test Results

```
11/11 tests passed (100%)

Status queries:    6/6 ✅
Composite queries: 3/3 ✅ (negation + company, work-type + status, sort + status)
Keyword queries:   2/2 ✅ (company-only, job-title + status)
Noise filtering:   0 leaks ✅ (all function words properly excluded)
```

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| NLP query support | ❌ None | ✅ 11/11 patterns |
| Pipeline analytics | Basic counts | Conversion funnel + weekly + suggestions |
| Smart suggestions | None | 4 proactive triggers |
| Query examples | 0 | 6 documented examples |

## Example Queries

| Korean Input | Generated SQL Filter |
|---|---|
| 면접 잡힌 거 있어? | `WHERE a.status = 'interview'` |
| 지원한 거 중에 카카오 빼고 | `WHERE a.status = 'applied' AND j.company NOT LIKE '%카카오%'` |
| 재택 관심 공고 | `WHERE a.status = 'interested' AND j.work_type = 'remote'` |
| 백엔드 공고 점수순 | `WHERE ... ORDER BY m.score DESC` |

## Files Changed

- `skills/job-tracking/SKILL.md` — Enhanced v2 with NLP parsing, analytics, suggestions
- `agents/tracker-agent.md` — Enhanced v2 with Korean query understanding
- `test-korean-nlp-queries.js` — 11 test cases for NLP parsing
- `data/autoresearch/experiments.jsonl` — EXP-026 entry
