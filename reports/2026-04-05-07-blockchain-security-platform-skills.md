# EXP-116: Blockchain/Web3, Security, Platform/SRE Skills

**Date**: 2026-04-05
**Skill**: job-matching + job-scraping + job-tracking
**Metric**: skill_coverage
**Verdict**: ✅ Keep

## Hypothesis

13 skills from the Korean job market were completely invisible to the entire pipeline:
- **Blockchain/Web3**: Solidity, blockchain, Web3, Ethereum, smart contract
- **Security**: DevSecOps, OWASP, cybersecurity, penetration testing
- **Platform/SRE**: SRE, platform engineering, Istio, ArgoCD

These skills appear in Korean job postings (e.g., 블록체인 개발자, 정보보안 담당, 모의해킹, SRE 엔지니어) but had zero detection in skill-inference, zero similarity connections, zero domain alignment, and zero NLP query support.

## Changes

1. **skill-inference.js**: Added 13 skills with Korean+English regex (135 total)
2. **test_validated_matching.js**: Added 24 similarity connections + 2 new PRIMARY_DOMAINS (blockchain, security)
3. **scripts/nlp-parser.js**: Added 14 NLP query patterns with Korean equivalents
4. **test_skill_inference.js**: Added 27 test cases covering all new skills
5. Updated SKILL.md v3.12/v6.0, matcher-agent.md v4.8, tracker-agent.md v3.8

## Results

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Skill inference entries | 122 | 135 | +13 |
| Similarity connections | ~180 | ~204 | +24 |
| NLP skill patterns | 119 | 133 | +14 |
| Domain categories | 15 | 17 | +2 |
| Total tests | 1322 | 1349 | +27 |
| Regressions | 0 | 0 | — |

## Key Similarity Connections

- **Blockchain ecosystem**: solidity↔ethereum↔blockchain↔smart contract (TIER2), web3→blockchain (TIER3)
- **Security tools**: devsecops↔docker↔kubernetes↔terraform (TIER3), owasp↔cybersecurity↔penetration testing (TIER3)
- **Platform/SRE**: sre↔kubernetes↔prometheus↔grafana (TIER3), istio↔kubernetes (TIER3), argocd↔kubernetes↔ci/cd (TIER3)

## Korean NLP Query Support

Users can now query:
- 블록체인 공고, 솔리디티 공고, 이더리움 공고, 웹3 공고, 스마트컨트랙트 공고
- 정보보안 공고, 사이버보안 공고, 모의해킹 공고, 데브시큐옵스 공고
- SRE 공고, 플랫폼 엔지니어링 공고, 이스티오 공고, 아르고시디 공고
