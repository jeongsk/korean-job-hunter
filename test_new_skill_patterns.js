/**
 * Test for newly added skill patterns (MariaDB, SQS, SNS, Aurora, DocumentDB, ElasticCache, MSK)
 */
const assert = require('assert');
const { inferSkills } = require('./scripts/skill-inference');

// Helper to test skill presence
function hasSkill(text, skill) {
  return inferSkills(text, { includeRoleMap: false }).includes(skill);
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch(e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

console.log('🧪 New Skill Patterns (MariaDB, AWS Services)');

test('mariadb - English', () => assert(hasSkill('MariaDB를 사용한 경험', 'mariadb')));
test('mariadb - Korean', () => assert(hasSkill('마리아디비 경험', 'mariadb')));
test('mariadb - in tech stack section', () => {
  const skills = inferSkills('Database — MariaDB / Redis / MySQL', { includeRoleMap: false });
  assert(skills.includes('mariadb'));
  assert(skills.includes('redis'));
  assert(skills.includes('mysql'));
});

test('sqs - standalone', () => assert(hasSkill('AWS SQS 사용', 'sqs')));
test('sqs - in parentheses', () => assert(hasSkill('AWS (MSK, SQS, SNS)', 'sqs')));
test('sqs - does not match inside words', () => {
  // "https" should not match SQS
  const skills = inferSkills('https://example.com', { includeRoleMap: false });
  assert(!skills.includes('sqs'));
});

test('sns - standalone', () => assert(hasSkill('SNS 알림 서비스', 'sns')));
test('sns - in parentheses', () => assert(hasSkill('AWS (SQS, SNS, Lambda)', 'sns')));
test('sns - Korean text context', () => {
  // "인스타그램 SNS 마케팅" should not match - only tech context
  // This is tricky - for now, just verify it matches in tech context
  const skills = inferSkills('AWS SNS 푸시 알림', { includeRoleMap: false });
  assert(skills.includes('sns'));
});

test('aurora - AuroraDB', () => assert(hasSkill('AuroraDB 사용 경험', 'aurora')));
test('aurora - AWS Aurora', () => assert(hasSkill('AWS Aurora MySQL', 'aurora')));
test('aurora - Korean', () => assert(hasSkill('오로라DB 경험', 'aurora')));

test('documentdb - English', () => assert(hasSkill('DocumentDB 사용', 'documentdb')));
test('documentdb - Korean', () => assert(hasSkill('다큐먼트db 경험', 'documentdb')));

test('elasticache - English', () => assert(hasSkill('ElasticCache 캐시', 'elasticache')));
test('elasticache - Korean', () => assert(hasSkill('엘라스티캐시 경험', 'elasticache')));

test('msk - standalone', () => assert(hasSkill('MSK 사용', 'msk')));
test('msk - in parentheses', () => assert(hasSkill('AWS (MSK, SQS)', 'msk')));

test('full tech stack extraction', () => {
  const desc = '[기술 스택]\n• Backend — Kotlin & Spring Framework\n• Database — MariaDB / Redis / DocumentDB / Opensearch\n• Infra & Data — AWS (MSK, SQS, SNS, AuroraDB, ElasticCache, K8S) / Airflow / Jenkins';
  const skills = inferSkills(desc, { includeRoleMap: false });
  assert(skills.includes('mariadb'), `missing mariadb: ${skills}`);
  assert(skills.includes('sqs'), `missing sqs: ${skills}`);
  assert(skills.includes('sns'), `missing sns: ${skills}`);
  assert(skills.includes('aurora'), `missing aurora: ${skills}`);
  assert(skills.includes('documentdb'), `missing documentdb: ${skills}`);
  assert(skills.includes('elasticache'), `missing elasticache: ${skills}`);
  assert(skills.includes('msk'), `missing msk: ${skills}`);
  assert(skills.includes('kotlin'));
  assert(skills.includes('spring'));
  assert(skills.includes('redis'));
  assert(skills.includes('opensearch'));
  assert(skills.includes('kubernetes'));
  assert(skills.includes('jenkins'));
  assert(skills.includes('airflow'));
  assert(skills.includes('aws'));
  // Total should be significantly more than before (was 9-10)
  console.log(`    → ${skills.length} skills extracted: ${skills.join(', ')}`);
  assert(skills.length >= 15, `expected >=15 skills, got ${skills.length}`);
});

console.log(`\n📊 ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
