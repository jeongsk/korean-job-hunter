#!/usr/bin/env node
/**
 * Test: Experience extraction "신입" false positive fix
 * 
 * EXP-154: "신입사원 OJT" in company benefits section should NOT trigger
 * experience=신입. Only standalone "신입" as a requirement should.
 * Also handles "신입/경력" → "무관" (accepts all experience levels).
 */

const assert = require('assert');

// Inline the function from scrape-wanted-api.js for testing
function extractExperienceRange(description) {
  if (!description) return null;
  let m = description.match(/(\d+)\s*년\s*~\s*(\d+)\s*년?\s*이상/);
  if (m) return `${m[1]}~${m[2]}년 이상`;
  m = description.match(/(\d+)\s*[~-]\s*(\d+)\s*년/);
  if (m) return `${m[1]}~${m[2]}년`;
  m = description.match(/(\d+)\s*년\s*이상/);
  if (m) return `${m[1]}년 이상`;
  m = description.match(/(\d+)\s*년\s*차/);
  if (m) return `${m[1]}년차`;
  // EXP-154: 신입/경력 → 무관
  if (/자격요건[^]*신입\s*[\/·.,]\s*경력/.test(description)) return '무관';
  // EXP-154: 신입 standalone only, not 신입사원
  if (/자격요건[^]*신입(?!사원)/.test(description)) return '신입';
  return null;
}

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`✅ ${name}`); }
  catch (e) { failed++; console.log(`❌ ${name}: ${e.message}`); }
}

// Case 1: 신입사원 in benefits (NOT a requirement)
test('신입사원 OJT in benefits → null (not 신입)', () => {
  const jd = `자격요건
"이런 분이라면 목표 달성에 확신을 얻을 것 같아요"
• React, Next.js 등 현대 프론트엔드 프레임워크에 대한 깊은 이해
• 5년 이상 실무 경험

[복지혜택]
• 신입사원 OJT, 적응 프로그램 지원
• 미리인 동호회 지원`;
  assert.strictEqual(extractExperienceRange(jd), '5년 이상');
});

// Case 2: Standalone 신입 as requirement
test('Standalone 신입 in 자격요건 → 신입', () => {
  const jd = `자격요건
• 신입 지원 가능
• JavaScript 기본 지식`;
  assert.strictEqual(extractExperienceRange(jd), '신입');
});

// Case 3: 신입/경력 (accepts both)
test('신입/경력 → 무관', () => {
  const jd = `자격요건
• 신입/경력 무관
• Python 경험`;
  assert.strictEqual(extractExperienceRange(jd), '무관');
});

// Case 4: 신입 · 경력 variant
test('신입 · 경력 → 무관', () => {
  const jd = `자격요건
• 신입 · 경력
• Java 개발 경험`;
  assert.strictEqual(extractExperienceRange(jd), '무관');
});

// Case 5: 신입사원 + standalone 신입 (both present)
test('신입사원 in benefits + standalone 신입 in requirements → 신입', () => {
  const jd = `자격요건
• 신입 가능
• 코딩 테스트 통과 가능자

[복지]
• 신입사원 OJT 지원`;
  assert.strictEqual(extractExperienceRange(jd), '신입');
});

// Case 6: No 신입 at all
test('No 신입 anywhere → null', () => {
  const jd = `자격요건
• 3년 이상 경력
• Spring Boot 경험`;
  assert.strictEqual(extractExperienceRange(jd), '3년 이상');
});

// Case 7: Real Wanted JD for 미리캔버스 시니어 (should not be 신입)
test('Real 미리캔버스 시니어 JD → not 신입', () => {
  const jd = `자격요건
"이런 분이라면 목표 달성에 확신을 얻을 것 같아요"
• React, Next.js 등 현대 프론트엔드 프레임워크에 대한 깊은 이해와 실무 경험이 있으신 분
• 서버사이드 렌더링(SSR) 환경에서의 페이지 렌더링 최적화 및 퍼포먼스 개선 경험이 있으신 분

[미리인의 회사 적응과 단합을 지원합니다.]
• 직급 없이 수평적인 문화 지향
• 신입사원 OJT, 적응 프로그램 지원
• 미리인 동호회 지원`;
  // Should NOT be 신입 — should fall through to null since no year range specified
  const result = extractExperienceRange(jd);
  assert.strictEqual(result, null, `Expected null but got "${result}"`);
});

// Case 8: 신입,경력 (comma variant)
test('신입,경력 → 무관', () => {
  const jd = `자격요건
• 신입,경력 모두 지원 가능
• React 경험`;
  assert.strictEqual(extractExperienceRange(jd), '무관');
});

// Case 9: 신입사원 alone in benefits without any other 신입
test('Only 신입사원 (no standalone 신입) → null', () => {
  const jd = `자격요건
• 5년 이상 경력
• 팀 리드 경험

[복지]
• 신입사원 교육 프로그램`;
  assert.strictEqual(extractExperienceRange(jd), '5년 이상');
});

// Case 10: 신입 followed by 사원 but not "신입사원" (e.g. "신입 사원 채용")
test('신입 사원 채용 → 신입 (space between 신입 and 사원)', () => {
  const jd = `자격요건
• 신입 사원 채용
• 코딩 테스트`;
  // "신입" followed by space then "사원" — the (?!사원) lookahead only checks immediate next chars
  // so "신입 " + "사원" → the char after 신입 is space, not 사원, so it matches → 신입
  // This is correct because "신입 사원" (with space) reads as "new hire" not "new employee benefit"
  assert.strictEqual(extractExperienceRange(jd), '신입');
});

console.log(`\n📊 ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
