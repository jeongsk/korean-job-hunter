# EXP-034: Command File Sync with Validated Agent Behavior

**Date:** 2026-03-31 11:04 KST
**Skill:** commands (job-match, job-track, job-search)
**Metric:** documentation accuracy

## Hypothesis

Command files (user-facing slash command definitions) contain outdated scoring weights and missing features compared to validated agent behavior, causing confusion for both users and agents.

## Issues Found

### job-match.md — Wrong Scoring Weights
| Component | Old (v2) | Actual (v4) |
|-----------|----------|-------------|
| Skill match | 50% | 35% |
| Experience | 15% | 25% |
| Preferred quals | 10% | (removed) |
| Work type | 15% | (→ Culture fit 15%) |
| Commute | 10% | (→ Career stage 15% + Location/work 10%) |

The old weights referenced "Preferred quals", "Work type", and "Commute" — components that no longer exist. The actual algorithm uses Culture fit, Career stage alignment, and Location/work fit (validated through EXP-017, EXP-021, EXP-024).

### job-track.md — Missing Korean NLP Support
EXP-026 added full Korean NLP query parsing (11 test cases), but the command file still only showed `list` and `set` subcommands. Users had no way to know they could type "면접 잡힌 거 있어?" directly.

### job-search.md — Missing Parsed Fields
EXP-025 and EXP-027 added work_type, location, experience, salary, deadline, and reward extraction, but the workflow section didn't document these fields.

## Changes

- **job-match.md**: Updated weights table to v4 (35/25/15/15/10), added method descriptions
- **job-track.md**: Added Korean NLP query section with examples, updated description and argument-hint
- **job-search.md**: Added parsed fields list in workflow step 4

## Results

| Metric | Before | After |
|--------|--------|-------|
| Correct weights in commands | No | Yes |
| Korean NLP documented in track command | No | Yes |
| Parsed fields documented in search command | No | Yes |
| All tests passing | 88/88 | 88/88 |

## Delta

0 test regressions, 3 command files synced with validated behavior.

## Verdict: **keep**
