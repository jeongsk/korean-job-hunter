/**
 * EXP-124: Test bare English skill names in skill-inference and NLP parser
 * Verifies that short skill names (vue, go, nuxt) match without suffix requirements
 */
const assert = require('assert');
const { inferSkills, SKILL_MAP } = require('./scripts/skill-inference');
const { parseKoreanQuery } = require('./scripts/nlp-parser');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; console.error('FAIL:', name, e.message); }
}

// === Skill Inference Tests ===
test('inferSkills: bare "vue" extracts vue skill', () => {
  const skills = inferSkills('Vue 경력 3년');
  assert.ok(skills.includes('vue'), `Expected vue in ${skills}`);
});

test('inferSkills: bare "go" extracts go skill', () => {
  const skills = inferSkills('Go 백엔드 개발자');
  assert.ok(skills.includes('go'), `Expected go in ${skills}`);
});

test('inferSkills: "vue.js" still works', () => {
  const skills = inferSkills('Vue.js 프론트엔드');
  assert.ok(skills.includes('vue'), `Expected vue in ${skills}`);
});

test('inferSkills: "vuejs" still works', () => {
  const skills = inferSkills('VueJS 개발자');
  assert.ok(skills.includes('vue'), `Expected vue in ${skills}`);
});

test('inferSkills: "뷰" Korean works', () => {
  const skills = inferSkills('뷰 프레임워크');
  assert.ok(skills.includes('vue'), `Expected vue in ${skills}`);
});

test('inferSkills: "고언어" Korean works', () => {
  const skills = inferSkills('고언어 서버');
  assert.ok(skills.includes('go'), `Expected go in ${skills}`);
});

test('inferSkills: "reactive" does NOT match react', () => {
  const skills = inferSkills('reactive programming');
  assert.ok(!skills.includes('react'), `react should not match "reactive": ${skills}`);
});

// === NLP Parser Tests ===
test('NLP: "vue 공고" generates skill filter', () => {
  const r = parseKoreanQuery('vue 공고');
  const sf = r.filters.find(f => f.includes("j.skills"));
  assert.ok(sf && sf.includes('vue'), `Expected vue skill filter, got: ${r.filters}`);
});

test('NLP: "go 공고" generates skill filter', () => {
  const r = parseKoreanQuery('go 공고');
  const sf = r.filters.find(f => f.includes("j.skills"));
  assert.ok(sf && sf.includes('go'), `Expected go skill filter, got: ${r.filters}`);
});

test('NLP: "nuxt 공고" generates skill filter', () => {
  const r = parseKoreanQuery('nuxt 공고');
  const sf = r.filters.find(f => f.includes("j.skills"));
  assert.ok(sf && sf.includes('nuxt'), `Expected nuxt skill filter, got: ${r.filters}`);
});

test('NLP: "뷰 공고" generates skill filter', () => {
  const r = parseKoreanQuery('뷰 공고');
  const sf = r.filters.find(f => f.includes("j.skills"));
  assert.ok(sf && sf.includes('vue'), `Expected vue skill filter, got: ${r.filters}`);
});

test('NLP: "고언어 공고" generates skill filter', () => {
  const r = parseKoreanQuery('고언어 공고');
  const sf = r.filters.find(f => f.includes("j.skills"));
  assert.ok(sf && sf.includes('go'), `Expected go skill filter, got: ${r.filters}`);
});

test('NLP: "넉스트 공고" generates skill filter', () => {
  const r = parseKoreanQuery('넉스트 공고');
  const sf = r.filters.find(f => f.includes("j.skills"));
  assert.ok(sf && sf.includes('nuxt'), `Expected nuxt skill filter, got: ${r.filters}`);
});

// === Regression: existing patterns still work ===
test('NLP: "vue.js 공고" still works', () => {
  const r = parseKoreanQuery('vue.js 공고');
  const sf = r.filters.find(f => f.includes("j.skills"));
  assert.ok(sf && sf.includes('vue'), `Expected vue skill filter, got: ${r.filters}`);
});

test('NLP: "golang 공고" still works', () => {
  const r = parseKoreanQuery('golang 공고');
  const sf = r.filters.find(f => f.includes("j.skills"));
  assert.ok(sf && sf.includes('go'), `Expected go skill filter, got: ${r.filters}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
