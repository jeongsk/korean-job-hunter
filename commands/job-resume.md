---
description: "Manage your resume — add PDF/YAML, view current profile, set home address"
argument-hint: "add <file-path> | show | set-home <address>"
---

Use the resume-agent sub-agent to manage your resume profile.

## Arguments

$ARGUMENTS

## Subcommands

### add <file-path>
Add a resume file (PDF or YAML format).
- PDF files: Text extracted and converted to YAML structure
- YAML files: Validated and saved as master resume
- Saves to data/resume/master.yaml

### show
Display the current resume profile from data/resume/master.yaml.

### set-home <address>
Set your home address for commute time calculation.
- Updates profile.home_address in data/resume/master.yaml
- Example: /job-resume set-home "서울시 마포구 합정동"

## Workflow

1. Parse the subcommand (add/show/set-home) and arguments
2. Delegate to resume-agent with the subcommand and arguments
3. resume-agent handles:
   - add: Parse file, extract data, save to master.yaml
   - show: Read and format master.yaml contents
   - set-home: Update home_address field in master.yaml

## Examples

```
/job-resume add ./my-resume.pdf
/job-resume add ./resume.yaml
/job-resume show
/job-resume set-home "서울시 마포구 합정동 123-45"
```
