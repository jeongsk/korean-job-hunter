#!/usr/bin/env node
/**
 * EXP-131: API search-time skill extraction
 * Tests that parsePosition extracts skills from title without detail fetch.
 */

const { inferSkills, deriveCareerStage } = require('./scripts/skill-inference');

// Re-implement parsePosition logic for unit testing
function parsePositionSkills(pos) {
  const title = pos.position || '';
  const isNewbie = pos.is_newbie || false;
  let experience = isNewbie ? '신입가능' : '경력';
  const careerStage = deriveCareerStage(experience);
  const skills = inferSkills(title);
  return { title, experience, career_stage: careerStage, skills };
}

const tests = [
  // Korean role titles with ROLE_SKILL_MAP supplement
  { pos: { position: '프론트엔드 개발자', is_newbie: false },
    expected: { has: ['react', 'typescript', 'javascript'], career: 'mid' },
    desc: '프론트엔드 개발자 gets react+ts+js' },
  { pos: { position: '백엔드 개발자', is_newbie: false },
    expected: { has: ['node.js', 'python', 'java'], career: 'mid' },
    desc: '백엔드 개발자 gets node+python+java' },
  { pos: { position: '풀스택 개발자', is_newbie: false },
    expected: { has: ['react', 'node.js', 'typescript'], career: 'mid' },
    desc: '풀스택 gets react+node+ts' },
  { pos: { position: '데브옵스 엔지니어', is_newbie: false },
    expected: { has: ['docker', 'kubernetes', 'ci/cd'], career: 'mid' },
    desc: '데브옵스 gets docker+k8s+cicd' },
  { pos: { position: '안드로이드 개발자', is_newbie: false },
    expected: { has: ['kotlin', 'java'], career: 'mid' },
    desc: '안드로이드 gets kotlin+java' },

  // Titles with explicit tech keywords
  { pos: { position: 'React/TypeScript 프론트엔드', is_newbie: false },
    expected: { has: ['react', 'typescript', 'javascript'], career: 'mid' },
    desc: 'Explicit React+TS title gets both explicit and role-based skills' },
  { pos: { position: 'Senior Python/Django 백엔드', is_newbie: false },
    expected: { has: ['python', 'django', 'node.js', 'java'], career: 'mid' },
    desc: 'Explicit Python+Django plus role-based node+java supplement' },

  // Career stage derivation
  { pos: { position: '프론트엔드 개발자', is_newbie: true },
    expected: { career: 'entry' },
    desc: 'is_newbie=true → entry career stage' },
  { pos: { position: '백엔드', is_newbie: false },
    expected: { career: 'mid' },
    desc: 'is_newbie=false → mid career stage (bare 경력)' },

  // English titles
  { pos: { position: 'Frontend Engineer', is_newbie: false },
    expected: { has: ['react', 'typescript', 'javascript'] },
    desc: 'English Frontend title gets role-based skills via 프론트엔드 mapping' },
  { pos: { position: 'Product Engineer', is_newbie: false },
    expected: { has: [], len_max: 1 },
    desc: 'Generic Product Engineer title gets minimal/no skills' },

  // Real API responses from April 2026
  { pos: { position: '[미리캔버스] 시니어 프론트엔드 개발자', is_newbie: false },
    expected: { has: ['react', 'typescript', 'javascript'] },
    desc: 'Real API: [미리캔버스] 시니어 프론트엔드 개발자' },
  { pos: { position: 'Frontend Engineer Lead', is_newbie: false },
    expected: { has: ['react', 'typescript', 'javascript'] },
    desc: 'Real API: Frontend Engineer Lead' },
  { pos: { position: '프론트 개발자 (Frontend Developer)', is_newbie: false },
    expected: { has: ['react', 'typescript', 'javascript'] },
    desc: 'Real API: 프론트 개발자 (Frontend Developer)' },

  // Edge cases
  { pos: { position: '', is_newbie: false },
    expected: { has: [] },
    desc: 'Empty title → empty skills' },
  { pos: { position: '글로벌 전자 대기업 이커머스 프론트 기획', is_newbie: false },
    expected: { has: ['react', 'typescript', 'javascript'] },
    desc: '프론트 in title triggers role mapping even in non-dev title' },
];

let passed = 0, failed = 0;
for (const test of tests) {
  const result = parsePositionSkills(test.pos);
  let ok = true;
  const errors = [];

  if (test.expected.has) {
    for (const s of test.expected.has) {
      if (!result.skills.includes(s)) {
        errors.push(`missing '${s}' (got [${result.skills.join(',')}])`);
        ok = false;
      }
    }
  }
  if (test.expected.len_max !== undefined && result.skills.length > test.expected.len_max) {
    errors.push(`too many skills: ${result.skills.length} > ${test.expected.len_max}`);
    ok = false;
  }
  if (test.expected.career && result.career_stage !== test.expected.career) {
    errors.push(`career_stage: got '${result.career_stage}', expected '${test.expected.career}'`);
    ok = false;
  }

  if (ok) {
    passed++;
  } else {
    failed++;
    console.log(`❌ ${test.desc}: ${errors.join('; ')}`);
  }
}

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
