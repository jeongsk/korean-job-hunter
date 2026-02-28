---
description: "Track job application status — list applications, update status, add memos"
argument-hint: "list | set <job-id> --status <status> [--memo <text>]"
---

Use the tracker-agent sub-agent to manage your job application pipeline.

## Arguments

$ARGUMENTS

## Subcommands

### list
Show all tracked applications grouped by status.
- Displays: job title, company, match score, work type, commute time
- Groups by: interview > applied > applying > interested > offer > rejected > declined

### set <job-id> --status <status> [--memo <text>]
Update the status of a job application.
- Valid statuses: interested, applying, applied, rejected, interview, offer, declined
- Optional memo for notes (e.g., "1차 서류 제출", "면접일: 3/15")

## Application Pipeline

```
interested → applying → applied → interview → offer
                                 → rejected
                       → rejected
                     interview → declined
```

## Workflow

1. Parse subcommand (list/set) and arguments
2. Delegate to tracker-agent
3. tracker-agent executes SQLite CRUD operations on data/jobs.db
4. Display formatted results

## Examples

```
/job-track list
/job-track set abc123 --status applied --memo "1차 서류 제출"
/job-track set abc123 --status interview --memo "면접일: 3/20 14:00"
/job-track set def456 --status interested
```
