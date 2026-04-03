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
  'javascript': { re: /\bjavascript\b|자바스크립트|(?<![\w.])\bjs\b(?!\s*추)|자스/i, exclude: /\btype\s*script/i },
  'typescript': { re: /\btypescript\b|타입스크립트|\bts\b(?!\s*(추|구|급|간|간|작|험))/i },
  'python': { re: /\bpython\b|파이썬/i },
  'java': { re: /\bjava\b(?!script)|자바(?!스크립트)/i },
  'go': { re: /\bgolang\b|\bgo\s*언어|고언어/i },
  'rust': { re: /\brust\b|러스트/i },
  'c++': { re: /c\+\+|\bcpp\b/i },
  'c#': { re: /c#|csharp/i },
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
  'elasticsearch': { re: /\belasticsearch\b|elastic\s*search|엘라스틱서치/i },
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
  'github_actions': { re: /\bgithub\s*actions?\b/i }, // key is github_actions but skill-inference uses 'github actions'
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
  // === EXP-065: Expanded coverage for previously-untested patterns ===
  {
    name: 'Go/Golang backend JD',
    text: `자격요건
- Golang 기반 마이크로서비스 개발 경험 3년 이상
- Docker, Kubernetes 활용 경험
- gRPC 통신 프로토콜 경험`,
    expected: ['docker', 'go', 'grpc', 'kubernetes'],
  },
  {
    name: 'Rust systems engineer JD',
    text: `자격요건
- Rust 언어 기반 시스템 프로그래밍 경험
- C++ 저수준 개발 경험
- Linux 커널 이해`,
    expected: ['c++', 'rust'],
  },
  {
    name: 'Vue.js frontend JD',
    text: `자격요건
- Vue.js, Nuxt.js 기반 프론트엔드 개발 경험
- TypeScript 숙련
- HTML5, CSS3 경험`,
    expected: ['typescript', 'vue'],
  },
  {
    name: 'Angular enterprise JD',
    text: `자격요건
- Angular 프레임워크 기반 대규모 웹 애플리케이션 개발
- RxJS, NgRx 상태관리 경험`,
    expected: ['angular'],
  },
  {
    name: 'Django backend JD',
    text: `자격요건
- Python, Django 기반 웹 서비스 개발 경험
- PostgreSQL, Redis 활용
- Celery 비동기 처리 경험`,
    expected: ['django', 'postgresql', 'python', 'redis'],
  },
  {
    name: 'FastAPI ML serving JD',
    text: `자격요건
- Python, FastAPI 기반 ML 모델 서빙 파이프라인
- Docker 컨테이너 배포
- TensorFlow 또는 PyTorch 모델 서빙 경험`,
    expected: ['docker', 'fastapi', 'python', 'pytorch', 'tensorflow'],
  },
  {
    name: 'Flask lightweight JD',
    text: `자격요건
- Flask 기반 REST API 개발 경험
- SQLAlchemy ORM 경험`,
    expected: ['flask', 'rest_api'],
  },
  {
    name: 'GCP cloud engineer JD',
    text: `자격요건
- Google Cloud Platform 인프라 구축 및 운영
- Docker, Kubernetes를 활용한 컨테이너 오케스트레이션
- Terraform IaC 경험`,
    expected: ['docker', 'gcp', 'kubernetes', 'terraform'],
  },
  {
    name: 'Azure .NET JD',
    text: `자격요건
- Azure 클라우드 서비스 활용 경험
- C# 기반 백엔드 개발 경험`,
    expected: ['azure', 'c#'],
  },
  {
    name: 'Swift/SwiftUI iOS JD',
    text: `자격요건
- Swift 언어 기반 iOS 앱 개발 경험 3년 이상
- SwiftUI 프레임워크 활용 UI 개발`,
    expected: ['swift', 'swiftui'],
  },
  {
    name: 'Scala data engineering JD',
    text: `자격요건
- Scala, Spark 기반 대규모 데이터 파이프라인 개발
- Kafka 실시간 스트리밍 처리
- Hadoop 에코시스템 이해`,
    expected: ['hadoop', 'kafka', 'scala', 'spark'],
  },
  {
    name: 'Ruby on Rails JD',
    text: `자격요건
- Ruby on Rails 기반 웹 서비스 개발 경험
- PostgreSQL 데이터베이스 경험`,
    expected: ['postgresql', 'ruby'],
  },
  {
    name: 'PHP/Laravel JD',
    text: `자격요건
- PHP, Laravel 프레임워크 기반 백엔드 개발
- MySQL 데이터베이스 운영`,
    expected: ['mysql', 'php'],
  },
  {
    name: 'NestJS backend JD',
    text: `자격요건
- NestJS 프레임워크 기반 백엔드 개발 경험
- TypeScript, GraphQL API 설계
- PostgreSQL, Redis 캐싱`,
    expected: ['graphql', 'nestjs', 'postgresql', 'redis', 'typescript'],
  },
  {
    name: 'RabbitMQ messaging JD',
    text: `자격요건
- RabbitMQ 메시지 큐 기반 비동기 처리 아키텍처 설계
- Node.js 백엔드 개발 경험`,
    expected: ['node.js', 'rabbitmq'],
  },
  {
    name: 'Oracle DBA JD',
    text: `자격요건
- Oracle DB 성능 튜닝 및 운영 경험
- PL/SQL 프로시저 개발`,
    expected: ['oracle'],
  },
  {
    name: 'TensorFlow/PyTorch ML JD',
    text: `자격요건
- TensorFlow, PyTorch 기반 딥러닝 모델 개발
- Pandas, Spark 데이터 전처리`,
    expected: ['pandas', 'pytorch', 'spark', 'tensorflow'],
  },
  {
    name: 'GraphQL + gRPC JD',
    text: `자격요건
- GraphQL API 개발 및 Apollo Server 운영
- gRPC 기반 마이크로서비스 통신`,
    expected: ['graphql', 'grpc'],
  },
  {
    name: 'Korean equivalents extended',
    text: `자격요건
- 루비 온 레일즈 경험
- 러스트 시스템 프로그래밍
- 스위프트 iOS 개발
- 코틀린 안드로이드 개발`,
    expected: ['kotlin', 'ruby', 'rust', 'swift'],
  },
  {
    name: 'Mixed Korean+English tech terms',
    text: `자격요건
- 파이썬 백엔드 개발 (Django/Flask)
- 도커 컨테이너 배포
- 엘라스틱서치 검색 엔진 운영
- 레디스 캐싱`,
    expected: ['django', 'docker', 'elasticsearch', 'flask', 'python', 'redis'],
  },
  {
    name: 'Nuxt.js implies Vue context (explicit Vue mention)',
    text: `자격요건
- Nuxt.js 기반 Vue.js 프론트엔드 개발`,
    expected: ['vue'],
  },
  {
    name: 'React Native without bare React (no overlap)',
    text: `자격요건
- React Native 기반 하이브리드 앱 개발
- iOS 네이티브 모듈 연동`,
    expected: ['react', 'react_native'],
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
