# EXP-100: State Management Skill Coverage & Similarity Connections

**Date:** 2026-04-04T13:04:00+09:00
**Skill:** job-matching + job-tracking + job-scraping
**Focus:** state_management_skill_coverage

## Hypothesis

State management libraries (zustand, recoil, mobx, vuex, pinia) appear frequently in Korean frontend job postings but were missing from both skill-inference.js and the similarity map. Only redux existed. These libraries are tightly coupled to their frameworks — a Vue+Pinia developer applying for a Vue+Vuex job should get high similarity, and React state management alternatives should partially overlap.

## Changes

### skill-inference.js
- Added 5 new skill patterns: zustand, recoil, mobx, vuex, pinia (with Korean equivalents)

### Similarity Map (test_validated_matching.js)
- **TIER2 (75%):** redux↔react (bidirectional), zustand→react, recoil→react, mobx→react, vuex→vue, pinia→vue, vue↔vuex+pinia
- **TIER3 (25%):** redux↔zustand↔recoil↔mobx (React state alternatives), vuex↔pinia (Vue state alternatives)

### NLP Parser (test_korean_nlp_v3.js)
- Added 5 new skill patterns: 주스탄드→zustand, 리코일→recoil, 몹엑스→mobx, 뷰엑스→vuex, 피니아→pinia
- Added Korean aliases as stopWords to prevent keyword leak
- 5 new NLP query test cases

### Agent Files Updated
- matcher-agent.md v4.7
- tracker-agent.md v3.7
- job-matching/SKILL.md v3.9
- job-tracking/SKILL.md v2.10

## Metrics

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Total tests | 1114 | 1131 | +17 |
| Skill inference skills | 88 | 93 | +5 |
| Similarity connections | ~120 | ~130 | +10 |
| NLP skill patterns | 90 | 95 | +5 |
| NLP v3 tests | 78 | 83 | +5 |
| Regressions | 0 | 0 | 0 |

## Verdict: KEEP ✅

State management skills are now extractable, matchable, and queryable. Frontend job matching accuracy improved for positions requiring specific state management experience.
