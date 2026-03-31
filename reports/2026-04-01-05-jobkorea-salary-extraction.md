# EXP-046: JobKorea Salary Extraction

**Date:** 2026-04-01 (KST) / 2026-03-31 20:04 UTC
**Skill:** job-scraping
**Metric:** salary field extraction for JobKorea source

## Problem

JobKorea cards often include salary information (`연봉 5000~8000만원`, `월급 300~500만원`, `면접후결정`), but the positional line parser never classified or extracted these lines. The `salary` field was always empty for JobKorea-sourced jobs, despite the DB schema supporting it since EXP-027.

## Hypothesis

Adding a salary line type to the JobKorea classifier (`연봉/월급` + `면접후결정` patterns) will populate the salary field without affecting title/company/experience/location extraction.

## Changes

1. Added salary classifier to line classification:
   - `연봉 \d...` → annual salary
   - `월급 \d...` → monthly salary  
   - `면접후결정` → negotiable/no disclosure
2. Updated return object to include `salary` field
3. Updated SKILL.md v4.1 inline JS extraction code
4. Added 4 new test cases covering: annual range, monthly range, single value, negotiable

## Results

| Metric | Before | After |
|--------|--------|-------|
| JobKorea tests | 11/11 | 15/15 |
| Salary extracted | No | Yes (4 patterns) |
| Salary test cases | 0 | 4/4 |
| All other tests | PASS | PASS |
| Regressions | — | 0 |

## Verdict: KEEP ✅

Clean addition — zero regressions, fills a real data gap. JobKorea salary data now flows into the DB's `salary` column and is queryable via the tracker agent.
