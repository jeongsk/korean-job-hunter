# EXP-113: AI/ML Korean Equivalents Sync

**Date:** 2026-04-05
**Skill:** job-scraping + job-matching + job-tracking
**Metric:** korean_equivalent_coverage

## Hypothesis

NLP query parser had Korean equivalents for 7 AI/ML skills (머신러닝, 벡터데이터베이스, 벡터디비, 디비티, 다트, 레일즈, 디퓨전) that skill-inference.js was missing. Jobs mentioning these skills in Korean would have empty skill fields, making the 35% skill weight component score 0% despite NLP queries being able to find them.

## Change

Added Korean equivalents to 6 skill patterns in skill-inference.js:
- `machine learning`: +머신러닝, 머신 러닝
- `vector database`: +벡터데이터베이스, 벡터 디비
- `dbt`: +디비티
- `dart`: +다트
- `rails`: +레일즈
- `stable diffusion`: +디퓨전

Also verified that the NLP parser's huggingface → 허깅페이스 was already in skill-inference.

## Results

- **8 new test cases** in test_skill_inference.js
- **Total tests:** 1307 (was 1299), +8
- **Korean equivalent sync:** NLP parser and skill-inference now at parity for all AI/ML skills
- **Regressions:** 0

## Impact

AI/ML jobs scraped from Korean sources now correctly extract skills from Korean text. Previously a job listing "머신러닝 엔지니어" would have empty skills (0% skill weight), while the NLP query "머신러닝 공고" would correctly find it. This asymmetry meant matching scores were artificially low for AI/ML positions described in Korean.
