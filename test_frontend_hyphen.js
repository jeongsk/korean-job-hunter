// test_frontend_hyphen.js — EXP-141: front-end/back-end/full-stack hyphenated variants
// Verifies that hyphenated English role titles correctly return skills via ROLE_SKILL_MAP
const { inferSkills } = require('./scripts/skill-inference');

let passed = 0, failed = 0;

function test(title, got, expected) {
  const hasAll = expected.every(e => got.includes(e));
  if (hasAll) {
    passed++;
  } else {
    failed++;
    console.log(`❌ ${title}: got ${JSON.stringify(got)}, expected to include ${JSON.stringify(expected)}`);
  }
}

// front-end variants
test('Front-end Engineer', inferSkills('Front-end Engineer'), ['react', 'typescript', 'javascript']);
test('front-end developer', inferSkills('front-end developer'), ['react', 'typescript', 'javascript']);
test('Front-End Developer', inferSkills('Front-End Developer'), ['react', 'typescript', 'javascript']);
test('front end engineer', inferSkills('front end engineer'), ['react', 'typescript', 'javascript']);
test('[hourplace] Front-end Engineer', inferSkills('[hourplace] Front-end Engineer'), ['react', 'typescript', 'javascript']);
test('Senior Front-end Software Engineer', inferSkills('Senior Front-end Software Engineer'), ['react', 'typescript', 'javascript']);

// back-end variants (should already work but verify)
test('Back-end Engineer', inferSkills('Back-end Engineer'), ['node.js', 'python', 'java']);
test('back-end developer', inferSkills('back-end developer'), ['node.js', 'python', 'java']);

// full-stack variants (should already work but verify)
test('Full-Stack Developer', inferSkills('Full-Stack Developer'), ['react', 'node.js', 'typescript']);
test('full-stack engineer', inferSkills('full-stack engineer'), ['react', 'node.js', 'typescript']);

// Korean variants still work
test('프론트엔드 개발자', inferSkills('프론트엔드 개발자'), ['react', 'typescript', 'javascript']);
test('frontend developer', inferSkills('frontend developer'), ['react', 'typescript', 'javascript']);

// Negative: "front end" should not match in unrelated context
const unrelated = inferSkills('End-to-End Testing Specialist');
const hasReact = unrelated.includes('react');
if (!hasReact) {
  passed++;
} else {
  failed++;
  console.log(`❌ "End-to-End Testing" should not match front-end, got ${JSON.stringify(unrelated)}`);
}

console.log(`\n📊 Front-end hyphen: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
