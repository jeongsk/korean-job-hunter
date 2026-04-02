# EXP-081: Dedup Enrichment Preserves Skills and Culture Keywords

**Date:** 2026-04-03
**Skill:** job-scraping
**Metric:** cross_source_dedup_data_loss

## Hypothesis

The `skills` column (added EXP-077) and `culture_keywords` (added EXP-063) are completely absent from `dedup-jobs.js`. During cross-source dedup merge, the entry with richer skills/culture data could be discarded because field scoring doesn't consider these columns. This causes silent data loss — the 35% skill weight in matching and 15% culture weight become unreliable after dedup.

## Change

1. **SQL query**: Added `skills` and `culture_keywords` to SELECT
2. **fieldScore**: Added `skills` at weight +3 (high-value field driving 35% of match score), `culture_keywords` at +1
3. **Enrichment logic**: Before removing duplicates, checks if the keeper is missing any of 7 fields (skills, culture_keywords, salary, deadline, experience, work_type, location). If a duplicate has data for a missing field, copies it to the keeper via UPDATE before DELETE.
4. **SQL injection prevention**: Single quotes in values are escaped

## Baseline

| Metric | Before |
|--------|--------|
| dedup considers skills | No |
| dedup considers culture | No |
| enrichment on merge | No |
| test count | 870 |

## Results

| Metric | After |
|--------|-------|
| dedup considers skills | ✅ |
| dedup considers culture | ✅ |
| enrichment on merge | ✅ (7 fields) |
| new tests | 8 |
| total tests | 878 |
| regressions | 0 |

## Verdict: **KEEP** — Skills and culture data no longer silently lost during dedup merge.
