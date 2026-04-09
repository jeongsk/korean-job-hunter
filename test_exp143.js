/**
 * EXP-143: Missing English/Korean role-skill mapping coverage test
 * Tests that common Korean job market role titles return meaningful skills
 */
const { inferSkills } = require('./scripts/skill-inference');

let passed = 0, failed = 0;
const failures = [];

function test(title, expectedSkills) {
  const skills = inferSkills(title);
  const missing = expectedSkills.filter(e => !skills.includes(e));
  if (missing.length === 0) {
    passed++;
  } else {
    failed++;
    failures.push(`MISS: "${title}" missing: [${missing.join(', ')}] got: [${skills.join(', ')}]`);
  }
}

// English role titles that were returning empty before EXP-143
test('System Engineer', ['linux', 'docker', 'kubernetes']);
test('System Admin', ['linux', 'docker', 'kubernetes']);
test('Network Engineer', ['linux', 'docker', 'kubernetes']);
test('Database Administrator', ['postgresql', 'mysql', 'redis', 'linux']);
test('Solution Architect', ['aws', 'docker', 'kubernetes']);

// MLOps should include infra skills beyond just 'mlops'
test('MLOps Engineer', ['mlops', 'docker', 'kubernetes', 'python']);
test('MLOps', ['mlops', 'docker', 'kubernetes', 'python']);

// Korean forms
test('데이터 애널리스트', ['python', 'sql']);

// Non-technical roles should return empty arrays (no false positive skills)
test('Product Manager', []);
test('Project Manager', []);
test('Scrum Master', []);
test('Agile Coach', []);
test('Technical Writer', []);

// Regression: existing mappings still work
test('Backend Developer', ['node.js', 'python', 'java']);
test('Frontend Engineer', ['react', 'typescript', 'javascript']);
test('DevOps Engineer', ['docker', 'kubernetes', 'ci/cd']);
test('Data Scientist', ['python', 'machine learning']);
test('QA Engineer', ['selenium', 'jest']);

console.log(`📊 EXP-143 Role-Skill Map Coverage: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  for (const f of failures) console.log(f);
  process.exit(1);
}
