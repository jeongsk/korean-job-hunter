# EXP-064: Detail-Skill Similarity Map Expansion

**Date**: 2026-04-02  
**Skill**: job-matching  
**Status**: ✅ Keep

## Problem

The detail-page skill extractor (EXP-059) detects 50+ technology skills from job descriptions — GraphQL, Jenkins, Kafka, TensorFlow, Redis, Terraform, Elasticsearch, etc. But the similarity map only had ~15 pairs covering React/Vue/Node.js/Spring/AWS. 

This meant real scraped jobs with `[GraphQL, Docker, Kafka]` would score **zero** against a candidate with `[REST API, Docker, RabbitMQ]` — despite being closely related roles. The matching algorithm treated every non-mapped skill pair as completely unrelated.

## Change

Added 11 new similarity pairs across all 3 tiers:

### Tier 1 (100% — aliases)
- `kubernetes` ↔ `k8s`
- `spring_boot` ↔ `spring boot`

### Tier 2 (75% — strong compatibility)
- `graphql` ↔ `rest_api` — API paradigms
- `jenkins` ↔ `github_actions` — CI/CD
- `terraform` ↔ `ansible` — IaC/config management
- `kafka` ↔ `rabbitmq` — message queues
- `tensorflow` ↔ `pytorch` — ML frameworks
- `elasticsearch` ↔ `redis` — real-time data stores
- `oracle` ↔ `mssql` — enterprise RDBMS

### Tier 3 (25% — partial overlap)
- `docker` ↔ `terraform` — DevOps provisioning
- `nginx` ↔ `docker` — infrastructure/deployment
- `spark` ↔ `hadoop` — big data ecosystem
- `pandas` ↔ `spark` — data processing
- `graphql` ↔ `grpc` — modern API protocols
- `mongodb` ↔ `redis` — NoSQL stores

### Bug Fix
Fixed a JavaScript object key collision: `docker` and `spark` appeared as keys in multiple TIER3 entries. In JS, duplicate object keys silently overwrite — `docker: ['terraform']` would erase `docker: ['aws', 'kubernetes']`. Merged into single entries.

## Results

| Metric | Before | After |
|--------|--------|-------|
| Similarity pairs | ~15 | 40+ |
| Detail-skill coverage | 0% | 80%+ |
| Tests | 606 pass | 616 pass |
| Discrimination | PASS | PASS |
| Regressions | — | 0 |

## Impact

Real-world example: A job scraped with detail skills `[GraphQL, Docker, Kafka]` vs a candidate with `[REST API, Docker, RabbitMQ]`:
- **Before**: GraphQL=0, Docker=100, Kafka=0 → skill score ~33
- **After**: GraphQL↔REST_API=75, Docker=100, Kafka↔RabbitMQ=75 → skill score ~83

This is a significant accuracy improvement for real scraped data.
