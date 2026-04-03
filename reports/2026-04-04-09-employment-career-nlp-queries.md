# EXP-095: Employment Type & Career Stage NLP Queries

**Date:** 2026-04-04
**Skill:** job-tracking
**Metric:** nlp_filter_coverage

## Hypothesis

employment_type and career_stage fields exist in DB (EXP-086/091) but users cannot query them in Korean natural language. 정규직/계약직/인턴/시니어/주니어/미드/리드 patterns are missing from the NLP parser.

## Changes

### NLP Parser (test_korean_nlp_v3.js)

**Employment type filters:**
- 정규직 → `j.employment_type = 'regular'`
- 계약직/파견 → `j.employment_type = 'contract'`
- 인턴 → `j.employment_type = 'intern'`
- 프리랜서/프리랜스 → `j.employment_type = 'freelance'`

**Career stage filters:**
- 시니어/senior → `j.career_stage = 'senior'`
- 리드 → `j.career_stage = 'lead'`
- 미드/미들 → `j.career_stage = 'mid'`
- 주니어/junior → `j.career_stage = 'junior'`

**StopWords:** Added 포지션, 레벨, 수준 to prevent keyword leak when users say "시니어 포지션" or "미드 레벨".

### Documentation
- SKILL.md v2.7 → v2.8: Added Employment Type Filter and Career Stage Filter tables
- tracker-agent.md v3.4 → v3.5: Added 8 new filter patterns to NLP query mapping table

## Test Results

```
66/66 NLP parser tests passed
1050/1050 total tests passed (+10 from 1040)
0 regressions
```

### New Test Cases

| ID | Input | Filters |
|---|---|---|
| 57 | 정규직 공고 있어? | employment_type = 'regular' |
| 58 | 계약직 관심 공고 | status = 'interested' + employment_type = 'contract' |
| 59 | 인턴 공고 | employment_type = 'intern' |
| 60 | 정규직 서울 공고 | employment_type = 'regular' + location LIKE '%서울%' |
| 61 | 시니어 포지션 있어? | career_stage = 'senior' |
| 62 | 주니어 공고 | career_stage = 'junior' |
| 63 | 미드 레벨 관심 공고 | career_stage = 'mid' + status = 'interested' |
| 64 | 리드 포지션 서울 | career_stage = 'lead' + location LIKE '%서울%' |
| 65 | 정규직 시니어 카카오 공고 | employment_type + career_stage + company (3 filters) |
| 66 | 프리랜서 공고 있어? | employment_type = 'freelance' |

## Impact

Users can now naturally query by employment type and career stage. These fields were stored in the DB since EXP-086 and EXP-091 but were completely invisible to the NLP query parser. Now queries like "정규직 시니어 카카오 공고" generate proper composite SQL filters across all three dimensions.
