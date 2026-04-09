# EXP-177: Leadership Role Skill Inference

**Date:** 2026-04-10
**Skill:** job-scraping+job-matching
**Metric:** skill_extraction_accuracy

## Hypothesis

Leadership role titles (CTO, CPO, VP Engineering, Engineering Manager, 연구소장, 기술이사, 개발총괄, Tech Lead) are common in Korean job postings (especially Wanted and LinkedIn) but return empty skills from ROLE_SKILL_MAP. Live Wanted API scrape shows 7/12 CTO-related jobs with zero skills despite being tech leadership positions.

## Changes

1. Added 10 leadership role entries to ROLE_SKILL_MAP in skill-inference.js:
   - CTO/Chief Technology → aws, docker, kubernetes, python, java (broad tech leadership)
   - CPO → figma, react, typescript (product leadership)
   - VP Engineering → aws, docker, kubernetes, python, java
   - Engineering Manager → aws, docker, kubernetes
   - 연구소장 → python, tensorflow, docker (research leadership)
   - 기술이사/개발총괄/기술 총괄 → aws, docker, kubernetes
   - Tech Lead/Engineering Lead → python, java, aws, docker

2. Created test_leadership_role_skills.js with 12 test cases.

## Results

| Metric | Before | After |
|--------|--------|-------|
| CTO skills | [] | aws, docker, kubernetes, python, java |
| CTO (AI) skills | python, tensorflow, pytorch | + aws, docker, kubernetes, java |
| 연구소장 skills | [] | python, tensorflow, docker |
| Engineering Manager | [] | aws, docker, kubernetes |
| No-skill CTO jobs | 7/12 | 0/5 tech CTOs |
| Total tests | 2010+ | 2022+ |
| Regressions | — | 0 |

## Impact

CTO and tech leadership jobs now get meaningful skills from the 35% skill matching weight. Previously all CTO positions scored 0% on skills regardless of the tech stack. The remaining no-skill jobs (Creative Director, Account Director, HRBP) are genuinely non-technical and correctly return empty.

Non-technical roles (product manager, project manager, creative director) remain empty — no false positives.
