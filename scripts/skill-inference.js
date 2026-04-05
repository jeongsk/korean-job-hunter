/**
 * Shared skill inference module.
 * Extracts technology keywords from job titles and descriptions.
 * Supports Korean equivalents (파이썬→python, 스프링→spring, etc.)
 *
 * EXP-083: Added Linux, Nginx, CI/CD, DevOps, Spark, Hadoop, Airflow, dbt, JPA, Redux, Unity, Unreal, BigQuery, Snowflake, AWS Lambda/S3/SQS.
 * EXP-097: Fixed ML regex false positive (html/xml), added AI/LLM skills (llm, rag, langchain, mlops, vector db, fine-tuning, huggingface, prompt engineering, stable diffusion, computer vision, nlp).
 * EXP-101: Added Korean equivalents for 8 skills (graphql, rest api, grpc, tensorflow, pytorch, figma, mobx, stable diffusion). Added 8 modern Korean job market tools (vite, tailwind, prisma, vercel, trpc, hono, firebase, supabase).
 * This is the single source of truth for skill pattern matching.
 */

// Skill patterns: canonical name → [regex patterns]
// Order matters: longer/more-specific patterns should come first
const SKILL_MAP = {
  // Languages
  'react native': /react\s*native/i,
  'react': /react(?!ive)|리액트/i,
  'typescript': /typescript|타입스크립트| ts(?=\s|$|,|\/)/i,
  'javascript': /javascript|자바스크립트|(?<!\w)js(?!\w)/i,
  'python': /python|파이썬/i,
  'java': /java(?!script)|자바(?!스크립트)/i,
  'go': /golang|고언어|go언어|(?<!\w)go(?!\w)/i,
  'rust': /\brust\b|러스트/i,
  'c++': /c\+\+|cpp/i,
  'c#': /c#|csharp|시샵/i,
  'swift': /swift|스위프트/i,
  'kotlin': /kotlin|코틀린/i,
  'ruby': /ruby|루비/i,
  'php': /php/i,
  'dart': /(?<!\w)dart(?!\w)|다트(?![가-힣])/i,
  'r': /(?<!\w)r\s*language|(?<!\w)rlang|(?<=\s)r(?=\s|$)/i,

  // Frameworks
  'next.js': /next\.?js|넥스트/i,
  'nuxt': /nuxt|넉스트/i,
  'vue': /vue(?:\.?js)?|뷰(?![가-힣])/i,
  'angular': /angular|앵귤러/i,
  'svelte': /svelte|스벨트/i,
  'node.js': /node\.?js|노드/i,
  'express': /\bexpress\b|익스프레스/i,
  'nestjs': /nest\.?js|네스트/i,
  'spring boot': /spring\s*boot|스프링부트/i,
  'spring': /\bspring\b|스프링/i,
  'django': /django|장고/i,
  'flask': /\bflask\b|플라스크/i,
  'fastapi': /fastapi|패스트에이피아이/i,
  'flutter': /flutter|플러터/i,
  'swiftui': /swiftui/i,
  'jetpack compose': /jetpack\s*compose/i,
  'laravel': /laravel|라라벨/i,
  'rails': /rails|루비온레일즈|레일즈/i,
  '.net': /\.net|asp\.net/i,

  // Modern Web Tools (EXP-101)
  'vite': /(?<!\w)vite(?!\w)|바이트/i,
  'tailwind': /tailwind\s*css|tailwind|테일윈드/i,
  'prisma': /(?<!\w)prisma(?!\w)|프리즈마/i,
  'vercel': /(?<!\w)vercel(?!\w)|버셀/i,
  'trpc': /(?<!\w)trpc(?!\w)|티알피시/i,
  'hono': /(?<!\w)hono(?!\w)|호노/i,
  'firebase': /(?<!\w)firebase(?!\w)|파이어베이스/i,
  'supabase': /(?<!\w)supabase(?!\w)|수파베이스/i,
  'storybook': /storybook|스토리북/i,
  'jest': /(?<!\w)jest(?!\w)|제스트/i,
  'cypress': /(?<!\w)cypress(?!\w)|사이프레스/i,

  // Infrastructure
  'aws': /aws|아마존웹서비스/i,
  'gcp': /gcp|google\s*cloud|구글\s*클라우드/i,
  'azure': /azure|애저/i,
  'kubernetes': /kubernetes|k8s|쿠버네티스/i,
  'docker': /docker|도커/i,
  'terraform': /terraform|테라폼/i,
  'ansible': /ansible|앤서블/i,
  'jenkins': /jenkins|젠킨스/i,
  'github actions': /github\s*actions|깃헙\s*액션/i,
  'linux': /linux|리눅스/i,
  'nginx': /nginx|엔진엑스/i,
  'ci/cd': /ci\s*\/?\s*cd|cicd|지속적\s*통합|지속적\s*배포/i,
  'devops': /devops|데브옵스/i,

  // AWS Services
  'aws lambda': /aws\s*lambda|람다/i,
  'aws s3': /aws\s*s3|s3\s*bucket|(?<!\w)s3(?=\s|스토리지|버킷|$)/i,
  'aws sqs': /aws\s*sqs|sqs\s*(?:메시지|큐|message)/i,

  // GCP Services
  'bigquery': /bigquery|빅쿼리/i,

  // Cloud Data
  'snowflake': /snowflake|스노우플레이크/i,

  // Data / Messaging
  'kafka': /kafka|카프카/i,
  'rabbitmq': /rabbitmq|래빗엠큐/i,
  'elasticsearch': /elasticsearch|일래스틱/i,
  'redis': /redis|레디스/i,
  'mongodb': /mongodb|몽고디비/i,
  'mysql': /mysql|마이에스큐엘/i,
  'postgresql': /postgresql|postgres|포스트그레스/i,
  'oracle': /oracle|오라클/i,
  'mssql': /mssql|sql\s*server/i,

  // ORM / Java Persistence
  'jpa': /jpa|hibernate|하이버네이트/i,

  // Data Engineering
  'spark': /\bspark\b|스파크/i,
  'hadoop': /\bhadoop\b|하둡/i,
  'airflow': /airflow|에어플로우/i,
  'dbt': /\bdbt\b|디비티/i,

  // Frontend State/UI
  'redux': /redux|리덕스/i,
  'zustand': /zustand|주스탄드/i,
  'recoil': /recoil|리코일/i,
  'mobx': /mobx|몹엑스|몹스/i,
  'vuex': /vuex|뷰엑스/i,
  'pinia': /pinia|피니아/i,

  // Game
  'unity': /\bunity\b|유니티/i,
  'unreal': /\bunreal\b|언리얼/i,

  // API
  'graphql': /graphql|그래프큐엘|그래프QL/i,
  'rest api': /\brest\b\s*api|restful|레스트\s*api/i,
  'grpc': /grpc|지알피시/i,

  // AI/ML
  'tensorflow': /tensorflow|텐서플로우|텐서플로/i,
  'pytorch': /pytorch|파이토치/i,
  'machine learning': /machine\s*learning|머신러닝|머신\s*러닝|(?<![a-z])ml(?=\s|엔지니어|개발자|모델|engineer|$)/i,
  'llm': /(?<![a-z])llm(?!\w)|large\s*language\s*model/i,
  'rag': /(?<![a-z])rag(?!\w)|검색증강생성/i,
  'langchain': /langchain|랭체인/i,
  'mlops': /mlops|엠엘옵스/i,
  'vector database': /vector\s*database|벡터데이터베이스|벡터\s*디비|vector\s*db|벡터\s*db|pinecone|weaviate|chroma\s*db|milvus/i,
  'fine-tuning': /fine[\s-]?tun|파인튜닝|미세조정/i,
  'huggingface': /hugging\s*face|허깅페이스/i,
  'prompt engineering': /prompt\s*engineer|프롬프트\s*엔지니어/i,
  'stable diffusion': /stable\s*diffusion|스테이블\s*디퓨전|디퓨전/i,
  'computer vision': /computer\s*vision|컴퓨터\s*비전/i,
  'nlp': /(?<![a-z])nlp(?!\w)|자연어\s*처리/i,

  // Design
  'figma': /figma|피그마/i,

  // Runtimes
  'deno': /\bdeno\b|데노/i,
  'bun': /(?<!\w)bun(?!\w)/i,

  // Frameworks - additional
  'remix': /remix|레믹스/i,
  'astro': /\bastro\b|아스트로/i,
  'fastify': /fastify|패스티파이/i,
  'koa': /(?<!\w)koa(?!\w)/i,

  // ORM / Database tools
  'drizzle': /drizzle|드리즐/i,
  'typeorm': /typeorm|타입ORM/i,
  'sequelize': /sequelize|시퀄라이즈/i,
  'mongoose': /mongoose|몽구스/i,

  // Desktop / Mobile cross-platform
  'electron': /electron|일렉트론/i,
  'tauri': /tauri|타우리/i,
  'capacitor': /capacitor|캐패시터/i,
  'ionic': /ionic|아이오닉/i,

  // Monitoring / Observability
  'sentry': /\bsentry\b|센트리/i,
  'datadog': /datadog|데이터독/i,
  'grafana': /grafana|그라파나/i,
  'prometheus': /prometheus|프로메테우스/i,
  // Blockchain / Web3
  'solidity': /solidity|솔리디티/i,
  'blockchain': /block[\s-]?chain|블록체인/i,
  'web3': /web3|웹3/i,
  'ethereum': /ethereum|이더리움/i,
  'smart contract': /smart[\s-]?contract|스마트[\s-]*컨트랙트/i,
  // Security
  'devsecops': /devsecops|데브시큐옵스/i,
  'owasp': /owasp/i,
  'cybersecurity': /cyber[\s-]?secur|사이버보안|정보보안|information[\s-]?secur/i,
  'penetration testing': /pen(?:etration)?[\s-]?test|침투테스트|모의해킹/i,
  // Platform / Infrastructure roles
  'sre': /site[\s-]?reliability|사이트[\s-]*신뢰성|(?<!\w)sre(?!\w)/i,
  'platform engineering': /platform[\s-]?eng|플랫폼[\s-]*엔지니어링|플랫폼[\s-]*엔지니어/i,
  'istio': /istio|이스티오/i,
  'argocd': /argocd|아르고시디/i,
};

