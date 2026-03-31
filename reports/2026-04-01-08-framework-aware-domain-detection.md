# EXP-049: Framework-Aware Domain Detection

**Date**: 2026-04-01
**Skill**: job-matching
**Metric**: domain alignment coverage

## Problem

The `PRIMARY_DOMAINS` map only mapped raw programming languages (Python, Java, JavaScript, etc.) to domains. Frameworks like Spring, Django, React, Express, Next.js were unmapped.

**Real impact**: A Korean job listing `[Spring, Spring Boot, MySQL]` for a JS/React candidate had **zero domain detection** → no 40% domain alignment penalty, because "Spring" wasn't in the domain map. The `jobDomains.size === 0` fallback returned `true` (no penalty), even though this is clearly a Java-domain job.

This is common in Korean job listings — many list only framework names without the underlying language.

## Hypothesis

Mapping frameworks to their parent language domain in `PRIMARY_DOMAINS` catches cross-domain mismatches in framework-only listings.

## Changes

### PRIMARY_DOMAINS expanded (9 → 24 entries)

**New language entries**: Kotlin→java, Dart→dart, Ruby→ruby, PHP→php

**Framework→domain mappings**:
- Spring/Spring Boot → java
- Django/Flask/FastAPI → python
- React/Next.js/Vue/Nuxt.js/Svelte/Express/NestJS/Node.js → js/ts
- Flutter → dart
- Laravel → php
- Rails/Ruby on Rails → ruby
- SwiftUI → swift
- .NET/ASP.NET → c#

### Test additions (6 new tests)

| Job Skills | Candidate Skills | Overlap? | Why |
|---|---|---|---|
| [Spring, Spring Boot, MySQL] | [React, TypeScript] | ❌ No | Java frameworks vs JS |
| [Django, PostgreSQL] | [Python, Flask] | ✅ Yes | Same python domain |
| [React, Next.js] | [Vue, JavaScript] | ✅ Yes | Same js/ts domain |
| [Express, MongoDB] | [Java, Spring] | ❌ No | js/ts vs java |
| [Flutter] | [React, TypeScript] | ❌ No | dart vs js/ts |
| [Laravel, MySQL] | [Express, Node.js] | ❌ No | php vs js/ts |

## Results

- **Test count**: 27 → 33 (+6 new, 0 regressions)
- **All 21 test suites**: PASS
- **Discrimination rules**: Still valid (HIGH≥70, gap≥15, LOW≤25)

## Files Updated

- `test_validated_matching.js` — expanded PRIMARY_DOMAINS, added 6 framework tests
- `skills/job-matching/SKILL.md` — updated domain detection docs
- `agents/matcher-agent.md` — added framework→domain mapping table, new domains
