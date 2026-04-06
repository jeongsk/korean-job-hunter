#!/usr/bin/env node
/**
 * EXP-128: Korean Skill Alias Keyword Leak Fix Tests
 *
 * Verifies that Korean skill aliases added in EXP-103 (runtimes/ORM/monitoring),
 * EXP-116 (blockchain/security/platform), and EXP-101 (modern web tools) do not
 * leak into title/company LIKE search when used in NLP queries.
 *
 * Also verifies particle-truncated forms (블록체인→블록체, 그라파나→그라파, 패스티파이→패스티파)
 * are properly consumed before particle stripping causes noise.
 */

const { parseKoreanQuery } = require('./scripts/nlp-parser');

const testCases = [
  // EXP-103: Runtimes / ORM / Monitoring / Desktop / Mobile
  { id: 1, input: '데노 공고', expectedSkill: 'deno', note: 'Korean alias for Deno' },
  { id: 2, input: '아스트로 공고', expectedSkill: 'astro', note: 'Korean alias for Astro' },
  { id: 3, input: '패스티파이 공고', expectedSkill: 'fastify', note: 'Particle 이 stripped from 파이→파' },
  { id: 4, input: '코아 공고', expectedSkill: 'koa', note: 'Korean alias for Koa' },
  { id: 5, input: '드리즐 공고', expectedSkill: 'drizzle', note: 'Korean alias for Drizzle' },
  { id: 6, input: '타입오알엠 공고', expectedSkill: 'typeorm', note: 'Korean alias for TypeORM' },
  { id: 7, input: '타우리 공고', expectedSkill: 'tauri', note: 'Korean alias for Tauri' },
  { id: 8, input: '캐패시터 공고', expectedSkill: 'capacitor', note: 'Korean alias for Capacitor' },
  { id: 9, input: '아이오닉 공고', expectedSkill: 'ionic', note: 'Korean alias for Ionic' },
  { id: 10, input: '데이터독 공고', expectedSkill: 'datadog', note: 'Korean alias for Datadog' },
  { id: 11, input: '그라파나 공고', expectedSkill: 'grafana', note: 'Particle 나 stripped from 그라파나→그라파' },
  { id: 12, input: '프로메테우스 공고', expectedSkill: 'prometheus', note: 'Korean alias in stopWords' },

  // EXP-116: Blockchain / Web3
  { id: 13, input: '솔리디티 공고', expectedSkill: 'solidity', note: 'Korean alias for Solidity' },
  { id: 14, input: '블록체인 공고', expectedSkill: 'blockchain', note: 'Particle 인 stripped from 블록체인→블록체' },
  { id: 15, input: '이더리움 공고', expectedSkill: 'ethereum', note: 'Korean alias for Ethereum' },
  { id: 16, input: '웹3 공고', expectedSkill: 'web3', note: 'Korean alias for Web3' },
  { id: 17, input: '스마트컨트랙트 공고', expectedSkill: 'smart contract', note: 'Korean alias for smart contract' },

  // EXP-116: Security
  { id: 18, input: '데브시큐옵스 공고', expectedSkill: 'devsecops', note: 'Korean alias for DevSecOps' },
  { id: 19, input: '사이버보안 공고', expectedSkill: 'cybersecurity', note: 'Korean alias for cybersecurity' },
  { id: 20, input: '모의해킹 공고', expectedSkill: 'penetration testing', note: 'Korean alias for pen testing' },
  { id: 21, input: '침투테스트 공고', expectedSkill: 'penetration testing', note: 'Korean alias for pen testing' },

  // EXP-116: Platform / SRE
  { id: 22, input: '이스티오 공고', expectedSkill: 'istio', note: 'Korean alias for Istio' },
  { id: 23, input: '아르고시디 공고', expectedSkill: 'argocd', note: 'Korean alias for ArgoCD' },
  { id: 24, input: '플랫폼엔지니어링 공고', expectedSkill: 'platform engineering', note: 'Korean alias for platform eng' },

  // Composite queries: Korean skill + company (company filter is expected, not a leak)
  { id: 25, input: '솔리디티 카카오 공고', expectedSkill: 'solidity', expectedCompany: '카카오', allowCompanyFilter: true, note: 'Skill + company composite' },
  { id: 26, input: '블록체인 토스 공고', expectedSkill: 'blockchain', expectedCompany: '토스', allowCompanyFilter: true, note: 'Skill + company composite' },
  { id: 27, input: '그라파나 네이버 공고', expectedSkill: 'grafana', expectedCompany: '네이버', allowCompanyFilter: true, note: 'Skill + company composite' },

  // Negative: ensure non-skill Korean words still work as keyword search
  { id: 28, input: '백엔드 공고', expectedFilters: ["(j.skills LIKE '%node.js%' OR j.skills LIKE '%python%' OR j.skills LIKE '%java%')"], note: 'Role-based skill inference for 백엔드 (OR)' },
];

let passed = 0;
let failed = 0;
const failures = [];

console.log('🧪 EXP-128: Korean Skill Alias Keyword Leak Fix\n');
console.log('='.repeat(70));

for (const tc of testCases) {
  const result = parseKoreanQuery(tc.input);
  let ok = true;
  const issues = [];

  // Check skill filter exists
  if (tc.expectedSkill) {
    const hasSkill = result.filters.some(f => f.includes(`j.skills LIKE '%${tc.expectedSkill}%'`));
    if (!hasSkill) {
      issues.push(`Missing skill filter for '${tc.expectedSkill}'`);
      ok = false;
    }
  }

  // Check company filter exists
  if (tc.expectedCompany) {
    const hasCompany = result.filters.some(f => f.includes(`j.company LIKE '%${tc.expectedCompany}%'`));
    if (!hasCompany) {
      issues.push(`Missing company filter for '${tc.expectedCompany}'`);
      ok = false;
    }
  }

  // Check NO title/company keyword leak for skill words (allow company filter for composite tests)
  const hasLeak = result.filters.some(f => {
    if (f.includes('j.title LIKE')) return true;
    if (f.includes('j.company LIKE') && !tc.allowCompanyFilter) return true;
    if (f.includes('j.company LIKE') && tc.allowCompanyFilter) {
      // Allow if it matches the expected company
      if (tc.expectedCompany && f.includes(tc.expectedCompany)) return false;
      return true;
    }
    return false;
  });
  if (hasLeak && !tc.expectTitleSearch) {
    const leakFilters = result.filters.filter(f => f.includes('j.title LIKE') || f.includes('j.company LIKE'));
    issues.push(`Keyword leak: ${JSON.stringify(leakFilters)}`);
    ok = false;
  }

  // Check title search for non-skill words
  if (tc.expectTitleSearch) {
    const hasTitle = result.filters.some(f => f.includes(`j.title LIKE '%${tc.expectTitleSearch}%'`));
    if (!hasTitle) {
      issues.push(`Expected title search for '${tc.expectTitleSearch}'`);
      ok = false;
    }
  }

  if (ok) {
    console.log(`✅ #${tc.id} "${tc.input}" → [${result.filters.join(', ')}]`);
    passed++;
  } else {
    console.log(`❌ #${tc.id} "${tc.input}"`);
    for (const issue of issues) console.log(`   ${issue}`);
    console.log(`   Got: ${JSON.stringify(result.filters)}`);
    if (tc.note) console.log(`   Note: ${tc.note}`);
    failures.push({ id: tc.id, input: tc.input, issues });
    failed++;
  }
}

console.log('='.repeat(70));
console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✅ All keyword leak tests passed!');
} else {
  console.log(`❌ ${failed} tests failed`);
}
process.exit(failed === 0 ? 0 : 1);
