---
description: "Search job postings from Wanted, JobKorea, LinkedIn with keyword, location, remote, and commute filters"
argument-hint: "--keyword <keyword> [--location <city>] [--remote remote|hybrid|onsite] [--max-commute <minutes>] [--sources wanted,linkedin,jobkorea] [--min-match <score>]"
---

Use the scraper-agent to search and collect job postings using agent-browser with custom User-Agent.

## Arguments

$ARGUMENTS

## Default Behavior

- No --sources: search all (wanted, jobkorea, linkedin)
- No --location: no location filter
- No --remote: include all work types
- No --max-commute: no commute filter
- --min-match: run matcher-agent after scraping

## Workflow

1. Parse arguments
2. Delegate to scraper-agent
3. scraper-agent uses agent-browser + custom User-Agent for each source:
   - **Wanted**: `a[href*="/wd/"]` selector, text parsing
   - **JobKorea**: `[class*=dlua7o0]` selector, regex parsing
   - **LinkedIn**: `.base-card` selector, h3/h4 extraction
4. Jobs saved to SQLite (data/jobs.db)
5. If --min-match: run matcher-agent for scoring
6. Display results

## Examples

```
/job-search --keyword "백엔드" --location "서울"
/job-search --keyword "Node.js" --sources wanted,linkedin --remote remote,hybrid
/job-search --keyword "백엔드" --max-commute 60 --min-match 70
```
