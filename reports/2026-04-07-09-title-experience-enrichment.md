# EXP-156: Title-Based Experience Enrichment for API-Scraped Jobs

**Date:** 2026-04-07
**Skill:** job-scraping+job-matching
**Metric:** experience_field_accuracy

## Hypothesis

Wanted API-scraped jobs leave the `experience` field as generic "경력" for most positions, even when the title contains specific year requirements like "백엔드 개발자 (3년 이상)". The career_stage is correctly derived from the title (via `deriveCareerStageFromTitle`), but the raw experience text — used by the matching algorithm's experience scoring component — stays as "경력" (neutral/unknown), causing the experience weight to score inaccurately.

## Root Cause

`parsePosition()` in `scrape-wanted-api.js` derives `experience` only from the API's `is_newbie` flag:
- `isNewbie=true` → "신입가능"
- `isNewbie=false` → "경력"

The Wanted API doesn't return specific year requirements in the search response — those are only available in the full JD description (via `--details` flag). But many job titles already contain this information: "(3년 이상)", "(신입-5년)", "(5-10년)".

## Change

Added title-based experience extraction in `parsePosition()`:
1. **N년 이상**: "백엔드 개발자 (3년 이상)" → experience="3년 이상"
2. **N-M년 range**: "개발자(3-7년)" → experience="3~7년"  
3. **신입-N년 range**: "프론트엔드 개발자(신입-5년)" → experience="신입~5년"

Falls back to existing logic ("경력" or "신입가능") when title has no year information.

Files changed:
- `scripts/scrape-wanted-api.js` — added title year extraction before career_stage derivation
- `agents/scraper-agent.md` — documented EXP-156 experience enrichment
- `test_title_experience_enrichment.js` — 14 new test cases

## Results

| Metric | Before | After |
|--------|--------|-------|
| "백엔드 개발자 (3년 이상)" exp | 경력 | 3년 이상 |
| "개발자(3-7년)" exp | 경력 | 3~7년 |
| "프론트엔드(신입-5년)" exp | 신입가능 | 신입~5년 |
| "Backend Engineer (Java/Kotlin)" exp | 경력 | 경력 (unchanged) |
| Live API hit rate | 0/12 with specific exp | 3/12 with specific exp |

Test suite: 14/14 new tests pass, 139/139 total tests pass, 0 regressions.

## Impact

Jobs with title-embedded year requirements now pass specific experience data to the matching algorithm's experience scoring component (part of the 15% experience weight). Previously these jobs scored neutrally for experience regardless of their actual requirements, making it harder to discriminate between "3년 이상" and "10년 이상" positions.
