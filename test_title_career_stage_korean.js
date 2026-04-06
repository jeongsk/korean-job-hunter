#!/usr/bin/env node
/**
 * EXP-147: Korean seniority titles and title-embedded year ranges
 * for career stage detection.
 * 
 * Tests deriveCareerStageFromTitle for Korean organizational titles
 * (조직장, 팀장, 수석, 책임, 선임, etc.) and year ranges embedded
 * in job titles (e.g., "개발자(12년~20년)").
 */

const { deriveCareerStageFromTitle, deriveCareerStage } = require('./scripts/skill-inference');

let passed = 0, failed = 0;

function test(label, actual, expected) {
  if (actual === expected) {
    console.log(`✅ ${label}: ${actual}`);
    passed++;
  } else {
    console.log(`❌ ${label}: got ${actual}, expected ${expected}`);
    failed++;
  }
}

// ── Korean organizational titles (lead level) ──
test('조직장', deriveCareerStageFromTitle('결제 시스템 운영 및 개발 조직장'), 'lead');
test('수석', deriveCareerStageFromTitle('수석 개발자'), 'lead');
test('팀장', deriveCareerStageFromTitle('팀장 백엔드 개발자'), 'lead');
test('파트장', deriveCareerStageFromTitle('파트장'), 'lead');
test('그룹장', deriveCareerStageFromTitle('그룹장'), 'lead');
test('실장', deriveCareerStageFromTitle('실장'), 'lead');
test('본부장', deriveCareerStageFromTitle('본부장'), 'lead');
test('센터장', deriveCareerStageFromTitle('센터장'), 'lead');

// ── Korean seniority titles (senior level) ──
test('책임', deriveCareerStageFromTitle('책임 연구원'), 'senior');
test('선임', deriveCareerStageFromTitle('선임 개발자'), 'senior');

// ── English (existing behavior preserved) ──
test('Lead', deriveCareerStageFromTitle('Lead Engineer'), 'lead');
test('Senior', deriveCareerStageFromTitle('Senior Developer'), 'senior');
test('Junior', deriveCareerStageFromTitle('주니어 개발자'), 'junior');
test('리드', deriveCareerStageFromTitle('프론트엔드 개발 리드'), 'lead');
test('시니어', deriveCareerStageFromTitle('시니어 프론트엔드 개발자'), 'senior');

// ── Title-embedded year ranges (N년~M년 format) ──
test('12년~20년 → lead', deriveCareerStageFromTitle('개발자(12년~20년)'), 'lead');
test('15년~20년 → lead', deriveCareerStageFromTitle('프론트엔드(15년~20년)'), 'lead');

// ── Title-embedded year ranges (N-M년 format) ──
test('5-10년 → senior', deriveCareerStageFromTitle('백엔드 엔지니어(5-10년)'), 'senior');
test('7-12년 → senior', deriveCareerStageFromTitle('백엔드 개발자(7-12년)'), 'senior');

// ── Title-embedded year ranges (junior/mid) ──
test('1년~3년 → junior', deriveCareerStageFromTitle('개발자(1년~3년)'), 'junior');
test('3년~5년 → mid', deriveCareerStageFromTitle('프론트엔드 개발자(3년~5년)'), 'mid');

// ── Title-embedded year minimum ──
test('10년+ → senior', deriveCareerStageFromTitle('개발자 10년+'), 'senior');
test('15년+ → lead', deriveCareerStageFromTitle('시스템 엔지니어 15년+'), 'lead');

// ── Null cases (no seniority info) ──
test('일반 개발자 → null', deriveCareerStageFromTitle('일반 개발자'), null);
test('백엔드 엔지니어 → null', deriveCareerStageFromTitle('백엔드 엔지니어'), null);

// ── False positive prevention ──
test('칠리드레스 → null', deriveCareerStageFromTitle('칠리드레스'), null);

// ── Compound: Korean title + year range ──
test('조직장+years → lead', deriveCareerStageFromTitle('결제 시스템 운영 및 개발 조직장(12년~20년)'), 'lead');

// ── 신입 in range → junior ──
test('신입-5년 → mid (upper bound 5)', deriveCareerStageFromTitle('프론트엔드 개발자(신입-5년)'), 'mid');

// ── Live data validation ──
test('[미리캔버스] 시니어 프론트엔드 개발자 → senior',
  deriveCareerStageFromTitle('[미리캔버스] 시니어 프론트엔드 개발자'), 'senior');
test('프론트엔드 개발 리드 (React Native) → lead',
  deriveCareerStageFromTitle('프론트엔드 개발 리드 (React Native)'), 'lead');

console.log('───────────────────────────────────────────────────');
console.log(`📊 Title Career Stage (Korean + Year Ranges): ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
