---
description: "Search job postings with keyword, location, remote work, and commute filters"
argument-hint: "--keyword <keyword> [--location <city>] [--remote remote|hybrid|onsite] [--max-commute <minutes>] [--sources wanted,linkedin,jobkorea] [--min-match <score>]"
---

Use the scraper-agent sub-agent to search and collect job postings from specified sources.

## Arguments

$ARGUMENTS

## Default Behavior

- If no --sources specified, search all sources (wanted, jobkorea, linkedin)
- If no --location specified, do not filter by location
- If no --remote specified, include all work types
- If no --max-commute specified, do not filter by commute time
- If --min-match specified, run matcher-agent after scraping to filter by score

## Workflow

1. Parse arguments for keyword, location, sources, remote filter, max-commute, min-match
2. Delegate to scraper-agent with parsed parameters
3. scraper-agent collects postings from each source via Playwright CLI
4. Jobs saved to SQLite database (data/jobs.db)
5. If --min-match specified:
   a. Read resume from data/resume/master.yaml
   b. Delegate to matcher-agent for scoring
   c. Filter results by minimum score
6. Display results in table format:
   ```
   [ID] Source · Company — Title    Match: XX%  Remote: type  Commute: XXmin
   ```

## Examples

```
/job-search --keyword "백엔드" --location "서울"
/job-search --keyword "Node.js" --sources wanted,linkedin --remote remote,hybrid
/job-search --keyword "백엔드" --max-commute 60 --min-match 70
```
