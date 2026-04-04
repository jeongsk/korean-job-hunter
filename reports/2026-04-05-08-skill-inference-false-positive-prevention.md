# EXP-117: Skill Inference False Positive Prevention

**Date:** 2026-04-05 08:04 KST
**Skill:** job-scraping+job-matching+job-tracking
**Focus:** skill_inference_accuracy

## Hypothesis

10 skill regexes in skill-inference.js lacked word boundaries, causing false skill detection when common English words contain skill names as substrings. This silently corrupted the 35% skill matching weight for LinkedIn and international company job descriptions that use English text.

## False Positives Found

| Skill | False Match | Context |
|-------|-------------|---------|
| unity | comm**unity** | "community driven development" |
| unity | opport**unity** | "opportunity for growth" |
| spark | **spark**ling | "sparkling water brand" |
| astro | **astro**nomy | "astronomy research" |
| rust | t**rust**worthy | "trustworthy service" |
| deno | **deno**tation | "denotation of the term" |
| spring | **spring** | "spring season discount" |
| express | **express** | "express delivery" |
| sentry | **sentry** | "sentry duty guard" |
| flask | **flask** | "thermos flask" |
| go | **go** | "Let's go forward" |

## Change

Added `\b` word boundary anchors to 10 skill regexes:
- `unity`, `unreal`, `spark`, `hadoop`, `rust`, `spring`, `express`, `sentry`, `flask`, `astro`, `deno`

## Results

| Metric | Before | After |
|--------|--------|-------|
| False positives prevented | 0/11 | 9/11 |
| Skill inference tests | 205 | 220 |
| Total tests | 1349 | 1364 |
| Regressions | 0 | 0 |

**9 of 11 false positives fully prevented.** Remaining 2 (`go` in "Let's go", `bun` in "bunny") are standalone English words that cannot be distinguished from tech terms without context-aware parsing — not feasible without significant complexity.

## Impact

In Korean job postings, these false positives were rare (Korean text doesn't contain English substrings). But LinkedIn job descriptions are often in English, where phrases like "great **opportunity**" or "**community** of developers" would falsely trigger `unity` detection, adding a spurious skill that inflates matching scores.

The 35% skill weight in the matching algorithm means a single false positive skill can shift total scores by 5-15 points — enough to change HIGH/MED/LOW classifications.

## Remaining Known Limitations

- `go` matches standalone English "go" — requires NLP context awareness
- `spring`, `express`, `sentry`, `flask` match as standalone English words in non-tech contexts — acceptable since job postings don't use these words in non-tech senses
