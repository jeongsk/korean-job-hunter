---
description: "Analyze match between your resume and collected job postings using optimized weights"
argument-hint: "--top <N> | --job-id <id> [--remote-only]"
---

Use the matcher-agent to analyze how well your resume matches collected job postings.

## Arguments

$ARGUMENTS

## Scoring Weights (v2 — autoresearch optimized)

| Component | Weight |
|-----------|--------|
| Skill match | **50%** |
| Experience | **15%** |
| Preferred quals | 10% |
| Work type | 15% |
| Commute | **10%** |

## Modes

### --top N
Score all jobs, show top N results.

### --job-id <id>
Detailed analysis for a specific job with full breakdown.

### --remote-only
Only match remote or hybrid jobs.

## Examples

```
/job-match --top 10
/job-match --job-id abc123
/job-match --top 10 --remote-only
/job-match --top 5 --min-score 70
```
