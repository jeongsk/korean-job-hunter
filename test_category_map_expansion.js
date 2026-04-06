/**
 * EXP-140: Category map expansion + role skill inference for Wanted API categories
 * 
 * Tests that expanded CATEGORY_MAP entries produce meaningful skills,
 * and new ROLE_SKILL_MAP entries cover previously-missing categories.
 */

const {inferSkills} = require('./scripts/skill-inference.js');
const fs = require('fs');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✅', name);
    passed++;
  } catch (e) {
    console.log('❌', name, '-', e.message);
    failed++;
  }
}

function assertIncludes(arr, val) {
  if (!arr.includes(val)) throw new Error(`Missing: ${val}. Got: [${arr.join(', ')}]`);
}

// === New ROLE_SKILL_MAP entries (EXP-140) ===

test('서버 개발자 → node.js, python, java, linux', () => {
  const s = inferSkills('서버 개발자');
  ['node.js','python','java','linux'].forEach(x => assertIncludes(s, x));
});

test('DBA → postgresql, mysql, redis, linux', () => {
  const s = inferSkills('DBA');
  ['postgresql','mysql','redis','linux'].forEach(x => assertIncludes(s, x));
});

test('BI 엔지니어 → python, sql, spark', () => {
  const s = inferSkills('BI 엔지니어');
  ['python','sql','spark'].forEach(x => assertIncludes(s, x));
});

test('ERP전문가 → java, sql', () => {
  const s = inferSkills('ERP전문가');
  ['java','sql'].forEach(x => assertIncludes(s, x));
});

test('PHP 개발자 → php, mysql, linux', () => {
  const s = inferSkills('PHP 개발자');
  ['php','mysql','linux'].forEach(x => assertIncludes(s, x));
});

test('파이썬 개발자 → python, django, flask', () => {
  const s = inferSkills('파이썬 개발자');
  ['python','django','flask'].forEach(x => assertIncludes(s, x));
});

test('자바 개발자 → java, spring, spring boot', () => {
  const s = inferSkills('자바 개발자');
  ['java','spring','spring boot'].forEach(x => assertIncludes(s, x));
});

test('빅데이터 엔지니어 → spark, hadoop, airflow, python', () => {
  const s = inferSkills('빅데이터 엔지니어');
  ['spark','hadoop','airflow','python'].forEach(x => assertIncludes(s, x));
});

test('시스템,네트워크 관리자 → linux, docker, kubernetes', () => {
  const s = inferSkills('시스템,네트워크 관리자');
  ['linux','docker','kubernetes'].forEach(x => assertIncludes(s, x));
});

test('블록체인 플랫폼 엔지니어 → blockchain, solidity', () => {
  const s = inferSkills('블록체인 플랫폼 엔지니어');
  ['blockchain','solidity'].forEach(x => assertIncludes(s, x));
});

test('보안관제 → cybersecurity, linux', () => {
  const s = inferSkills('보안관제');
  ['cybersecurity','linux'].forEach(x => assertIncludes(s, x));
});

test('정보보호 컨설팅 → cybersecurity', () => {
  const s = inferSkills('정보보호 컨설팅');
  assertIncludes(s, 'cybersecurity');
});

// === CATEGORY_MAP coverage test ===

test('CATEGORY_MAP has 35+ entries', () => {
  const src = fs.readFileSync('scripts/scrape-wanted-api.js', 'utf8');
  const match = src.match(/const CATEGORY_MAP = \{([^}]+)\}/s);
  if (!match) throw new Error('CATEGORY_MAP not found');
  const entries = match[1].match(/\d+:/g) || [];
  if (entries.length < 35) throw new Error(`Only ${entries.length} entries, expected 35+`);
});

test('CATEGORY_MAP covers key categories', () => {
  const src = fs.readFileSync('scripts/scrape-wanted-api.js', 'utf8');
  const requiredIds = [669, 672, 899, 893, 660, 872, 658, 900, 10231, 1022, 1027, 1025, 676, 960, 961];
  for (const id of requiredIds) {
    if (!src.includes(`${id}:`)) throw new Error(`Missing category ${id}`);
  }
});

// === Regression: existing categories still work ===

test('프론트엔드 개발자 → react, typescript, javascript', () => {
  const s = inferSkills('프론트엔드 개발자');
  ['react','typescript','javascript'].forEach(x => assertIncludes(s, x));
});

test('백엔드 개발자 → node.js, python, java', () => {
  const s = inferSkills('백엔드 개발자');
  ['node.js','python','java'].forEach(x => assertIncludes(s, x));
});

test('게임 클라이언트 개발자 → unity, c++', () => {
  const s = inferSkills('게임 클라이언트 개발자');
  ['unity','c++'].forEach(x => assertIncludes(s, x));
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
