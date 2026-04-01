# EXP-054: Cross-Source Dedup Executable Script

**Skill:** job-scraping
**Focus:** pipeline_tooling
**Date:** 2026-04-01

## Hypothesis

The cross-source dedup algorithm (validated in EXP-045 with 13 tests) was only available as test code — no executable pipeline tool existed to actually run dedup after scraping. Creating `scripts/dedup-jobs.js` bridges the gap between tested logic and operational use.

## Changes

1. **`scripts/dedup-jobs.js`** (new, 170 lines): Executable CLI for cross-source dedup
   - Reads all jobs from SQLite
   - Applies fuzzy title+company matching with Korean↔English equivalents (same algorithm as test_cross_source_dedup.js)
   - Field completeness scoring for merge priority (salary=2pts, deadline=2pts, content=2pts, Wanted source=+1pt)
   - Three modes: `--dry-run` (preview), `--json` (programmatic), default (apply)
   - Cascading deletes: removes related matches and applications before deleting duplicate jobs
   - Clear output showing which entries kept/removed

2. **`skills/job-scraping/SKILL.md`**: Updated to v4.3, added CLI usage docs for dedup script
3. **`agents/scraper-agent.md`**: Added step 6 to workflow — run dedup after saving

## Results

| Metric | Before | After |
|--------|--------|-------|
| Dedup pipeline tool | ❌ test-only | ✅ executable CLI |
| SKILL.md CLI docs | SQL only | SQL + CLI commands |
| Scraper workflow dedup step | "merge duplicates" | `node scripts/dedup-jobs.js` |
| Test regressions | — | 0 (all test suites pass) |

## Impact

Agents can now run `node scripts/dedup-jobs.js --dry-run` after multi-source scraping to preview duplicates, then apply with `node scripts/dedup-jobs.js`. This closes the gap between the validated dedup algorithm and actual operational use.