/**
 * Extract skills from text (title + description).
 * Returns canonical skill names (lowercase, normalized).
 * @param {string} text - Job title or combined title+description
 * @returns {string[]} Array of matched skill names
 */
// Role-based skill mapping: Korean role names → likely skills (EXP-121)
// Used as fallback when no explicit tech keywords found in title+description
const ROLE_SKILL_MAP = {
  '프론트엔드': ['react', 'typescript', 'javascript'],
  '프론트': ['react', 'typescript', 'javascript'],
  'frontend': ['react', 'typescript', 'javascript'],
  '백엔드': ['node.js', 'python', 'java'],
  '풀스택': ['react', 'node.js', 'typescript'],
  '데브옵스': ['docker', 'kubernetes', 'ci/cd'],
  '데이터 엔지니어': ['spark', 'airflow', 'python'],
  '데이터 사이언티스트': ['python', 'machine learning'],
  '머신러닝': ['python', 'machine learning', 'tensorflow'],
  '모바일': ['flutter', 'react native'],
  '안드로이드': ['kotlin', 'java'],
  '아이오에스': ['swift', 'swiftui'],  // iOS Korean
  'iOS': ['swift', 'swiftui'],
  '디자인': ['figma'],
  '클라우드': ['aws', 'docker', 'kubernetes'],
  '시큐리티': ['cybersecurity'],
  '정보보안': ['cybersecurity'],
  'qa': ['jest', 'cypress'],
  '테스트': ['jest', 'cypress'],
  'sre': ['kubernetes', 'prometheus', 'docker'],
  '임베디드': ['c++', 'linux', 'python'],
  '인프라': ['aws', 'docker', 'kubernetes', 'linux'],
  '게임': ['unity', 'c++', 'c#'],
  '데이터 분석': ['python', 'sql'],
  '데이터분석': ['python', 'sql'],
  '보안': ['cybersecurity'],
  '기술 리드': ['python', 'java', 'aws'],
  '솔루션 아키텍트': ['aws', 'docker', 'kubernetes'],
  '인공지능': ['python', 'tensorflow', 'pytorch'],
  'ai': ['python', 'tensorflow', 'pytorch'],
  // English role titles common in Korean job market (EXP-133)
  'backend': ['node.js', 'python', 'java'],
  'back-end': ['node.js', 'python', 'java'],
  'fullstack': ['react', 'node.js', 'typescript'],
  'full stack': ['react', 'node.js', 'typescript'],
  'full-stack': ['react', 'node.js', 'typescript'],
  'data engineer': ['spark', 'airflow', 'python'],
  'data scientist': ['python', 'machine learning'],
  'data analyst': ['python', 'sql'],
  'devops': ['docker', 'kubernetes', 'ci/cd'],
  'mobile': ['flutter', 'react native'],
  'android': ['kotlin', 'java'],
  'cloud': ['aws', 'docker', 'kubernetes'],
  'security': ['cybersecurity'],
  'platform engineer': ['kubernetes', 'docker', 'linux'],
  'site reliability': ['kubernetes', 'prometheus', 'docker'],
  'embedded': ['c++', 'linux', 'python'],
  'game': ['unity', 'c++', 'c#'],
  'design': ['figma'],
  'infra': ['aws', 'docker', 'kubernetes', 'linux'],
};

