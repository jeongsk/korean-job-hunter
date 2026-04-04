# EXP-106: MCP Server Schema Sync

**Date:** 2026-04-04
**Skill:** mcp-server (job-scraping + job-tracking + job-matching interface)
**Metric:** Schema field coverage

## Hypothesis

The MCP server (`mcp-server/src/server.ts`) schema and tool definitions were missing 10 columns that the post-processing pipeline populates: `experience`, `salary`, `salary_min`, `salary_max`, `deadline`, `reward`, `culture_keywords`, `skills`, `employment_type`, `career_stage`. Jobs saved via MCP would lose all enriched data, making NLP queries, dedup, matching, and salary-based filtering non-functional for MCP-saved jobs.

## Changes

1. **Schema**: Added all 10 enriched fields to `CREATE TABLE IF NOT EXISTS jobs`
2. **Types**: Expanded `Job` interface with all pipeline fields
3. **INSERT**: Updated `insertJob` prepared statement with full column list
4. **db_save_job tool**: Added all 10 fields to input schema with descriptions
5. **db_search_jobs tool**: Added 7 new filter parameters:
   - `min_salary` / `max_salary` → salary range filtering
   - `location` → partial location match
   - `skills` → partial skills match
   - `experience` → partial experience match
   - `employment_type` → exact match
   - `career_stage` → exact match
   - `deadline_before` → deadline date filtering
6. **db_get_applications**: Returns enriched job fields (salary, skills, experience, deadline, etc.)
7. **db_get_stats**: Added `salary_coverage`, `skills_coverage`, `by_employment_type` metrics
8. **Indexes**: Added `idx_jobs_company` and `idx_jobs_created_at`

## Results

| Metric | Before | After |
|--------|--------|-------|
| Schema columns | 10 | 20 |
| Search filters | 4 | 11 |
| Stats metrics | 4 | 7 |
| Application fields returned | 6 | 17 |
| TypeScript compilation | ✅ | ✅ |
| Tests | 1258 pass | 1258 pass |
| Regressions | 0 | 0 |

## Impact

The MCP server is the external interface for the job hunting pipeline. Previously, any job saved through MCP would have null values for salary, skills, experience, deadline, culture, employment type, and career stage — making the entire enrichment pipeline invisible to MCP consumers. Now all enriched data flows through properly.

## Verdict: KEEP
