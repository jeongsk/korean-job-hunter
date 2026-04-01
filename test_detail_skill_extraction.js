/**
 * EXP-059: Detail-Page Skill Extraction
 * 
 * Title-based inference (EXP-052) only works on job titles.
 * Detail pages have rich qualification/requirements text with explicit tech mentions.
 * This test validates extracting skills from full job description text.
 */

import assert from 'assert';

// === Detail-Page Skill Extraction ===

const SKILL_PATTERNS = {
  // Languages
  'javascript': { re: /\bjavascript\b|자바스크립트|\bjs\b(?!\s*추)|자스/i, exclude: /\btype\s*script/i },
  'typescript': { re: /\btypescript\b|타입스크립트|\bts\b(?!\s*(추|구|급|간|간|작|험))/i },
  'python': { re: /\bpython\b|파이썬/i },
  'java': { re: /\bjava\b(?!script)|자바(?!스크립트)/i },
  'go': { re: /\bgolang\b|\bgo\s*언어|고언어/i },
  'rust': { re: /\brust\b|러스트/i },
  'c++': { re: /\bc\+\+\b|cpp/i },
  'c#': { re: /\bc#\b|csharp/i },
  'swift': { re: /\bswift\b(?!ui)|스위프트/i },
  'kotlin': { re: /\bkotlin\b|코틀린/i },
  'ruby': { re: /\bruby\b|루비/i },
  'php': { re: /\bphp\b/i },
  'scala': { re: /\bscala\b|스칼라/i },
  'dart': { re: /\bdart\b|다트/i },
  'r': { re: /\br\s*(언어|language)|\brlang\b/i },
  // Frameworks & Libraries
  'react': { re: /\breact\b(?!ive)|리액트/i },
  'vue': { re: /\bvue\.?js?\b|뷰\.?js?/i },
  'angular': { re: /\bangular\b|앵귤러/i },
  'next.js': { re: /\bnext\.?js?\b|넥스트/i },
  'node.js': { re: /\bnode\.?js?\b|노드\.?js?/i },
  'express': { re: /\bexpress\b(?!\s*(ion|직))|익스프레스/i },
  'spring': { re: /\bspring\b(?!\s*(boot))/i, also: /\bspring\s*framework\b|스프링\s*프레임워크/i },
  'spring_boot': { re: /\bspring\s*boot\b|스프링\s*부트/i },
  'django': { re: /\bdjango\b|장고/i },
  'flask': { re: /\bflask\b|플라스크/i },
  'fastapi': { re: /\bfastapi\b/i },
  'flutter': { re: /\bflutter\b|플러터/i },
  'swiftui': { re: /\bswiftui\b/i },
  'nestjs': { re: /\bnest\.?js?\b|네스트/i },
  'react_native': { re: /\breact\s*native\b|리액트\s*네이티브/i },
  // Databases
  'mysql': { re: /\bmysql\b/i },
  'postgresql': { re: /\bpostgresql\b|\bpostgres\b/i },
  'mongodb': { re: /\bmongodb\b|mongo\s*db/i },
  'redis': { re: /\bredis\b|레디스/i },
  'elasticsearch': { re: /\belasticsearch\b|elastic\s*search/i },
  'oracle': { re: /\boracle\s*db|\boracle\b/i },
  'mssql': { re: /\bmssql\b|ms\s*sql/i },
  // Infrastructure
  'aws': { re: /\baws\b(?!\s*(삼성|인증))/i },
  'gcp': { re: /\bgcp\b|google\s*cloud/i },
  'azure': { re: /\bazure\b/i },
  'docker': { re: /\bdocker\b|도커/i },
  'kubernetes': { re: /\bkubernetes\b|\bk8s\b|쿠버네티스/i },
  'terraform': { re: /\bterraform\b|테라폼/i },
  'jenkins': { re: /\bjenkins\b|젠킨스/i },
  'github_actions': { re: /\bgithub\s*actions?\b/i },
  'nginx': { re: /\bnginx\b/i },
  'kafka': { re: /\bkafka\b|카프카/i },
  'rabbitmq': { re: /\brabbitmq\b/i },
  'graphql': { re: /\bgraphql\b/i },
  'rest_api': { re: /\brest\s*api\b/i },
  'grpc': { re: /\bgrpc?\b/i },
  // Data & ML
  'tensorflow': { re: /\btensorflow\b/i },
  'pytorch': { re: /\bpytorch\b|파이토치/i },
  'pandas': { re: /\bpandas\b|판다스/i },
  'spark': { re: /\bapache\s*spark\b|\bspark\b(?!\s*(SQL))/i },
  'hadoop': { re: /\bhadoop\b/i },
};

function extractSkillsFromDetail(text) {
  if (!text || typeof text !== 'string') return [];
  const found = new Set();
  
  for (const [skill, config] of Object.entries(SKILL_PATTERNS)) {
    const mainMatch = config.re.test(text);
    const alsoMatch = config.also ? config.also.test(text) : false;
    if (mainMatch || alsoMatch) {
      found.add(skill);
    }
  }
  
  // Deduplicate: spring_boot implies spring; remove bare spring if spring_boot found
  if (found.has('spring_boot')) found.delete('spring');
  // react_native implies react context but is distinct skill — keep both
  
  return [...found].sort();
}

// === Test Cases ===

const tests = [
  {
    name: 'Wanted Backend JD - Java/Kotlin/Spring',
    text: `자격요건
ㆍJava, Kotlin, Spring Framework/Spring Boot 기반의 백엔드 개발 경험이 풍부하신 분
ㆍ대규모 트래픽 환경 또는 다수 사용자가 이용하는 서비스의 백엔드 아키텍처 설계 및 운영 경험이 있으신 분
ㆍREST API, 데이터 모델링, 비즈니스 로직, 트랜잭션 처리 구조를 안정적으로 설계할 수 있으신 분
ㆍRDBMS(MySQL, PostgreSQL, MSSQL 등) 설계 및 최적화 경험이 있으신 분
ㆍ비동기 처리, 배치, 캐시, 메시지 큐 등을 활용한 서비스 운영 구조를 이해하고 적용해보신 분`,
    expected: ['java', 'kotlin', 'mssql', 'mysql', 'postgresql', 'rest_api', 'spring_boot'],
  },
  {
    name: 'React Frontend JD',
    text: `자격요건
- React, TypeScript 기반 프론트엔드 개발 경험 3년 이상
- Next.js, Redux 상태관리 경험
- HTML5, CSS3, JavaScript ES6+ 숙련`,
    expected: ['javascript', 'next.js', 'react', 'typescript'],
  },
  {
    name: 'DevOps JD',
    text: `자격요건
- AWS, Docker, Kubernetes를 활용한 인프라 구축 및 운영 경험
- CI/CD 파이프라인 구축 (Jenkins, GitHub Actions)
- Terraform을 활용한 IaC 경험
- Nginx, Kafka 경험`,
    expected: ['aws', 'docker', 'github_actions', 'jenkins', 'kafka', 'kubernetes', 'nginx', 'terraform'],
  },
  {
    name: 'Data Engineer JD',
    text: `자격요건
- Python, Spark, Hadoop 기반 데이터 파이프라인 개발
- PostgreSQL, Redis, Elasticsearch 운영 경험
- Kafka 기반 실시간 데이터 처리`,
    expected: ['elasticsearch', 'hadoop', 'kafka', 'postgresql', 'python', 'redis', 'spark'],
  },
  {
    name: 'Mobile JD - Flutter',
    text: `자격요건
- Flutter, Dart 기반 크로스플랫폼 앱 개발 경험
- React Native 경험자 우대`,
    expected: ['dart', 'flutter', 'react', 'react_native'],
  },
  {
    name: 'Empty/minimal text',
    text: '채용 공고입니다.',
    expected: [],
  },
  {
    name: 'Java/JavaScript disambiguation',
    text: 'Java 백엔드와 JavaScript 프론트엔드 개발 경험',
    expected: ['java', 'javascript'],
  },
  {
    name: 'Korean equivalents',
    text: '파이썬, 도커, 쿠버네티스, 카프카 경험 필수',
    expected: ['docker', 'kafka', 'kubernetes', 'python'],
  },
  {
    name: 'Spring vs Spring Boot',
    text: 'Spring Boot 기반 마이크로서비스 개발',
    expected: ['spring_boot'],
  },
  {
    name: 'Bare Spring (no Boot)',
    text: 'Spring Framework 기반 웹 애플리케이션 개발',
    expected: ['spring'],
  },
  {
    name: 'MSSQL extraction',
    text: 'RDBMS(MSSQL) 운영 경험',
    expected: ['mssql'],
  },
  {
    name: 'Live Wanted detail: 누리미디어 백엔드',
    text: `누리미디어(DBpia)∙서울 마포구∙경력 10-12년
[개발운영] 백엔드 개발자 (10년이상)
Java, Kotlin, Spring Framework/Spring Boot 기반의 백엔드 개발 경험이 풍부하신 분
REST API, 데이터 모델링, 비즈니스 로직, 트랜잭션 처리
RDBMS(MySQL, PostgreSQL, MSSQL 등) 설계 및 최적화 경험`,
    expected: ['java', 'kotlin', 'mssql', 'mysql', 'postgresql', 'rest_api', 'spring_boot'],
  },
];

// === Run Tests ===

let passed = 0;
let failed = 0;

for (const test of tests) {
  const result = extractSkillsFromDetail(test.text);
  const missing = test.expected.filter(s => !result.includes(s));
  const extra = result.filter(s => !test.expected.includes(s));
  
  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${test.name}`);
    passed++;
  } else {
    console.log(`❌ ${test.name}`);
    if (missing.length) console.log(`   Missing: ${missing.join(', ')}`);
    if (extra.length) console.log(`   Extra: ${extra.join(', ')}`);
    console.log(`   Expected: ${test.expected.join(', ')}`);
    console.log(`   Got:      ${result.join(', ')}`);
    failed++;
  }
}

console.log(`\n📊 Detail skill extraction: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
