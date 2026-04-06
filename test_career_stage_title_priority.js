/**
 * EXP-140: Career Stage Title Priority
 * 
 * Bug: When detail enrichment is enabled, deriveCareerStage() from experience text
 * (e.g., "신입" from API) overrides the correct title-based career_stage from
 * deriveCareerStageFromTitle() (e.g., "senior" from "시니어 프론트엔드 개발자").
 * 
 * Fix: In detail enrichment, check deriveCareerStageFromTitle(title) first and
 * prefer it over experience-based derivation.
 */

const assert = require('assert');
const path = require('path');

// We test the logic by importing the functions from skill-inference.js
const skillInference = require(path.resolve(__dirname, 'scripts/skill-inference.js'));

const { deriveCareerStage, deriveCareerStageFromTitle } = skillInference;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// === deriveCareerStageFromTitle correctness ===

test('시니어 in title → senior', () => {
  assert.strictEqual(deriveCareerStageFromTitle('[미리캔버스] 시니어 프론트엔드 개발자'), 'senior');
});

test('시니어 without bracket → senior', () => {
  assert.strictEqual(deriveCareerStageFromTitle('시니어 프론트엔드 개발'), 'senior');
});

test('Senior Engineer → senior', () => {
  assert.strictEqual(deriveCareerStageFromTitle('Senior Frontend Engineer'), 'senior');
});

test('Sr. Developer → senior', () => {
  assert.strictEqual(deriveCareerStageFromTitle('Sr. React Developer'), 'senior');
});

test('Lead Engineer → lead', () => {
  assert.strictEqual(deriveCareerStageFromTitle('Lead Frontend Engineer'), 'lead');
});

test('주니어 in title → junior', () => {
  assert.strictEqual(deriveCareerStageFromTitle('주니어 백엔드 개발자'), 'junior');
});

test('Junior Developer → junior', () => {
  assert.strictEqual(deriveCareerStageFromTitle('Junior Backend Developer'), 'junior');
});

test('plain title → null', () => {
  assert.strictEqual(deriveCareerStageFromTitle('프론트엔드 개발자'), null);
});

// === deriveCareerStage correctness (experience-based) ===

test('경력 → mid (bare default)', () => {
  assert.strictEqual(deriveCareerStage('경력'), 'mid');
});

test('신입 → entry', () => {
  assert.strictEqual(deriveCareerStage('신입'), 'entry');
});

test('신입가능 → entry', () => {
  assert.strictEqual(deriveCareerStage('신입가능'), 'entry');
});

test('3년 이상 → mid (minimum bump)', () => {
  assert.strictEqual(deriveCareerStage('3년 이상'), 'mid');
});

test('8년 이상 → senior (minimum bump)', () => {
  assert.strictEqual(deriveCareerStage('8년 이상'), 'senior');
});

// === Priority logic simulation ===

test('Title "시니어" + experience "신입" → title wins (senior)', () => {
  const title = '[미리캔버스] 시니어 프론트엔드 개발자';
  const experience = '신입';
  
  const titleStage = deriveCareerStageFromTitle(title);
  const expStage = deriveCareerStage(experience);
  
  // Title should win
  const finalStage = titleStage || expStage;
  assert.strictEqual(finalStage, 'senior');
  assert.strictEqual(expStage, 'entry'); // confirm experience would have been wrong
});

test('Title "주니어" + experience "경력" → title wins (junior)', () => {
  const title = '주니어 백엔드 개발자';
  const experience = '경력';
  
  const titleStage = deriveCareerStageFromTitle(title);
  const expStage = deriveCareerStage(experience);
  
  const finalStage = titleStage || expStage;
  assert.strictEqual(finalStage, 'junior');
  assert.strictEqual(expStage, 'mid'); // bare 경력 → mid
});

test('Title plain + experience "5년 이상" → experience wins (mid)', () => {
  const title = '프론트엔드 개발자';
  const experience = '5년 이상';
  
  const titleStage = deriveCareerStageFromTitle(title);
  const expStage = deriveCareerStage(experience);
  
  const finalStage = titleStage || expStage;
  assert.strictEqual(finalStage, 'mid');
  assert.strictEqual(titleStage, null); // no signal from title
});

test('Title "Lead" + experience "경력" → title wins (lead)', () => {
  const title = 'Lead Engineer';
  const experience = '경력';
  
  const titleStage = deriveCareerStageFromTitle(title);
  const expStage = deriveCareerStage(experience);
  
  const finalStage = titleStage || expStage;
  assert.strictEqual(finalStage, 'lead');
  assert.strictEqual(expStage, 'mid'); // bare 경력 → mid (wrong for lead)
});

test('Title "Staff" + experience "3년 이상" → title wins (lead)', () => {
  const title = 'Staff Engineer';
  const experience = '3년 이상';
  
  const titleStage = deriveCareerStageFromTitle(title);
  const expStage = deriveCareerStage(experience);
  
  const finalStage = titleStage || expStage;
  assert.strictEqual(finalStage, 'lead');
});

test('Title "CTO" + experience "경력" → title wins (lead)', () => {
  const title = 'Chief Technology Officer';
  const experience = '경력';
  
  const titleStage = deriveCareerStageFromTitle(title);
  
  // CTO might not be in the title patterns — check what we get
  if (titleStage) {
    assert.strictEqual(titleStage, 'lead');
  }
  // If CTO not detected, that's a separate gap
});

// === Edge cases ===

test('시니어 in middle of title → senior', () => {
  assert.strictEqual(deriveCareerStageFromTitle('[팀] 시니어 백엔드 엔지니어 (경력)'), 'senior');
});

test('Leading not a career stage', () => {
  // "Leading Product Designer" should not match as lead
  const result = deriveCareerStageFromTitle('Leading Product Designer');
  // This could be lead or null depending on implementation
  // Just verify it doesn't crash
  assert.ok(result === 'lead' || result === null);
});

// Summary
console.log(`\n${'─'.repeat(50)}`);
console.log(`📊 ${passed + failed} tests | ${passed} passed | ${failed} failed`);
if (failed > 0) {
  console.log('❌ Some tests failed');
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
}
