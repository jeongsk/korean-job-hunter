# EXP-127: NLP Location List Sync with CITIES + Tech Hub Expansion

**Date:** 2026-04-05
**Skill:** job-tracking + job-scraping
**Metric:** nlp_location_coverage

## Hypothesis

Post-process-wanted.js CITIES regex had 28 locations (including 세종, 여의도, 신촌, 홍대, 건대) that the NLP parser's location list (23 entries) couldn't query. Jobs scraped with location "여의도" or "세종" were invisible to NLP queries like "여의도 공고" or "세종 프론트엔드 공고". Both lists were also missing many Korean tech hub locations.

## Change

1. Synced NLP parser location list with CITIES regex (added 5 missing locations).
2. Added 20 new Korean tech hub locations to both NLP parser and CITIES regex: 동탄, 청주, 천안, 양재, 논현, 신사, 삼성, 방배, 광화문, 을지로, 종로, 시흥, 안양, 안산, 평택, 파주, 김포, 창원, 포항.
3. Added 59 test cases verifying all CITIES locations are NLP-queryable, including negation and multi-filter queries.

## Results

| Metric | Before | After |
|--------|--------|-------|
| NLP locations | 23 | 48 |
| CITIES locations | 28 | 48 |
| CITIES→NLP coverage | 82% (23/28) | 100% (48/48) |
| Total tests | 1497 | 1555 |
| Regressions | 0 | 0 |

## Impact

Users can now query jobs by 25 additional Korean locations via natural language: 세종 공고, 여의도 공고, 홍대 리액트 공고, 건대 자바 공고, 신촌 파이썬 공고, 동탄 공고, 천안 백엔드 공고, 창원 공고, 광화문 공고 etc. Previously these locations were extracted by the post-processor and stored in the location column but users could not filter by them in Korean NLP queries. The 5 locations that existed in CITIES but not NLP (세종, 여의도, 신촌, 홍대, 건대) were particularly problematic since jobs scraped with those locations were stored but undiscoverable.
