---
description: "Manage your resume — add PDF/YAML, view current profile, set home address"
argument-hint: "add <file-path> | show | set-home <address>"
---

Use the resume-agent to manage your resume profile.

## Arguments

$ARGUMENTS

## Subcommands

### add <file-path>
Add a resume (PDF or YAML). Saves to data/resume/master.yaml.

### show
Display current resume profile.

### set-home <address>
Set home address for commute calculation.
Example: `/job-resume set-home "서울시 마포구 합정동"`

## Examples

```
/job-resume add ./my-resume.pdf
/job-resume add ./resume.yaml
/job-resume show
/job-resume set-home "서울시 마포구 합정동 123-45"
```
