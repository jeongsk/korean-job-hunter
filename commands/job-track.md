---
description: "Track job application status — list applications, update status, add memos"
argument-hint: "list | set <job-id> --status <status> [--memo <text>]"
---

Use the tracker-agent to manage your job application pipeline.

## Arguments

$ARGUMENTS

## Subcommands

### list
Show all tracked applications grouped by status.

### set <job-id> --status <status> [--memo <text>]
Update application status.
Valid statuses: interested, applying, applied, rejected, interview, offer, declined

## Pipeline

```
interested → applying → applied → interview → offer
                                 → rejected
                       → rejected
                     interview → declined
```

## Examples

```
/job-track list
/job-track set abc123 --status applied --memo "1차 서류 제출"
/job-track set abc123 --status interview --memo "면접일: 3/20 14:00"
/job-track set def456 --status interested
```
