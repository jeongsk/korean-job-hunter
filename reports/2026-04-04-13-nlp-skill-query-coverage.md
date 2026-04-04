# EXP-099: NLP Skill Query 88-Skill Coverage

**Date:** 2026-04-04
**Skill:** job-tracking
**Metric:** nlp_skill_query_coverage

## Hypothesis

NLP skill query patterns in `test_korean_nlp_v3.js` had 42 entries while `skill-inference.js` had 88 skills. 48 skills (55%) were invisible to Korean natural language queries — users couldn't query for Linux, DevOps, Spark, Hadoop, Airflow, BigQuery, Snowflake, Unity, Unreal, Machine Learning, LangChain, LLM, NLP, fine-tuning, prompt engineering, RAG, etc. despite these skills being extracted by post-processors and stored in the `skills` DB column.

## Changes

- Added 48 missing skill patterns to NLP parser with Korean equivalents
- Added Korean stopwords for new skill aliases to prevent keyword leak (리눅스, 데브옵스, 스파크, 머신러닝, 빅쿼리, 자연어처리, etc.)
- 12 new test cases covering infrastructure, data engineering, ML/AI, game engines, and frontend skills
- Updated SKILL.md v2.9 with expanded skill query table

## Results

| Metric | Before | After |
|--------|--------|-------|
| NLP skill patterns | 42 | 90 |
| NLP v3 tests | 66 | 78 |
| Total tests | 1102 | 1114 |
| Regressions | — | 0 |

## Sample Queries Now Working

- "리눅스 공고" → `j.skills LIKE '%linux%'`
- "데브옵스 공고" → `j.skills LIKE '%devops%'`
- "머신러닝 공고" → `j.skills LIKE '%machine learning%'`
- "빅쿼리 쓰는 공고" → `j.skills LIKE '%bigquery%'`
- "유니티 게임 공고" → `j.skills LIKE '%unity%'`
- "랭체인 LLM 공고" → both matched
- "파인튜닝 공고" → `j.skills LIKE '%fine-tuning%'`
- "자연어처리 공고" → `j.skills LIKE '%nlp%'`

## Bug Fixed

Korean keyword leak: multi-character skill aliases like 자연어처리 were not in stopWords, causing them to also generate `(j.title LIKE '%자연어처리%' OR j.company LIKE '%자연어처리%')` alongside the skill filter. Added full-form stopwords.