function inferSkills(text) {
  if (!text || typeof text !== 'string') return [];
  const skills = [];

  // Process longer keys first to avoid substring false positives
  // (e.g., 'react native' before 'react', 'spring boot' before 'spring')
  const sorted = Object.entries(SKILL_MAP).sort((a, b) => b[0].length - a[0].length);

  for (const [skill, regex] of sorted) {
    if (regex.test(text)) {
      skills.push(skill);
    }
  }

  // Role-based supplement: add skills from role names (EXP-121, EXP-130)
  // Always supplement — not just when zero skills found.
  // Previously only fired when skills.length===0, but most Korean role titles
  // (데브옵스, 보안, 머신러닝 etc.) already match a SKILL_MAP entry, so the
  // role-supplementary skills (docker, kubernetes, ci/cd etc.) were never added.
  const lowerText = text.toLowerCase();
  for (const [role, roleSkills] of Object.entries(ROLE_SKILL_MAP)) {
    const roleRegex = new RegExp(role, 'i');
    if (roleRegex.test(lowerText)) {
      for (const s of roleSkills) {
        if (!skills.includes(s)) skills.push(s);
      }
    }
  }

  return skills;
}

/**
 * Derive career stage from experience text.
 * Maps Korean experience strings to stages: entry, junior, mid, senior, lead.
 * Used by all post-processors to ensure consistent stage mapping.
 * @param {string} experience - Raw experience string (e.g., "신입", "3~7년", "10년 이상")
 * @returns {string|null} Stage or null if indeterminate
 */
