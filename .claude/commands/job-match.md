---
description: "Analyze match between your resume and collected job postings"
argument-hint: "--top <N> | --job-id <id> [--remote-only]"
---

Use the matcher-agent sub-agent to analyze how well your resume matches collected job postings.

## Arguments

$ARGUMENTS

## Modes

### Top-N Match (--top N)
Score and rank all collected jobs, show top N results.
- Reads resume from data/resume/master.yaml
- Scores all jobs in data/jobs.db
- Displays top N with detailed breakdown

### Single Job Match (--job-id <id>)
Detailed analysis for a specific job posting.
- Shows full score breakdown (skill, experience, work type, commute)
- Provides improvement suggestions

### Filters
- --remote-only: Only match remote or hybrid jobs
- --min-score <N>: Only show results with score >= N

## Scoring Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Skill match | 40% | Required/preferred skill alignment |
| Experience | 20% | Years requirement match |
| Preferred quals | 10% | Nice-to-have match |
| Work type | 15% | Remote/hybrid/onsite preference |
| Commute | 15% | Commute time vs max acceptable |

## Workflow

1. Read resume from data/resume/master.yaml
2. If --job-id: Fetch single job from SQLite
   If --top: Fetch all jobs (apply --remote-only filter if specified)
3. Delegate to matcher-agent with resume + jobs data
4. matcher-agent calculates scores per component
5. Save match results to SQLite matches table
6. Display formatted report

## Examples

```
/job-match --top 10
/job-match --job-id abc123
/job-match --top 10 --remote-only
/job-match --top 5 --min-score 70
```
