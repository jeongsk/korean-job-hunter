/**
 * EXP-178: Test Engineer / SDET / Automation Engineer skill inference
 * These common English testing role titles were missing from ROLE_SKILL_MAP.
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

// English testing roles
test('Test Engineer', ['selenium', 'jest']);
test('Senior Test Engineer', ['selenium', 'jest']);
test('SDET', ['selenium', 'jest', 'python']);
test('Senior SDET', ['selenium', 'python']);
test('Automation Engineer', ['selenium', 'jest']);
test('Automation Tester', ['selenium', 'jest']);
test('QA Engineer', ['selenium', 'jest']);
test('Senior QA Engineer', ['selenium', 'jest']);
test('Quality Assurance Engineer', ['selenium', 'jest']);
test('Software Test Engineer', ['selenium', 'jest']);

// Korean equivalents still work
test('QA 엔지니어', ['selenium', 'jest']);
test('테스트 엔지니어', ['selenium', 'jest']);
test('QA 매니저', ['selenium', 'jest']);

console.log(`\n${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
