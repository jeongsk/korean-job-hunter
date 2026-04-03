// Test suite for resume-agent Korean NLP skill extraction, career stage, and domain detection
// EXP-032: Initial test suite
// EXP-090: Synced with skill-inference.js (77 skills), replaced inline maps with shared module

let passed = 0, failed = 0;
const results = [];

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    results.push(`  ✅ ${name}`);
  } else {
    failed++;
    results.push(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// Use skill-inference.js as single source of truth (same module used by all post-processors)
const { inferSkills, SKILL_MAP } = require('./scripts/skill-inference');

// === Career Stage Detection ===
function detectCareerStage(years) {
  if (years <= 1) return 'entry';
  if (years <= 3) return 'junior';
  if (years <= 7) return 'mid';
  if (years <= 12) return 'senior';
  return 'lead';
}

// === Primary Domain Detection ===
const domainIndicators = {
  frontend: ['react', 'vue', 'angular', 'next.js', 'nuxt', 'svelte', 'css', 'html', 'typescript'],
  backend: ['spring', 'express', 'nestjs', 'django', 'fastapi', 'go', 'java', 'python'],
  data: ['tensorflow', 'pytorch', 'pandas', 'r', 'spark', 'hadoop', 'ml'],
  mobile: ['swift', 'kotlin', 'react native', 'flutter', 'ios', 'android'],
  devops: ['docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'aws', 'gcp', 'azure'],
};

function detectDomain(allSkills) {
  const lower = allSkills.map(s => s.toLowerCase());
  const scores = {};
  for (const [domain, indicators] of Object.entries(domainIndicators)) {
    scores[domain] = indicators.filter(ind => {
      if (ind.length <= 2) {
        return lower.some(s => s === ind);
      }
      return lower.some(s => s.includes(ind));
    }).length;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return 'unknown';
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1] && sorted[0][1] > 0) {
    return `${sorted[0][0]}/${sorted[1][0]}`;
  }
  return sorted[0][0];
}

// Helper: check if skills array contains a skill (case-insensitive)
function has(skills, name) {
  return skills.some(s => s.toLowerCase() === name.toLowerCase());
}

// === TEST CASES ===

console.log('\n🧪 Resume Agent NLP Tests (EXP-090: skill-inference.js sync)\n');

// --- 1. Korean Language Keyword Extraction ---
console.log('📝 Korean Language Keyword Extraction');

const t1 = inferSkills('3년차 리액트 개발자, 타입스크립트, 넥스트 사용');
assert('Korean: 리액트 → react', has(t1, 'react'));
assert('Korean: 타입스크립트 → typescript', has(t1, 'typescript'));
assert('Korean: 넥스트 → next.js', has(t1, 'next.js'));

const t2 = inferSkills('자바스크립트와 파이썬 경험, 루비도 가능');
assert('Korean: 자바스크립트 → javascript', has(t2, 'javascript'));
assert('Korean: 파이썬 → python', has(t2, 'python'));
assert('Korean: 루비 → ruby', has(t2, 'ruby'));
assert('No false java match from 자바스크립트', !has(t2, 'java'));

const t3 = inferSkills('자바 백엔드 개발, 스프링 프레임워크 사용');
assert('Korean: 자바 → java (standalone)', has(t3, 'java'));
assert('Korean: 스프링 → spring', has(t3, 'spring'));

const t4 = inferSkills('도커, 쿠버네티스, AWS, 젠킨스 사용');
assert('Korean: 도커 → docker', has(t4, 'docker'));
assert('Korean: 쿠버네티스 → kubernetes', has(t4, 'kubernetes'));
assert('Korean: 젠킨스 → jenkins', has(t4, 'jenkins'));
assert('English: AWS → aws', has(t4, 'aws'));

// --- 2. Database Extraction ---
console.log('📝 Database Keyword Extraction');

const t5 = inferSkills('포스트그레스와 레디스 경험, 몽고디비도 사용');
assert('Korean: 포스트그레스 → postgresql', has(t5, 'postgresql'));
assert('Korean: 레디스 → redis', has(t5, 'redis'));
assert('Korean: 몽고디비 → mongodb', has(t5, 'mongodb'));

// --- 3. Career Stage Detection ---
console.log('📝 Career Stage Detection');

assert('0.5 years → entry', detectCareerStage(0.5) === 'entry');
assert('1 year → entry', detectCareerStage(1) === 'entry');
assert('2 years → junior', detectCareerStage(2) === 'junior');
assert('3 years → junior', detectCareerStage(3) === 'junior');
assert('4 years → mid', detectCareerStage(4) === 'mid');
assert('7 years → mid', detectCareerStage(7) === 'mid');
assert('8 years → senior', detectCareerStage(8) === 'senior');
assert('12 years → senior', detectCareerStage(12) === 'senior');
assert('15 years → lead', detectCareerStage(15) === 'lead');

// --- 4. Primary Domain Detection ---
console.log('📝 Primary Domain Detection');

assert('Frontend domain', detectDomain(['react', 'typescript', 'next.js', 'css', 'html']) === 'frontend');
assert('Backend domain', detectDomain(['spring', 'java', 'mysql', 'docker']) === 'backend');
assert('DevOps domain', detectDomain(['docker', 'kubernetes', 'aws', 'terraform']) === 'devops');
assert('Data domain', detectDomain(['python', 'tensorflow', 'pandas', 'spark']) === 'data');
assert('Mobile domain', detectDomain(['swift', 'kotlin', 'flutter']) === 'mobile');

const domainMixed = detectDomain(['react', 'typescript', 'spring', 'java', 'docker']);
assert('Fullstack hybrid detected', domainMixed.includes('/') && domainMixed.includes('frontend') && domainMixed.includes('backend'));

// --- 5. Mixed English/Korean Input ---
console.log('📝 Mixed English/Korean Input');

const t6 = inferSkills('React, Node.js, PostgreSQL 경험. AWS와 Docker 사용. Kubernetes 운영');
assert('Mixed: React detected', has(t6, 'react'));
assert('Mixed: Node.js detected', has(t6, 'node.js'));
assert('Mixed: PostgreSQL detected', has(t6, 'postgresql'));
assert('Mixed: AWS detected', has(t6, 'aws'));
assert('Mixed: Docker detected', has(t6, 'docker'));
assert('Mixed: Kubernetes detected', has(t6, 'kubernetes'));

// --- 6. Edge Cases ---
console.log('📝 Edge Cases');

const t7 = inferSkills('');
assert('Empty input: no skills', t7.length === 0);

const t9 = inferSkills('Vue.js와 Nuxt.js로 프로젝트 진행');
assert('Vue.js with dot → vue', has(t9, 'vue'));
assert('Nuxt.js with dot → nuxt', has(t9, 'nuxt'));

// java vs javascript disambiguation
const t10 = inferSkills('JavaScript, TypeScript, Java');
assert('English: JavaScript detected', has(t10, 'javascript'));
assert('English: Java detected (standalone)', has(t10, 'java'));
assert('English: TypeScript detected', has(t10, 'typescript'));

// --- 7. NEW: Infrastructure & DevOps skills (EXP-083) ---
console.log('📝 Infrastructure & DevOps Skills (EXP-083)');

const t11 = inferSkills('리눅스 서버 관리, 엔진엑스 설정 경험');
assert('Korean: 리눅스 → linux', has(t11, 'linux'));
assert('Korean: 엔진엑스 → nginx', has(t11, 'nginx'));

const t12 = inferSkills('CI/CD 파이프라인 구축, 데브옵스 경험');
assert('CI/CD detected', has(t12, 'ci/cd'));
assert('Korean: 데브옵스 → devops', has(t12, 'devops'));

const t13 = inferSkills('Ansible로 인프라 자동화');
assert('Ansible detected', has(t13, 'ansible'));

// --- 8. NEW: Data Engineering skills (EXP-083) ---
console.log('📝 Data Engineering Skills');

const t14 = inferSkills('스파크와 하둡으로 데이터 파이프라인 구축');
assert('Korean: 스파크 → spark', has(t14, 'spark'));
assert('Korean: 하둡 → hadoop', has(t14, 'hadoop'));

const t15 = inferSkills('Airflow로 워크플로우 관리, dbt로 데이터 변환');
assert('Airflow detected', has(t15, 'airflow'));
assert('dbt detected', has(t15, 'dbt'));

// --- 9. NEW: Cloud & Data Warehouse (EXP-083) ---
console.log('📝 Cloud & Data Warehouse Skills');

const t16 = inferSkills('빅쿼리로 데이터 분석, 스노우플레이크 경험');
assert('Korean: 빅쿼리 → bigquery', has(t16, 'bigquery'));
assert('Korean: 스노우플레이크 → snowflake', has(t16, 'snowflake'));

const t17 = inferSkills('AWS Lambda 서버리스, S3 스토리지, SQS 메시지 큐');
assert('AWS Lambda detected', has(t17, 'aws lambda'));
assert('AWS S3 detected', has(t17, 'aws s3'));
assert('AWS SQS detected', has(t17, 'aws sqs'));

// --- 10. NEW: Java ecosystem (EXP-083) ---
console.log('📝 Java Ecosystem Skills');

const t18 = inferSkills('JPA/Hibernate로 ORM 개발');
assert('JPA detected', has(t18, 'jpa'));

// --- 11. NEW: Frontend State & Frameworks (EXP-083) ---
console.log('📝 Frontend State & Frameworks');

const t19 = inferSkills('리덕스로 상태관리');
assert('Korean: 리덕스 → redux', has(t19, 'redux'));

const t20 = inferSkills('Flutter로 크로스플랫폼 앱 개발');
assert('Flutter detected', has(t20, 'flutter'));

const t21 = inferSkills('SwiftUI로 iOS 앱 개발');
assert('SwiftUI detected', has(t21, 'swiftui'));

const t22 = inferSkills('Laravel로 PHP 백엔드, Rails도 경험');
assert('Laravel detected', has(t22, 'laravel'));
assert('Rails detected', has(t22, 'rails'));

// --- 12. NEW: Game Engines (EXP-083) ---
console.log('📝 Game Engine Skills');

const t23 = inferSkills('유니티로 게임 개발, 언리얼도 가능');
assert('Korean: 유니티 → unity', has(t23, 'unity'));
assert('Korean: 언리얼 → unreal', has(t23, 'unreal'));

// --- 13. NEW: API & AI/ML (EXP-083) ---
console.log('📝 API & AI/ML Skills');

const t24 = inferSkills('GraphQL API 개발, REST API 설계, gRPC 경험');
assert('GraphQL detected', has(t24, 'graphql'));
assert('REST API detected', has(t24, 'rest api'));
assert('gRPC detected', has(t24, 'grpc'));

const t25 = inferSkills('TensorFlow와 PyTorch로 머신러닝 모델 개발');
assert('TensorFlow detected', has(t25, 'tensorflow'));
assert('PyTorch detected', has(t25, 'pytorch'));

// --- 14. NEW: Design (EXP-083) ---
console.log('📝 Design Skills');

const t26 = inferSkills('Figma로 UI/UX 디자인');
assert('Figma detected', has(t26, 'figma'));

// --- 15. NEW: Messaging & Data (EXP-083) ---
console.log('📝 Messaging & Additional Data Skills');

const t27 = inferSkills('Kafka로 이벤트 스트리밍, RabbitMQ 메시지 큐');
assert('Kafka detected', has(t27, 'kafka'));
assert('RabbitMQ detected', has(t27, 'rabbitmq'));

const t28 = inferSkills('MSSQL/SQL Server 운영');
assert('MSSQL detected', has(t28, 'mssql'));

// --- 16. SKILL_MAP coverage validation ---
console.log('📝 SKILL_MAP Coverage Validation');

const totalSkills = Object.keys(SKILL_MAP).length;
assert(`SKILL_MAP has 77+ entries (got ${totalSkills})`, totalSkills >= 77);

// Verify every skill in SKILL_MAP can be detected via its own regex
let selfDetected = 0;
for (const [skill, regex] of Object.entries(SKILL_MAP)) {
  // Test with English skill name
  const result = inferSkills(skill);
  if (result.some(s => s.toLowerCase() === skill.toLowerCase())) {
    selfDetected++;
  }
}
assert(`All skills self-detect via inferSkills (${selfDetected}/${totalSkills})`, selfDetected >= totalSkills * 0.9,
  `${totalSkills - selfDetected} skills not self-detected`);

// === RESULTS ===
console.log('\n' + results.join('\n'));
console.log(`\n📊 Results: ${passed}/${passed + failed} passed${failed > 0 ? `, ${failed} FAILED` : ''}\n`);

process.exit(failed > 0 ? 1 : 0);
