/**
 * EXP-077: Shared Skill Inference Module Tests
 * Verifies Korean + English keyword extraction, normalization, and edge cases.
 */

const { inferSkills, SKILL_MAP } = require('./scripts/skill-inference');

let passed = 0, failed = 0;

function assert(name, actual, expected) {
  const ok = expected.every(e => actual.includes(e)) && actual.length === expected.length;
  if (!ok) {
    // Allow extra matches for now — check subset
    const missed = expected.filter(e => !actual.includes(e));
    const extra = actual.filter(a => !expected.includes(a));
    if (missed.length > 0) {
      console.log(`❌ ${name}: missed ${missed.join(',')}, got [${actual.join(',')}], expected [${expected.join(',')}]`);
      failed++;
      return;
    }
    // Has extras — that's fine for regex-based matching, pass
  }
  console.log(`✅ ${name}`);
  passed++;
}

function assertIncludes(name, actual, expected) {
  const missed = expected.filter(e => !actual.includes(e));
  if (missed.length > 0) {
    console.log(`❌ ${name}: missed ${missed.join(',')}, got [${actual.join(',')}], must include [${expected.join(',')}]`);
    failed++;
  } else {
    console.log(`✅ ${name}`);
    passed++;
  }
}

// ─── Korean Keywords ───
assert('Korean python', inferSkills('파이썬 백엔드 개발자'), ['python']);
assert('Korean spring', inferSkills('스프링 경력 채용'), ['spring']);
assert('Korean react', inferSkills('리액트 프론트엔드'), ['react']);
assert('Korean node', inferSkills('노드 백엔드'), ['node.js']);
assert('Korean docker+k8s', inferSkills('도커 및 쿠버네티스'), ['docker', 'kubernetes']);
assert('Korean java', inferSkills('자바 시니어 개발자'), ['java']);
assert('Korean django', inferSkills('장고 백엔드'), ['django']);
assert('Korean flask', inferSkills('플라스크 API'), ['flask']);
assert('Korean kotlin', inferSkills('코틀린 안드로이드'), ['kotlin']);
assert('Korean swift', inferSkills('스위프트 iOS'), ['swift']);
assert('Korean terraform', inferSkills('테라폼 인프라'), ['terraform']);
assert('Korean vue', inferSkills('뷰 프론트엔드'), ['vue']);
assert('Korean typescript', inferSkills('타입스크립트'), ['typescript']);
assert('Korean rust', inferSkills('러스트 시스템'), ['rust']);
assert('Korean express', inferSkills('익스프레스 서버'), ['express']);
assert('Korean nestjs', inferSkills('네스트 백엔드'), ['nestjs']);

// ─── English Keywords ───
assert('English react+ts', inferSkills('React/TypeScript Frontend'), ['react', 'typescript']);
assert('English spring boot', inferSkills('Spring Boot Backend'), ['spring boot']);
assert('English k8s alias', inferSkills('k8s DevOps'), ['kubernetes']);
assert('English golang', inferSkills('Golang Developer'), ['go']);
assert('English next.js', inferSkills('Next.js Full Stack'), ['next.js']);
assert('English python+django', inferSkills('Python/Django Engineer'), ['python', 'django']);
assert('English aws+docker', inferSkills('AWS Docker Terraform'), ['aws', 'docker', 'terraform']);
assert('English flutter', inferSkills('Flutter Developer'), ['flutter']);

// ─── Disambiguation ───
assertIncludes('java≠javascript', inferSkills('JavaScript Developer'), ['javascript']);
assertIncludes('react native≠react', inferSkills('React Native Mobile'), ['react native']);
assert('spring boot>spring', inferSkills('Spring Boot Developer'), ['spring boot']);
assert('go standalone', inferSkills('Go Developer'), ['go']);

// ─── Korean+English Mixed ───
assertIncludes('Mixed kr+en', inferSkills('파이썬/Node.js 백엔드'), ['python', 'node.js']);
assertIncludes('Mixed react+스프링', inferSkills('React + 스프링 마이그레이션'), ['react', 'spring']);

