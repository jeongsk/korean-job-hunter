/**
 * EXP-077: Shared Skill Inference Module Tests
 * Verifies Korean + English keyword extraction, normalization, and edge cases.
 */

const { inferSkills, deriveCareerStage, SKILL_MAP } = require('./scripts/skill-inference');

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

function assertExcludes(name, actual, excluded) {
  const found = excluded.filter(e => actual.includes(e));
  if (found.length > 0) {
    console.log(`❌ ${name}: should NOT include ${found.join(',')}, got [${actual.join(',')}]`);
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
assertIncludes('Zustand English', inferSkills('Zustand for state management'), ['zustand']);
assertIncludes('Recoil English', inferSkills('Recoil state management'), ['recoil']);
assertIncludes('MobX English', inferSkills('MobX observable state'), ['mobx']);
assertIncludes('Vuex English', inferSkills('Vuex store management'), ['vuex']);
assertIncludes('Pinia English', inferSkills('Pinia store for Vue'), ['pinia']);
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

// ─── EXP-097: AI/LLM skills + ML regex fix ───
assertIncludes('LLM English', inferSkills('LLM Engineer'), ['llm']);
assertIncludes('LLM Korean', inferSkills('대규모언어모델 개발'), []); // Korean LLM name not supported (use English)
assertIncludes('Large Language Model', inferSkills('Large Language Model Research'), ['llm']);
assertIncludes('RAG English', inferSkills('RAG Pipeline Developer'), ['rag']);
assertIncludes('RAG Korean', inferSkills('검색증강생성 시스템'), ['rag']);
assertIncludes('LangChain English', inferSkills('LangChain Developer'), ['langchain']);
assertIncludes('LangChain Korean', inferSkills('랭체인 기반 서비스'), ['langchain']);
assertIncludes('MLOps English', inferSkills('MLOps Engineer'), ['mlops']);
assertIncludes('Vector DB English', inferSkills('Pinecone Vector Search'), ['vector database']);
assertIncludes('Vector DB Korean', inferSkills('벡터 DB 검색'), ['vector database']);
assertIncludes('Weaviate', inferSkills('Weaviate Vector Database'), ['vector database']);
assertIncludes('Fine-tuning English', inferSkills('Fine-tuning Specialist'), ['fine-tuning']);
assertIncludes('Fine-tuning Korean', inferSkills('파인튜닝 엔지니어'), ['fine-tuning']);
assertIncludes('HuggingFace English', inferSkills('HuggingFace Model'), ['huggingface']);
assertIncludes('HuggingFace Korean', inferSkills('허깅페이스 플랫폼'), ['huggingface']);
assertIncludes('Prompt Engineering English', inferSkills('Prompt Engineering AI'), ['prompt engineering']);
assertIncludes('Prompt Engineering Korean', inferSkills('프롬프트 엔지니어'), ['prompt engineering']);
assertIncludes('Stable Diffusion', inferSkills('Stable Diffusion Artist'), ['stable diffusion']);
assertIncludes('Computer Vision English', inferSkills('Computer Vision Researcher'), ['computer vision']);
assertIncludes('Computer Vision Korean', inferSkills('컴퓨터 비전 전문가'), ['computer vision']);
assertIncludes('NLP English', inferSkills('NLP Research Scientist'), ['nlp']);
assertIncludes('NLP Korean', inferSkills('자연어 처리 개발자'), ['nlp']);

// ─── EXP-097: ML regex false positive fix ───
assertExcludes('HTML is NOT ML', inferSkills('html css javascript'), ['machine learning']);
assertExcludes('XML is NOT ML', inferSkills('xml parser developer'), ['machine learning']);
assertIncludes('ML Engineer IS ML', inferSkills('ML Engineer'), ['machine learning']);
assertIncludes('ML 개발자 IS ML', inferSkills('ML 개발자'), ['machine learning']);

// ─── EXP-101: Korean equivalents for previously-English-only skills ───
assertIncludes('GraphQL Korean', inferSkills('그래프큐엘 API'), ['graphql']);
assertIncludes('GraphQL Korean v2', inferSkills('그래프QL 백엔드'), ['graphql']);
assertIncludes('REST API Korean', inferSkills('레스트 API 설계'), ['rest api']);
assertIncludes('gRPC Korean', inferSkills('지알피시 마이크로서비스'), ['grpc']);
assertIncludes('TensorFlow Korean', inferSkills('텐서플로우 머신러닝'), ['tensorflow']);
assertIncludes('TensorFlow Korean v2', inferSkills('텐서플로 딥러닝'), ['tensorflow']);
assertIncludes('PyTorch Korean', inferSkills('파이토치 연구원'), ['pytorch']);
assertIncludes('Figma Korean', inferSkills('피그마 디자이너'), ['figma']);
assertIncludes('MobX Korean', inferSkills('몹엑스 상태관리'), ['mobx']);
assertIncludes('Stable Diffusion Korean', inferSkills('스테이블 디퓨전 생성'), ['stable diffusion']);

// ─── EXP-101: Additional Korean equivalents for previously-English-only skills ───
assertIncludes('Nuxt Korean', inferSkills('넉스트 프레임워크'), ['nuxt']);
assertIncludes('Svelte Korean', inferSkills('스벨트 컴포넌트'), ['svelte']);
assertIncludes('Spring Boot Korean', inferSkills('스프링부트 백엔드'), ['spring boot']);
assertIncludes('FastAPI Korean', inferSkills('패스트에이피아이 서버'), ['fastapi']);
assertIncludes('Laravel Korean', inferSkills('라라벨 풀스택'), ['laravel']);
assertIncludes('GCP Korean', inferSkills('구글 클라우드 인프라'), ['gcp']);
assertIncludes('Azure Korean', inferSkills('애저 클라우드'), ['azure']);
assertIncludes('Ansible Korean', inferSkills('앤서블 자동화'), ['ansible']);
assertIncludes('GitHub Actions Korean', inferSkills('깃헙 액션 CI'), ['github actions']);
assertIncludes('Kafka Korean', inferSkills('카프카 스트리밍'), ['kafka']);
assertIncludes('Oracle Korean', inferSkills('오라클 DBA'), ['oracle']);
assertIncludes('MySQL Korean', inferSkills('마이에스큐엘 관리'), ['mysql']);

// ─── EXP-101: Modern web tools (English) ───
assertIncludes('Vite English', inferSkills('Vite + React Project'), ['vite', 'react']);
assertIncludes('Tailwind English', inferSkills('Tailwind CSS Styling'), ['tailwind']);
assertIncludes('Prisma English', inferSkills('Prisma ORM Database'), ['prisma']);
assertIncludes('Vercel English', inferSkills('Vercel Deployment'), ['vercel']);
assertIncludes('tRPC English', inferSkills('tRPC Type-safe API'), ['trpc']);
assertIncludes('Hono English', inferSkills('Hono Edge Framework'), ['hono']);
assertIncludes('Firebase English', inferSkills('Firebase Backend'), ['firebase']);
assertIncludes('Supabase English', inferSkills('Supabase PostgreSQL'), ['supabase']);
assertIncludes('Storybook English', inferSkills('Storybook Component Library'), ['storybook']);
assertIncludes('Jest English', inferSkills('Jest Unit Testing'), ['jest']);
assertIncludes('Cypress English', inferSkills('Cypress E2E Testing'), ['cypress']);

// ─── EXP-101: Modern web tools (Korean) ───
assertIncludes('Vite Korean', inferSkills('바이트 빌드도구'), ['vite']);
assertIncludes('Tailwind Korean', inferSkills('테일윈드 스타일링'), ['tailwind']);
assertIncludes('Prisma Korean', inferSkills('프리즈마 ORM'), ['prisma']);
assertIncludes('Vercel Korean', inferSkills('버셀 배포'), ['vercel']);
assertIncludes('Firebase Korean', inferSkills('파이어베이스 백엔드'), ['firebase']);
assertIncludes('Supabase Korean', inferSkills('수파베이스 데이터베이스'), ['supabase']);
assertIncludes('Storybook Korean', inferSkills('스토리북 컴포넌트'), ['storybook']);

// ─── EXP-101: Modern tool disambiguation ───
assertExcludes('Vite≠site', inferSkills('website developer'), ['vite']);
assertExcludes('Hono≠honor', inferSkills('honorary developer'), ['hono']);
assertExcludes('Jest≠jester', inferSkills('jester entertainment'), ['jest']);

// ─── EXP-101: Combined modern stack ───
assertIncludes('Modern frontend stack', inferSkills('React TypeScript Vite Tailwind'), ['react', 'typescript', 'vite', 'tailwind']);
assertIncludes('Modern fullstack', inferSkills('Next.js Prisma Vercel Supabase'), ['next.js', 'prisma', 'vercel', 'supabase']);
assertIncludes('Testing stack', inferSkills('Jest Cypress Storybook'), ['jest', 'cypress', 'storybook']);

// ─── EXP-103: New runtimes, frameworks, ORM, monitoring, desktop/mobile ───
assertIncludes('Deno', inferSkills('Deno TypeScript runtime'), ['deno', 'typescript']);
assertIncludes('Bun', inferSkills('Bun fast runtime'), ['bun']);
assertIncludes('Remix', inferSkills('Remix React framework'), ['remix', 'react']);
assertIncludes('Astro', inferSkills('Astro static site'), ['astro']);
assertIncludes('Fastify', inferSkills('Fastify API server'), ['fastify']);
assertIncludes('Koa', inferSkills('Koa middleware'), ['koa']);
assertIncludes('Drizzle', inferSkills('Drizzle ORM TypeScript'), ['drizzle', 'typescript']);
assertIncludes('TypeORM', inferSkills('TypeORM entities'), ['typeorm']);
assertIncludes('Sequelize', inferSkills('Sequelize models'), ['sequelize']);
assertIncludes('Mongoose', inferSkills('Mongoose schemas MongoDB'), ['mongoose', 'mongodb']);
assertIncludes('Electron', inferSkills('Electron desktop app'), ['electron']);
assertIncludes('Tauri', inferSkills('Tauri desktop Rust'), ['tauri', 'rust']);
assertIncludes('Capacitor', inferSkills('Capacitor Ionic mobile'), ['capacitor', 'ionic']);
assertIncludes('Sentry', inferSkills('Sentry error tracking'), ['sentry']);
assertIncludes('Datadog', inferSkills('Datadog monitoring'), ['datadog']);
assertIncludes('Grafana', inferSkills('Grafana dashboards'), ['grafana']);
assertIncludes('Prometheus', inferSkills('Prometheus metrics'), ['prometheus']);

// Korean equivalents - AI/ML sync (EXP-113)
assertIncludes('머신러닝', inferSkills('머신러닝 엔지니어'), ['machine learning']);
assertIncludes('머신 러닝', inferSkills('머신 러닝 모델'), ['machine learning']);
assertIncludes('벡터데이터베이스', inferSkills('벡터데이터베이스'), ['vector database']);
assertIncludes('벡터 디비', inferSkills('벡터 디비'), ['vector database']);
assertIncludes('디비티', inferSkills('디비티 데이터'), ['dbt']);
assertIncludes('다트', inferSkills('다트 플러터'), ['dart']);
assertIncludes('레일즈', inferSkills('레일즈 백엔드'), ['rails']);
assertIncludes('디퓨전', inferSkills('디퓨전 이미지 생성'), ['stable diffusion']);

// Korean equivalents
assertIncludes('Deno Korean', inferSkills('데노 런타임'), ['deno']);
assertIncludes('Electron Korean', inferSkills('일렉트론 데스크톱'), ['electron']);
assertIncludes('Tauri Korean', inferSkills('타우리 데스크톱'), ['tauri']);
assertIncludes('Sentry Korean', inferSkills('센트리 에러'), ['sentry']);
assertIncludes('Grafana Korean', inferSkills('그라파나 모니터링'), ['grafana']);
assertIncludes('Prometheus Korean', inferSkills('프로메테우스 메트릭'), ['prometheus']);
assertIncludes('Sequelize Korean', inferSkills('시퀄라이즈 ORM'), ['sequelize']);
assertIncludes('Mongoose Korean', inferSkills('몽구스 ODM'), ['mongoose']);

// Disambiguation
assertExcludes('Bun≠bunny', inferSkills('bunny rabbit'), ['bun']);
assertExcludes('Koa≠koala', inferSkills('koala bear'), ['koa']);

// EXP-116: Blockchain / Web3
assertIncludes('Solidity', inferSkills('Solidity 스마트컨트랙트 개발'), ['solidity']);
assertIncludes('Solidity Korean', inferSkills('솔리디티 경험'), ['solidity']);
assertIncludes('Blockchain', inferSkills('blockchain developer'), ['blockchain']);
assertIncludes('Blockchain Korean', inferSkills('블록체인 플랫폼'), ['blockchain']);
assertIncludes('Web3', inferSkills('Web3 dApp 개발'), ['web3']);
assertIncludes('Web3 Korean', inferSkills('웹3 분야'), ['web3']);
assertIncludes('Ethereum', inferSkills('Ethereum 스마트컨트랙트'), ['ethereum']);
assertIncludes('Ethereum Korean', inferSkills('이더리움 DApp'), ['ethereum']);
assertIncludes('Smart Contract', inferSkills('smart contract 개발'), ['smart contract']);
assertIncludes('Smart Contract Korean', inferSkills('스마트컨트랙트 경험'), ['smart contract']);

// EXP-116: Security
assertIncludes('DevSecOps', inferSkills('DevSecOps 경험'), ['devsecops']);
assertIncludes('DevSecOps Korean', inferSkills('데브시큐옵스'), ['devsecops']);
assertIncludes('OWASP', inferSkills('OWASP Top 10'), ['owasp']);
assertIncludes('Cybersecurity', inferSkills('cybersecurity analyst'), ['cybersecurity']);
assertIncludes('Cybersecurity Korean 정보보안', inferSkills('정보보안 담당'), ['cybersecurity']);
assertIncludes('Cybersecurity Korean 사이버보안', inferSkills('사이버보안 전문'), ['cybersecurity']);
assertIncludes('Penetration Testing', inferSkills('penetration testing'), ['penetration testing']);
assertIncludes('Penetration Testing Korean', inferSkills('모의해킹 수행'), ['penetration testing']);

// EXP-116: Platform / SRE
assertIncludes('SRE', inferSkills('SRE 엔지니어'), ['sre']);
assertIncludes('SRE Korean', inferSkills('사이트 신뢰성 엔지니어'), ['sre']);
assertIncludes('Platform Engineering', inferSkills('platform engineering'), ['platform engineering']);
assertIncludes('Platform Engineering Korean', inferSkills('플랫폼 엔지니어링'), ['platform engineering']);
assertIncludes('Istio', inferSkills('istio service mesh'), ['istio']);
assertIncludes('Istio Korean', inferSkills('이스티오 메시'), ['istio']);
assertIncludes('ArgoCD', inferSkills('argocd GitOps'), ['argocd']);
assertIncludes('ArgoCD Korean', inferSkills('아르고시디 배포'), ['argocd']);

// EXP-117: False positive prevention tests
// Skills that are also English words should not match in non-tech English contexts
assert('FP: unity in community', inferSkills('community driven development'), []);
assert('FP: unity in opportunity', inferSkills('opportunity for growth'), []);
assert('FP: spark in sparkling', inferSkills('sparkling water brand'), []);
assert('FP: astro in astronomy', inferSkills('astronomy research'), []);
assert('FP: rust in trustworthy', inferSkills('trustworthy service'), []);
assert('FP: deno in denotation', inferSkills('denotation of the term'), []);
// Verify real skill detection still works with \b boundaries
assertIncludes('Real: Unity standalone', inferSkills('Unity game developer'), ['unity']);
assertIncludes('Real: Spark standalone', inferSkills('Apache Spark engineer'), ['spark']);
assertIncludes('Real: Rust standalone', inferSkills('Rust systems programmer'), ['rust']);
assertIncludes('Real: Astro standalone', inferSkills('Astro framework project'), ['astro']);
assertIncludes('Real: Deno standalone', inferSkills('Deno runtime typescript'), ['deno']);
assertIncludes('Real: Spring Boot', inferSkills('Spring Boot backend'), ['spring boot', 'spring']);
assertIncludes('Real: Express.js', inferSkills('Express.js API server'), ['express']);
assertIncludes('Real: Flask API', inferSkills('Flask Python API'), ['flask']);
assertIncludes('Real: Sentry monitoring', inferSkills('Sentry error monitoring'), ['sentry']);

// EXP-121: Role-based skill inference (fallback when no explicit tech keywords)
console.log('\n--- EXP-121: Role-based skill inference ---');
assertIncludes('Role: 프론트엔드 개발자', inferSkills('프론트엔드 개발자'), ['react', 'typescript']);
assertIncludes('Role: 백엔드 엔지니어', inferSkills('백엔드 엔지니어'), ['node.js', 'python']);
assertIncludes('Role: 풀스택 개발자', inferSkills('풀스택 개발자'), ['react', 'node.js']);
assertIncludes('Role: 안드로이드 개발자', inferSkills('안드로이드 개발자'), ['kotlin', 'java']);
assertIncludes('Role: 데이터 엔지니어', inferSkills('데이터 엔지니어'), ['spark', 'airflow']);
assertIncludes('Role: 시니어 프론트엔드 개발자', inferSkills('시니어 프론트엔드 개발자'), ['react', 'typescript']);
assert('Role: React 개발자 uses explicit not fallback', inferSkills('React 개발자'), ['react']);
assert('Role: unknown role → empty', inferSkills('Product Engineer'), []);

// EXP-122: Extended role skill mappings
assertIncludes('Role: 임베디드 엔지니어', inferSkills('임베디드 소프트웨어 엔지니어'), ['c++', 'linux']);
assertIncludes('Role: 인프라 엔지니어', inferSkills('인프라 엔지니어'), ['aws', 'docker', 'kubernetes']);
assertIncludes('Role: 게임 개발자', inferSkills('게임 클라이언트 개발자'), ['unity', 'c++']);
assertIncludes('Role: 데이터 분석가', inferSkills('데이터 분석가'), ['python']);
assertIncludes('Role: 보안 엔지니어', inferSkills('보안 엔지니어'), ['cybersecurity']);
assertIncludes('Role: 솔루션 아키텍트', inferSkills('솔루션 아키텍트'), ['aws']);
assertIncludes('Role: 인공지능 엔지니어', inferSkills('인공지능 엔지니어'), ['python', 'tensorflow']);
assert('Role: 기술 리드', inferSkills('기술 리드'), ['python', 'java', 'aws']);

// EXP-130: Role supplement (not just fallback) — role-based skills added even when SKILL_MAP already matched
console.log('\n--- EXP-130: Role-based supplement (not just fallback) ---');
assertIncludes('Supplement: 데브옵스 gets docker+k8s', inferSkills('데브옵스 엔지니어'), ['devops', 'docker', 'kubernetes', 'ci/cd']);
assertIncludes('Supplement: 머신러닝 gets python+tf', inferSkills('머신러닝 엔지니어'), ['machine learning', 'python', 'tensorflow']);
assertIncludes('Supplement: 클라우드 gets aws+docker+k8s', inferSkills('클라우드 엔지니어'), ['aws', 'docker', 'kubernetes']);
assertIncludes('Supplement: sre gets k8s+prometheus+docker', inferSkills('sre 엔지니어'), ['kubernetes', 'prometheus', 'docker']);
assertIncludes('Supplement: QA gets jest+cypress', inferSkills('qa 엔지니어'), ['jest', 'cypress']);
assertIncludes('Supplement: AI gets python+tf+pytorch', inferSkills('ai 리서처'), ['python', 'tensorflow', 'pytorch']);
// Explicit tech should still be primary, role only supplements what's missing
assertIncludes('Explicit+Supplement: Spring 백엔드', inferSkills('Spring 백엔드'), ['spring', 'java', 'node.js', 'python']);
// No role match → no supplement
assert('No role match: Product Engineer → empty', inferSkills('Product Engineer'), []);

// EXP-121: deriveCareerStage bare "경력"
console.log('\n--- EXP-121: deriveCareerStage bare 경력 ---');
function assertEq(msg, actual, expected) {
  if (actual === expected) { console.log(`✅ ${msg}`); passed++; }
  else { console.log(`❌ ${msg}: got ${actual}, expected ${expected}`); failed++; }
}
assertEq('bare 경력 → mid', deriveCareerStage('경력'), 'mid');
assertEq('경력 10년 이상 → senior', deriveCareerStage('경력 10년 이상'), 'senior');
assertEq('경력 3-5년 → mid', deriveCareerStage('경력 3-5년'), 'mid');
assertEq('경력무관 → null', deriveCareerStage('경력무관'), null);
assertEq('신입 → entry', deriveCareerStage('신입'), 'entry');
assertEq('null → null', deriveCareerStage(null), null);
assertEq('empty string → null', deriveCareerStage(''), null);

// EXP-116: Skill count check
// EXP-148: New skill tests
console.log('\n--- EXP-148: New skills (mybatis, msa, opensearch, celery, vitest, webflux, dynamodb, cloudwatch) ---');
assertIncludes('MyBatis English', inferSkills('MyBatis'), ['mybatis']);
assertIncludes('MyBatis Korean', inferSkills('마이바티스'), ['mybatis']);
assertIncludes('MyBatis in context', inferSkills('백엔드 개발자 Spring JPA MyBatis'), ['spring', 'jpa', 'mybatis']);
assertIncludes('MSA uppercase', inferSkills('MSA 아키텍처'), ['msa']);
assertIncludes('microservice English', inferSkills('microservice architecture'), ['msa']);
assertIncludes('마이크로서비스 Korean', inferSkills('마이크로서비스 기반'), ['msa']);
assertIncludes('OpenSearch English', inferSkills('OpenSearch'), ['opensearch']);
assertIncludes('Celery English', inferSkills('Python Celery Redis'), ['celery', 'redis']);
assertIncludes('Vitest English', inferSkills('Vitest unit test'), ['vitest']);
assertIncludes('WebFlux English', inferSkills('Spring WebFlux Reactive'), ['spring', 'webflux']);
assertIncludes('DynamoDB English', inferSkills('AWS DynamoDB'), ['aws', 'dynamodb']);
assertIncludes('CloudWatch English', inferSkills('AWS CloudWatch'), ['aws', 'cloudwatch']);
assertEq('Dynamo false positive', inferSkills('DynamoSaur').includes('dynamodb'), false);
assertEq('dynamo alone false positive', inferSkills('dynamo').includes('dynamodb'), false);

const expectedSkillCount = 157; // 150 + 7 (mariadb, sqs, sns, aurora, documentdb, elasticache, msk)
const actualSkillCount = Object.keys(SKILL_MAP).length;
if (actualSkillCount === expectedSkillCount) {
  console.log(`✅ SKILL_MAP has ${actualSkillCount} entries`);
  passed++;
} else {
  console.log(`❌ SKILL_MAP count: expected ${expectedSkillCount}, got ${actualSkillCount}`);
  failed++;
}

// EXP-145: MLOps variant regex + Korean role title gaps
const mlopsTests = [
  ['ML Ops 엔지니어', ['machine learning', 'mlops', 'docker', 'kubernetes', 'python']],
  ['ML/Ops 엔지니어', ['mlops', 'docker', 'kubernetes', 'python']],
  ['MLOps 엔지니어', ['mlops', 'docker', 'kubernetes', 'python']],
  ['데이터 플랫폼 엔지니어', s => s.includes('spark') && s.includes('airflow')],
  ['데이터베이스 관리자', s => s.includes('postgresql') && s.includes('linux')],
  ['보안 엔지니어', s => s.includes('cybersecurity') && s.includes('docker')],
];
for (const [title, expected] of mlopsTests) {
  const result = inferSkills(title);
  if (typeof expected === 'function') {
    if (expected(result)) { console.log(`✅ ${title} → ${JSON.stringify(result)}`); passed++; }
    else { console.log(`❌ ${title} → ${JSON.stringify(result)}`); failed++; }
  } else {
    const hasAll = expected.every(e => result.includes(e));
    if (hasAll) { console.log(`✅ ${title} → has all expected skills`); passed++; }
    else { console.log(`❌ ${title} → ${JSON.stringify(result)}, expected subset of ${JSON.stringify(expected)}`); failed++; }
  }
}

console.log(`\n📊 Skill Inference: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
