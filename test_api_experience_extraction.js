#!/usr/bin/env node
// test_api_experience_extraction.js — Tests for extractExperienceRange in API scraper
// EXP-123: Experience range extraction from Wanted API detail descriptions

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

// Inline the function for testing (same as in scrape-wanted-api.js)
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
  if (/자격요건[^]*신입/.test(description)) return '신입';
  return null;
}

const { deriveCareerStage } = require('./scripts/skill-inference');

console.log('🧪 extractExperienceRange tests');

// Basic patterns
console.log('  Basic patterns');
assert(extractExperienceRange('경력 6년 이상의 프론트엔드') === '6년 이상', 'N년 이상');
assert(extractExperienceRange('3~5년 경력') === '3~5년', 'N~M년');
assert(extractExperienceRange('3-5년 경력') === '3~5년', 'N-M년');
assert(extractExperienceRange('10년 이상의 백엔드 경험') === '10년 이상', '10년 이상');
assert(extractExperienceRange('5년차 이상') === '5년차', 'N년차');

// Range with 이상
console.log('  Range with 이상');
assert(extractExperienceRange('3년~5년 이상의 경력') === '3~5년 이상', 'N년~M년 이상');

// 신입 in qualification section
console.log('  신입 detection');
assert(extractExperienceRange('자격요건\n- 신입 가능\n- 열정적인 분') === '신입', '신입 in 자격요건');
assert(extractExperienceRange('우대사항\n신입도 환영') !== '신입', '신입 in 우대사항 not matched');

// Edge cases
console.log('  Edge cases');
assert(extractExperienceRange(null) === null, 'null input');
assert(extractExperienceRange('') === null, 'empty input');
assert(extractExperienceRange('팀과 협업 가능하신 분') === null, 'no experience info');

// Real-world JD snippets
console.log('  Real-world snippets');
assert(extractExperienceRange('자격요건\n- 6년 이상의 프론트엔드 엔지니어링 또는 디자인 실무 경험이 있으신 분') === '6년 이상', 'MGRV-style');
assert(extractExperienceRange('경력 3~5년\nReact 기반 서비스 개발 경험') === '3~5년', '3~5 year range');
assert(extractExperienceRange('자격요건\n- 10년 이상의 소프트웨어 개발 경험\n- 시스템 아키텍처 설계') === '10년 이상', '10+ years');

// Career stage derivation with extracted range
console.log('  Career stage from extracted range');
assert(deriveCareerStage('6년 이상') === 'mid', '6년 이상 → mid');
assert(deriveCareerStage('3~5년') === 'mid', '3~5년 → mid');
assert(deriveCareerStage('10년 이상') === 'senior', '10년 → senior');
assert(deriveCareerStage('1년 이상') === 'junior', '1년 → junior');
assert(deriveCareerStage('신입') === 'entry', '신입 → entry');

console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
