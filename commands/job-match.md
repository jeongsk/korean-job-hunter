---
description: "Analyze match between your resume and collected job postings using optimized weights"
argument-hint: "--top <N> | --job-id <id> [--remote-only]"
---

Use the matcher-agent to analyze how well your resume matches collected job postings.

## Arguments

$ARGUMENTS

## Scoring Weights (v4 — EXP-017 + EXP-021 + EXP-024 validated)

| Component | Weight | Method |
|-----------|--------|--------|
| Skill match | **35%** | Tiered semantic matching + skill gate + domain alignment |
| Experience fit | **25%** | Range overlap with upper-bound consideration |
| Company culture fit | 15% | Keyword extraction from job description |
| Career stage alignment | 15% | Seniority level comparison |
| Location/work fit | 10% | Work type + location preference match |

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
