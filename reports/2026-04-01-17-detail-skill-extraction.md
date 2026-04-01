# EXP-059: Detail-Page Skill Extraction from Job Descriptions

**Date:** 2026-04-01  
**Skill:** job-scraping  
**Metric:** skill_extraction_coverage  
**Verdict:** ✅ KEEP

## Hypothesis

Title-based skill inference (EXP-052) only extracts from job titles. Detail pages contain rich qualification/requirements text with explicit technology mentions (Java, Kotlin, Spring Boot, MySQL, etc.) that provides significantly better skill data for the matching algorithm. Extracting skills from detail page body text closes this gap.

## What Changed

Created `test_detail_skill_extraction.js` with 50+ skill patterns covering:
- **Languages**: Java, Kotlin, Python, TypeScript, Go, Rust, C++, C#, Swift, Ruby, PHP, Scala, Dart
- **Frameworks**: React, Vue, Angular, Next.js, Node.js, Express, Spring/Spring Boot, Django, Flask, FastAPI, Flutter, SwiftUI, NestJS, React Native
- **Databases**: MySQL, PostgreSQL, MongoDB, Redis, Elasticsearch, Oracle, MSSQL
- **Infrastructure**: AWS, GCP, Azure, Docker, Kubernetes, Terraform, Jenkins, GitHub Actions, Nginx, Kafka, RabbitMQ
- **Data/ML**: TensorFlow, PyTorch, Pandas, Spark, Hadoop

Key features:
- Korean equivalent handling (파이썬→Python, 도커→Docker, 쿠버네티스→Kubernetes)
- Java≠JavaScript disambiguation via negative lookahead
- Spring vs Spring Boot distinction (compound `also` pattern for "Spring Framework")
- React Native vs React (both kept as distinct skills)

Updated SKILL.md v4.5 and scraper-agent.md with detail-page extraction workflow and skill priority chain.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Detail skill patterns | 0 | 50+ |
| Detail extraction tests | 0 | 12/12 |
| Live Wanted validation | ❌ | ✅ (누리미디어 백엔드: 7 skills extracted) |
| Total tests | 511 | 523 |
| Regressions | — | 0 |

## Live Validation

Tested against actual Wanted detail page (누리미디어 백엔드 개발자):
- Text contained: Java, Kotlin, Spring Framework/Spring Boot, REST API, MySQL, PostgreSQL, MSSQL
- Extracted: `java, kotlin, mssql, mysql, postgresql, rest_api, spring_boot` ✅

## Impact on Matching

Previously, a backend job listing without explicit skill tags would get title-inferred skills (EXP-052) or default to neutral score. With detail extraction, the matching algorithm gets 7+ explicit skills from the qualification section, dramatically improving discrimination accuracy.
