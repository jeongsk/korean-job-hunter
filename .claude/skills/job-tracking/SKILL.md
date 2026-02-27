---
name: job-tracking
description: "Job application status tracking with SQLite CRUD operations and pipeline management"
---

# Job Tracking Skill

## SQLite CRUD Patterns

### Create Application
```bash
sqlite3 data/jobs.db "INSERT INTO applications (id, job_id, status, memo, updated_at) VALUES (lower(hex(randomblob(16))), '{job_id}', '{status}', '{memo}', datetime('now'))"
```

### Read Applications
```bash
# All applications with job info
sqlite3 -json data/jobs.db "
  SELECT a.*, j.title, j.company, j.work_type, j.commute_min, m.score
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  LEFT JOIN matches m ON a.job_id = m.job_id
  ORDER BY a.updated_at DESC
"

# Filter by status
sqlite3 -json data/jobs.db "SELECT * FROM applications WHERE status = '{status}'"
```

### Update Application
```bash
sqlite3 data/jobs.db "UPDATE applications SET status = '{status}', memo = '{memo}', updated_at = datetime('now') WHERE job_id = '{job_id}'"
```

### Delete Application
```bash
sqlite3 data/jobs.db "DELETE FROM applications WHERE id = '{id}'"
```

## Status Transitions

Valid transitions:
```
interested → applying → applied → interview → offer
                                 → rejected
                       → rejected
                     interview → declined
```

Any status can transition back to `interested` (reset).

## Memo Format Rules

- Plain text, no special characters that break SQL
- Maximum 500 characters
- Escape single quotes: Replace ' with ''
- Include date context when relevant (e.g., "2024-03-15 1차 면접 완료")

## Pipeline Statistics

```bash
sqlite3 data/jobs.db "
  SELECT status, COUNT(*) as count
  FROM applications
  GROUP BY status
  ORDER BY CASE status
    WHEN 'offer' THEN 1
    WHEN 'interview' THEN 2
    WHEN 'applied' THEN 3
    WHEN 'applying' THEN 4
    WHEN 'interested' THEN 5
    WHEN 'rejected' THEN 6
    WHEN 'declined' THEN 7
  END
"
```
