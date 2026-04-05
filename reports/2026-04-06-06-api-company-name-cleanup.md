# EXP-138: API Company Name Cleanup

**Date:** 2026-04-06 08:04 KST
**Skill:** job-scraping
**Metric:** company_name_accuracy

## Hypothesis

Wanted API returns company names with Korean legal entity prefixes — `(주)카카오`, `주식회사 토스`, `㈜배달의민족`. The `parsePosition()` function used `pos.company?.name` raw without any cleanup. These prefixes break:

1. **Dedup**: `(주)카카오` ≠ `카카오` — same company posts on Wanted and JobKorea with different name formats, cross-source dedup fails
2. **NLP queries**: `카카오 공고 있어?` generates `LIKE '%카카오%'` which wouldn't match if stored as `(주)카카오`
3. **Matching**: Company preference alignment is affected by inconsistent names

The browser-based scraper (parse-wanted.js) already strips these via the post-processor's company cleanup logic, but the API path bypassed all cleanup.

## Change

Added `cleanCompanyName()` to scrape-wanted-api.js with 5 prefix patterns:
- `㈜` (enclosed Korean legal entity character)
- `(주)` (주식회사 abbreviation)
- `주식회사` (full form, with or without trailing space)
- `유한회사` (limited liability company)
- `(유)` (유한회사 abbreviation)

Returns `'회사명 미상'` for null/empty/prefix-only inputs.

Updated `parsePosition()` from:
```js
const company = pos.company?.name || '회사명 미상';
```
to:
```js
const company = cleanCompanyName(pos.company?.name);
```

## Results

| Metric | Before | After |
|--------|--------|-------|
| `(주)카카오` | stored as-is | `카카오` ✅ |
| `주식회사 토스` | stored as-is | `토스` ✅ |
| `㈜배달의민족` | stored as-is | `배달의민족` ✅ |
| Prefix-only input | `(주)` | `회사명 미상` ✅ |
| New test cases | 0 | 17 |
| Regressions | 0 | 0 |

## Why This Matters

Wanted API returns ~90% of company names with `(주)` prefix. Without cleanup, company-based NLP queries, cross-source dedup, and company preference matching were all broken for API-sourced jobs.

## Verdict: KEEP ✅

17 new tests, 0 regressions.
