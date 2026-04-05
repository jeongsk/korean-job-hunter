# Report: Issue #1 — Wanted.co.kr 403 Bot Detection Fix
**Date:** 2026-04-05
**Issue:** [jeongsk/korean-job-hunter#1](https://github.com/jeongsk/korean-job-hunter/issues/1)

## Problem
Wanted.co.kr returned 403 Forbidden on both browser automation and direct scraping attempts, blocking the job-scraping skill from collecting Wanted listings.

## Root Cause
Wanted's search page is protected by CDN-level bot detection (likely Cloudflare). However, their internal JSON API endpoints (`/api/chaos/search/v1/results`, `/api/v1/jobs/{id}`) remain publicly accessible without authentication.

## Solution
Created `scripts/scrape-wanted-api.js` — a Node.js script that directly calls Wanted's JSON API, completely bypassing browser automation and 403 issues.

### Key Features
- **Search API**: Structured JSON with company name, location, employment type already parsed
- **Detail API**: Full JD text, geo coordinates for commute calculation
- **Skill extraction**: Pattern matching from JD description text
- **Flags**: `--keyword`, `--limit`, `--offset`, `--details`

### SKILL.md Changes
- Added API-based scraping as PRIMARY method for Wanted
- Updated fallback chain: API → browser → web_fetch → web_search
- Documented API endpoints and response structures

## Testing
- ✅ "프론트엔드" search: 344 results returned successfully
- ✅ Detail page: Full JD + skills extraction confirmed
- ✅ No 403 errors

## Commit
`569c722` — pushed to main
