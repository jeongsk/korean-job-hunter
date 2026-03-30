# EXP-029: Scraper Agent Prompt Cleanup

**Date:** 2026-03-31
**Skill:** job-scraping
**Focus:** agent-prompt-clarity

## Hypothesis

Trimming scraper-agent.md to workflow/strategy and referencing SKILL.md for detailed extraction code will reduce agent confusion and token cost without changing scraping behavior.

## Changes

- Rewrote scraper-agent.md from **732 → 112 lines** (85% reduction)
- Removed all inline JS extraction code (duplicated from SKILL.md)
- Added explicit instruction: "Read SKILL.md for current extraction code"
- Preserved: extraction strategy overview, field schema, workflow, rate limiting, error handling
- Added: field schema table with source mapping and required flags

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| Lines | 732 | 112 |
| JS code blocks | 6 | 0 |
| Duplicated code (vs SKILL.md) | ~400 lines | 0 |
| Parsing tests | 12/12 | 12/12 ✅ |
| Context extraction tests | 5/5 | 5/5 ✅ |
| Schema tests | 7/7 | 7/7 ✅ |
| NLP query tests | 11/11 | 11/11 ✅ |

## Rationale

The scraper-agent.md contained 6 large JS code blocks that were copied verbatim from `skills/job-scraping/SKILL.md`. This meant:
1. Any fix had to be applied in two places
2. The agent read ~600 lines of code before getting to strategy
3. Same problem EXP-028 solved for matcher-agent (313→162 lines)

The fix: agent now has a clear extraction strategy overview and is told to read SKILL.md for exact code. This ensures a single source of truth for extraction logic.

## Verdict: KEEP ✅

85% line reduction, zero test regressions, single source of truth for extraction code.
