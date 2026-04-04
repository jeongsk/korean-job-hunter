# EXP-111: Dedup Skills/Culture MERGE (Union) Enrichment

**Date**: 2026-04-05
**Skill**: job-scraping
**Metric**: dedup_skill_completeness

## Hypothesis

During dedup, `skills` and `culture_keywords` from duplicates were discarded when the keeper already had these fields populated. A Wanted keeper with `skills: "React, TypeScript"` would lose `"AWS, Docker"` from a JobKorea duplicate of the same job. Since skills carry 35% of matching weight, partial skill sets systematically under-scored cross-posted jobs.

## Change

Changed dedup-jobs.js enrichment logic for `skills` and `culture_keywords` from fill-when-empty to **union/merge**:

1. Keeper's existing skills are parsed into a set (case-insensitive)
2. Each duplicate's skills are iterated — new skills are appended
3. Original casing is preserved for keeper's items; new items use duplicate casing
4. Only triggers when there are actually new skills to add (no-op when identical)
5. Same logic applies to `culture_keywords`

Other enrichable fields (employment_type, salary, experience, work_type, etc.) remain fill-when-empty since they don't benefit from unioning.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Dedup skill handling | fill-when-empty only | union/merge |
| Culture keyword handling | fill-when-empty only | union/merge |
| Total tests | 1285 | 1295 |
| Regressions | — | 0 |

## Test Cases Added (10)

- Skills merged when keeper has partial set
- Skills enriched from duplicate when keeper has no skills
- No merge when skills are identical
- Skills merged from multiple duplicates
- Case-insensitive merge prevents duplicates
- Culture keywords merged when keeper has partial set
- Empty duplicate skills ignored
- Original casing preserved from keeper
- Whitespace variations handled
- Null keeper skills get all from dupes

## Impact

When the same job is posted on Wanted (with skill extraction) and JobKorea (with different skill extraction), the dedup keeper now retains ALL extracted skills from all sources. This directly improves matching accuracy for the 35% skill weight component.
