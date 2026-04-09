/**
 * EXP-133: English role title skill inference
 * Tests that common English role titles used in Korean job postings
 * (especially on Wanted and LinkedIn) return meaningful skills.
 */
const assert = require('assert');
const { inferSkills } = require('./scripts/skill-inference');

let passed = 0, failed = 0;

function test(title, expectedIncludes) {
  const got = inferSkills(title);
  for (const s of expectedIncludes) {
    if (!got.includes(s)) {
      console.log(`FAIL: "${title}" missing "${s}" — got: [${got.join(', ')}]`);
      failed++;
      return;
    }
  }
  passed++;
}

// Previously returned (none) — now should return skills
test('Backend Developer', ['node.js', 'python', 'java']);
test('Full Stack Developer', ['react', 'node.js', 'typescript']);
test('Data Scientist', ['python', 'machine learning']);
test('Data Engineer', ['spark', 'airflow', 'python']);

// Previously worked via SKILL_MAP, now should also get role supplements
test('Frontend Developer', ['react', 'typescript', 'javascript']);
test('DevOps Engineer', ['docker', 'kubernetes', 'ci/cd']);
test('Platform Engineer', ['kubernetes', 'docker', 'linux']);
test('Site Reliability Engineer', ['kubernetes', 'prometheus', 'docker']);

// Mixed English/Korean
test('Senior Backend Developer', ['node.js', 'python', 'java']);
test('Backend Engineer (Go)', ['go']);  // EXP-162: Go blocks conflicting backend defaults

// Edge cases: should NOT infer skills for generic titles
const generic = inferSkills('Product Engineer');
assert.strictEqual(generic.length, 0, 'Product Engineer should have no skills');
passed++;

const generic2 = inferSkills('Software Engineer');
assert.strictEqual(generic2.length, 0, 'Software Engineer should have no skills (too generic)');
passed++;

// EXP-177: Engineering Manager now returns leadership skills (aws, docker, kubernetes)
const em = inferSkills('Engineering Manager');
assert.ok(em.length > 0, 'Engineering Manager should have leadership skills post-EXP-177');
assert.ok(em.includes('docker'), 'Engineering Manager should include docker');
passed++;

// Korean equivalents still work
test('백엔드 개발자', ['node.js', 'python', 'java']);
test('풀스택 개발자', ['react', 'node.js', 'typescript']);
test('데이터 사이언티스트', ['python', 'machine learning']);

console.log(`\n${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
