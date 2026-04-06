# EXP-148: Domain Coverage for 8 Missing Skills

**Date:** 2026-04-07
**Skill:** job-matching
**Status:** ✅ Kept

## Problem

8 skills present in `SKILL_MAP` had no entry in `PRIMARY_DOMAINS`, causing domain overlap detection to fail silently:

| Skill | Expected Domain | Impact |
|-------|----------------|--------|
| vitest | js/ts | Testing framework jobs missed JS domain check |
| dynamodb | cloud | AWS-heavy jobs missed cloud domain check |
| cloudwatch | cloud | AWS monitoring jobs missed cloud domain check |
| mybatis | java | Java persistence jobs missed Java domain check |
| msa | java | Microservice architecture jobs missed Java domain check |
| opensearch | data | Search infrastructure jobs missed data domain check |
| celery | python | Python async task jobs missed Python domain check |
| webflux | java | Reactive Java jobs missed Java domain check |

## Fix

Added 8 skill→domain mappings to `PRIMARY_DOMAINS` in `test_validated_matching.js` and corresponding entries in `DOMAIN_MAP` in `tests/run-match-tests.js`.

## Results

- **Before:** 127/128 tests passed, 1 failed (domain coverage check)
- **After:** 128/128 tests passed, 0 failed
- **Full suite:** 1898/1898 passed, 0 failed (was 1897+1)

## Domain Coverage

- Before: 114/122 skills mapped (93.4%)
- After: 122/122 skills mapped (100%)
