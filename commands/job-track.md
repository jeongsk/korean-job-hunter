---
description: "Track job application status — Korean NLP queries, list applications, update status, pipeline analytics"
argument-hint: "<korean-query> | list [--status <status>] | set <job-id> --status <status> [--memo <text>]"
---

Use the tracker-agent to manage your job application pipeline. Supports natural Korean queries (EXP-026).

## Arguments

$ARGUMENTS

## Korean NLP Queries

Speak naturally in Korean — the tracker parses intent automatically:
- "면접 잡힌 거 있어?" → shows interview-stage applications
- "지원한 거 중에 카카오 빼고" → applied, excluding 카카오
- "재택 관심 공고 점수순" → remote interested jobs by match score
- "탈락한 거 빼고 다 보여줘" → all except rejected
- "합격한 곳" → offers received
- "백엔드 관심 공고" → interested jobs with '백엔드' in title/company

## Subcommands

### list [--status <status>]
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
/job-track 면접 잡힌 거 있어?
/job-track 지원한 거 중에 카카오 빼고
/job-track 재택 관심 공고 점수순
/job-track list
/job-track set abc123 --status applied --memo "1차 서류 제출"
/job-track set abc123 --status interview --memo "면접일: 3/20 14:00"
/job-track set def456 --status interested
```
