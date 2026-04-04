# EXP-114: LinkedIn Skill Extraction via Shared Module

**Date:** 2026-04-05 05:04 KST
**Skill:** job-scraping
**Metric:** linkedin_skill_extraction_coverage

## Hypothesis

LinkedIn post-processor imported `inferSkills` from shared `skill-inference.js` (122 skills) but called its own `inferSkillsFromText` function with an inline `TECH_PATTERNS` array (52 patterns) — a remnant from EXP-070 before the shared module was fully built out.

This meant 70+ skills were invisible to LinkedIn skill extraction:
- **Data**: Snowflake, Airflow, dbt, BigQuery
- **DB**: PostgreSQL, Redis, MongoDB
- **Infra**: Linux, CI/CD, Prometheus, Grafana, Sentry, DevOps
- **Frontend**: Tailwind, Vite, Pinia, Svelte
- **ML**: PyTorch, HuggingFace, LangChain, RAG, Fine-tuning, Computer Vision, NLP
- **Modern stack**: Deno, Prisma, Supabase, TRPC, Hono, Firebase, Storybook
- **Korean equivalents**: 텐서플로우, 파이토치, 머신러닝, 리눅스, etc.

Quantified: 10 test cases showed LinkedIn extracted 10 skills vs shared module's 39 — a **74% miss rate**.

## Change

Single-line fix in `parseLinkedInCard`:
```javascript
// Before (EXP-070):
const skills = inferSkillsFromText(title, description);

// After (EXP-114):
const skills = inferSkills(`${title} ${description}`);
```

Kept `inferSkillsFromText` as exported function for backward compatibility. Updated 2 existing test assertions (`nodejs`→`node.js`, `nextjs`→`next.js`) to match shared module naming. Added 8 new test cases.

## Results

| Metric | Before | After |
|--------|--------|-------|
| LinkedIn skill patterns | 52 (inline) | 122 (shared) |
| Skill miss rate | 74% | 0% |
| Korean equivalent support | None | Full |
| Total tests | 1307 | 1315 |
| Regressions | — | 0 |

## Test Cases Added (EXP-114)

- `EXP114-001`: Snowflake, Airflow, dbt, BigQuery from description
- `EXP114-002`: PostgreSQL, Redis, Linux, Docker
- `EXP114-003`: Modern web tools (Tailwind, Vite, Pinia, Vue)
- `EXP114-004`: ML ecosystem (PyTorch, HuggingFace, LangChain, RAG)
- `EXP114-005`: Monitoring (Prometheus, Grafana, Sentry, CI/CD)
- `EXP114-006`: Modern stack (Deno, Prisma, Supabase, TRPC)
- `EXP114-007`: Korean equivalents (머신러닝, 텐서플로우, 파이토치)
- `EXP114-008`: NLP/Computer Vision/Fine-tuning

## Impact

LinkedIn-sourced jobs were systematically under-scoring on the 35% skill matching weight because most of their extractable skills were silently dropped. A LinkedIn job requiring Snowflake, Airflow, and dbt would show 0 skill matches against a candidate with those exact skills. This also enables Korean skill extraction from LinkedIn descriptions for the first time (previously only English patterns worked).
