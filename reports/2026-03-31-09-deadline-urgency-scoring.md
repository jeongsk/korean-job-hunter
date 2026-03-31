# EXP-035: Deadline-Aware Urgency Scoring

**Date**: 2026-03-31
**Skill**: job-tracking
**Metric**: deadline_query_capability
**Verdict**: ✅ KEEP

## Hypothesis

Adding deadline-aware urgency scoring and Korean NLP deadline query patterns to the tracker enables time-sensitive job prioritization — users can ask "마감임박한 공고 있어?" and get deadline-filtered, urgency-ranked results.

## Changes

1. **Urgency computation function** (`computeUrgency`): Parses deadline strings (YYYY.MM.DD, YYYY-MM-DD, MM/DD, 상시/수시) and returns urgency levels (critical/high/medium/low/expired/none) with days-until count.

2. **Korean NLP deadline query parser** (`parseDeadlineQuery`): 8 pattern matchers:
   - 마감임박/곧마감 → ≤7 days
   - 이번 주 마감 → ≤7 days
   - 오늘/내일/모레 마감 → exact day match
   - N일 남은 → within N days
   - 마감순/마감 빠른순 → ORDER BY deadline ASC
   - 기한 있는/데드라인 있는 → has non-null deadline

3. **Updated job-tracking SKILL.md** (v2→v2.1): Added deadline urgency table, urgency-aware SQL query template, deadline format documentation.

4. **Updated tracker-agent.md**: Added deadline filter keywords, 6 new Korean query examples, urgency-aware smart suggestions (deadline urgency + expired cleanup).

## Test Results

```
24/24 deadline urgency tests passed
- 11 urgency computation tests (critical/high/medium/low/expired/none/null/format)
- 13 Korean NLP deadline query tests (마감임박/곧마감/이번주/오늘/내일/N일남은/마감순/기한있는)
```

## Pre-existing Tests

No regressions. All existing tests unchanged:
- test_parsing.js: ✅
- test_context_extraction.js: 5/5 ✅
- test_schema_exp027.js: 7/7 ✅
- test_e2e_parsing.js: 7/7 ✅
- test_jobkorea_parsing.js: 11/11 ✅
- test_resume_nlp.js: 44/44 ✅
- test_deadline_urgency.js: 24/24 ✅ (NEW)
- test_korean_nlp_v2.js: 16/18 (2 pre-existing failures)
- test_jk_fallback.js: 13/14 (1 pre-existing failure)

**Total: 112 tests (88 + 24 new)**

## Impact

Previously, "마감임박" was just a dead keyword — it mapped to `j.deadline IS NOT NULL AND j.deadline != ''` with no actual urgency logic. Now:
- Users can query by deadline proximity in natural Korean
- Urgency levels enable visual priority display (🔴🟠🟡🟢)
- Deadline-aware SQL queries sort by proximity + match score
- Smart suggestions flag urgent unapplied jobs
