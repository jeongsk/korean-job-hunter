# EXP-097: AI/LLM Skill Coverage + ML Regex Fix

**Date**: 2026-04-04
**Skill**: job-matching + skill-inference
**Verdict**: ✅ Keep

## Hypothesis
1. The `machine learning` regex `/ml(?=\s|$)/i` falsely matches "html" and "xml" because "ml" appears at the end of these words
2. AI/LLM skills (LLM, RAG, LangChain, MLOps, vector databases, fine-tuning, HuggingFace, prompt engineering, stable diffusion, computer vision, NLP) are missing from skill-inference.js despite being very common in the 2026 Korean job market

## Changes

### 1. Fixed ML Regex False Positive
- Old: `/machine\s*learning|ml(?=\s|$)/i` → matches "html", "xml"
- New: `/machine\s*learning|(?<![a-z])ml(?=\s|엔지니어|개발자|모델|engineer|$)/i` → requires word boundary before "ml", and supports Korean context words (ML 엔지니어, ML 개발자, ML 모델)

### 2. Added 11 New AI/LLM Skills
| Skill | English Pattern | Korean Pattern |
|---|---|---|
| LLM | LLM, Large Language Model | - |
| RAG | RAG | 검색증강생성 |
| LangChain | LangChain | 랭체인 |
| MLOps | MLOps | 엠엘옵스 |
| Vector Database | Pinecone, Weaviate, Chroma DB, Milvus, Vector DB | 벡터 DB |
| Fine-tuning | Fine-tuning, FineTuning | 파인튜닝, 미세조정 |
| HuggingFace | HuggingFace, Hugging Face | 허깅페이스 |
| Prompt Engineering | Prompt Engineering | 프롬프트 엔지니어 |
| Stable Diffusion | Stable Diffusion | - |
| Computer Vision | Computer Vision | 컴퓨터 비전 |
| NLP | NLP | 자연어 처리 |

### 3. Added Similarity Connections
- **TIER2 (75%)**: LLM↔ML↔PyTorch↔TensorFlow, LangChain↔LLM, RAG↔LLM↔Vector DB, CV↔ML, NLP↔ML↔LLM, HuggingFace↔PyTorch↔LLM, MLOps↔ML↔Docker↔K8s
- **TIER3 (25%)**: LLM↔RAG↔HuggingFace, Prompt Engineering↔LLM, Fine-tuning↔PyTorch↔ML, Stable Diffusion↔PyTorch↔CV, Vector DB↔Elasticsearch↔Redis↔MongoDB, MLOps↔Terraform↔CI/CD, LangChain↔Python↔TypeScript

### 4. Added PRIMARY_DOMAINS for AI/LLM
All 13 new skills map to 'python' domain (Python is the primary language for AI/ML), enabling domain alignment penalty for non-Python candidates.

## Results

| Metric | Before | After |
|---|---|---|
| Skill patterns | 77 | 88 |
| Similarity connections | ~50 | 60+ |
| Total tests | 1051 | 1077 |
| ML false positive (html) | ❌ matched | ✅ excluded |
| ML false positive (xml) | ❌ matched | ✅ excluded |
| New test cases | - | +26 |
| Regressions | - | 0 |

## Files Modified
- `scripts/skill-inference.js` — new skills + ML regex fix
- `test_skill_inference.js` — 26 new test cases + assertExcludes helper
- `test_validated_matching.js` — TIER2/TIER3 connections + PRIMARY_DOMAINS
- `skills/job-matching/SKILL.md` — v3.8 with AI/LLM similarity docs
- `agents/matcher-agent.md` — TIER2 descriptions updated
- `agents/resume-agent.md` — skill count updated to 88+