function deriveCareerStage(experience) {
  if (!experience) return null;
  const exp = experience.trim();
  if (/신입[·/].*경력|경력[·/].*신입/.test(exp)) return 'entry'; // 신입·경력 = entry-level friendly
  if (/신입/.test(exp) && !/경력/.test(exp)) return 'entry';
  if (/무관/.test(exp)) return null;
  // Bare "경력" without year numbers → mid default (EXP-121)
  if (/경력/.test(exp) && !/\d/.test(exp)) return 'mid';
  const rangeMatch = exp.match(/(\d+)\s*[~-]\s*(\d+)\s*년/);
  const minMatch = exp.match(/(\d+)\s*년\s*이상/);
  const upMatch = exp.match(/(\d+)\s*년\s*↑/);
  const singleMatch = exp.match(/(\d+)\s*년/);
  let years = null;
  let isMinimum = false; // "N년 이상" — minimum experience, not exact
  if (rangeMatch) years = parseInt(rangeMatch[2]); // upper bound of range
  else if (minMatch) { years = parseInt(minMatch[1]); isMinimum = true; }
  else if (upMatch) { years = parseInt(upMatch[1]); isMinimum = true; }
  else if (singleMatch) years = parseInt(singleMatch[1]);
  if (years === null) return null;
  // For minimum-experience patterns ("N년 이상"), bump by +1 to reflect
  // the target seniority level: "3년 이상" expects mid-level developers.
  const ref = isMinimum ? years + 1 : years;
  if (ref <= 3) return 'junior';
  if (ref <= 7) return 'mid';
  if (ref <= 12) return 'senior';
  return 'lead';
}

module.exports = { inferSkills, deriveCareerStage, SKILL_MAP };