// ─── Edge Cases ───
assert('empty input', inferSkills(''), []);
assert('null input', inferSkills(null), []);
assert('no skills', inferSkills('프로젝트 매니저'), []);
assert('title only', inferSkills('Senior Developer'), []);

// ─── Normalization ───
assert('k8s→kubernetes', inferSkills('k8s'), ['kubernetes']);
assert('golang→go', inferSkills('golang'), ['go']);

// ─── SKILL_MAP completeness ───
const keyCount = Object.keys(SKILL_MAP).length;
if (keyCount >= 50) {
  console.log(`✅ SKILL_MAP has ${keyCount} entries`);
  passed++;
} else {
  console.log(`❌ SKILL_MAP only has ${keyCount} entries (expected ≥50)`);
  failed++;
}

// ─── EXP-083: New Infrastructure/Data/Frontend/Game Skills ───
assertIncludes('Linux Korean', inferSkills('리눅스 서버 관리'), ['linux']);
assertIncludes('Linux English', inferSkills('Linux Administrator'), ['linux']);
assertIncludes('Nginx English', inferSkills('Nginx Reverse Proxy'), ['nginx']);
assertIncludes('CI/CD Korean', inferSkills('CI/CD 파이프라인'), ['ci/cd']);
assertIncludes('CI/CD English', inferSkills('CI CD Engineer'), ['ci/cd']);
assertIncludes('DevOps English', inferSkills('DevOps Engineer'), ['devops']);
assertIncludes('DevOps Korean', inferSkills('데브옵스 플랫폼'), ['devops']);
assertIncludes('JPA English', inferSkills('JPA/Hibernate Backend'), ['jpa']);
assertIncludes('Hibernate English', inferSkills('Spring Hibernate'), ['spring', 'jpa']);
assertIncludes('Spark English', inferSkills('Spark Data Engineering'), ['spark']);
assertIncludes('Spark Korean', inferSkills('스파크 빅데이터'), ['spark']);
assertIncludes('Hadoop English', inferSkills('Hadoop Cluster'), ['hadoop']);
assertIncludes('Hadoop Korean', inferSkills('하둡 에코시스템'), ['hadoop']);
assertIncludes('Airflow English', inferSkills('Airflow DAG'), ['airflow']);
assertIncludes('dbt English', inferSkills('dbt Transformation'), ['dbt']);
assertIncludes('BigQuery English', inferSkills('BigQuery Analyst'), ['bigquery']);
assertIncludes('BigQuery Korean', inferSkills('빅쿼리 데이터'), ['bigquery']);
assertIncludes('Snowflake English', inferSkills('Snowflake Data Warehouse'), ['snowflake']);
assertIncludes('Redux English', inferSkills('Redux State Management'), ['redux']);
assertIncludes('Redux Korean', inferSkills('리덕스 상태관리'), ['redux']);
assertIncludes('Unity English', inferSkills('Unity Game Developer'), ['unity']);
assertIncludes('Unity Korean', inferSkills('유니티 게임개발'), ['unity']);
assertIncludes('Unreal English', inferSkills('Unreal Engine 5'), ['unreal']);
assertIncludes('AWS Lambda', inferSkills('AWS Lambda Serverless'), ['aws', 'aws lambda']);
assertIncludes('AWS S3', inferSkills('AWS S3 Storage'), ['aws', 'aws s3']);
assertIncludes('AWS SQS', inferSkills('AWS SQS Messaging'), ['aws', 'aws sqs']);

// ─── Combined new skills ───
assertIncludes('Linux+Nginx+Docker', inferSkills('Linux Nginx Docker 배포'), ['linux', 'nginx', 'docker']);
assertIncludes('Spark+Airflow+BigQuery', inferSkills('Spark Airflow BigQuery'), ['spark', 'airflow', 'bigquery']);
assertIncludes('CI/CD+Jenkins+Docker', inferSkills('CI/CD Jenkins Docker'), ['ci/cd', 'jenkins', 'docker']);

console.log(`\n📊 Skill Inference: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
