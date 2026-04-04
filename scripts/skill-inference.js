/**
 * Shared skill inference module.
 * Extracts technology keywords from job titles and descriptions.
 * Supports Korean equivalents (파이썬→python, 스프링→spring, etc.)
 *
 * EXP-083: Added Linux, Nginx, CI/CD, DevOps, Spark, Hadoop, Airflow, dbt, JPA, Redux, Unity, Unreal, BigQuery, Snowflake, AWS Lambda/S3/SQS.
 * EXP-097: Fixed ML regex false positive (html/xml), added AI/LLM skills (llm, rag, langchain, mlops, vector db, fine-tuning, huggingface, prompt engineering, stable diffusion, computer vision, nlp).
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
  'rust': /rust|러스트/i,
  'c++': /c\+\+|cpp/i,
  'c#': /c#|csharp|시샵/i,
  'swift': /swift|스위프트/i,
  'kotlin': /kotlin|코틀린/i,
  'ruby': /ruby|루비/i,
  'php': /php/i,
  'dart': /(?<!\w)dart(?!\w)/i,
  'r': /(?<!\w)r\s*language|(?<!\w)rlang|(?<=\s)r(?=\s|$)/i,

  // Frameworks
  'next.js': /next\.?js|넥스트/i,
  'nuxt': /nuxt/i,
  'vue': /vue\.?js?|뷰/i,
  'angular': /angular|앵귤러/i,
  'svelte': /svelte/i,
  'node.js': /node\.?js|노드/i,
  'express': /express|익스프레스/i,
  'nestjs': /nest\.?js|네스트/i,
  'spring boot': /spring\s*boot/i,
  'spring': /spring|스프링/i,
  'django': /django|장고/i,
  'flask': /flask|플라스크/i,
  'fastapi': /fastapi/i,
  'flutter': /flutter|플러터/i,
  'swiftui': /swiftui/i,
  'jetpack compose': /jetpack\s*compose/i,
  'laravel': /laravel/i,
  'rails': /rails|루비온레일즈/i,
  '.net': /\.net|asp\.net/i,

  // Infrastructure
  'aws': /aws|아마존웹서비스/i,
  'gcp': /gcp|google\s*cloud/i,
  'azure': /azure/i,
  'kubernetes': /kubernetes|k8s|쿠버네티스/i,
  'docker': /docker|도커/i,
  'terraform': /terraform|테라폼/i,
  'ansible': /ansible/i,
  'jenkins': /jenkins|젠킨스/i,
  'github actions': /github\s*actions/i,
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
  'kafka': /kafka/i,
  'rabbitmq': /rabbitmq/i,
  'elasticsearch': /elasticsearch|일래스틱/i,
  'redis': /redis|레디스/i,
  'mongodb': /mongodb|몽고디비/i,
  'mysql': /mysql/i,
  'postgresql': /postgresql|postgres|포스트그레스/i,
  'oracle': /oracle/i,
  'mssql': /mssql|sql\s*server/i,

  // ORM / Java Persistence
  'jpa': /jpa|hibernate|하이버네이트/i,

  // Data Engineering
  'spark': /spark|스파크/i,
  'hadoop': /hadoop|하둡/i,
  'airflow': /airflow|에어플로우/i,
  'dbt': /\bdbt\b/i,

  // Frontend State/UI
  'redux': /redux|리덕스/i,

  // Game
  'unity': /unity|유니티/i,
  'unreal': /unreal|언리얼/i,

  // API
  'graphql': /graphql/i,
  'rest api': /\brest\b\s*api|restful/i,
  'grpc': /grpc/i,

  // AI/ML
  'tensorflow': /tensorflow/i,
  'pytorch': /pytorch/i,
  'machine learning': /machine\s*learning|(?<![a-z])ml(?=\s|엔지니어|개발자|모델|engineer|$)/i,
  'llm': /(?<![a-z])llm(?!\w)|large\s*language\s*model/i,
  'rag': /(?<![a-z])rag(?!\w)|검색증강생성/i,
  'langchain': /langchain|랭체인/i,
  'mlops': /mlops|엠엘옵스/i,
  'vector database': /vector\s*database|vector\s*db|벡터\s*db|pinecone|weaviate|chroma\s*db|milvus/i,
  'fine-tuning': /fine[\s-]?tun|파인튜닝|미세조정/i,
  'huggingface': /hugging\s*face|허깅페이스/i,
  'prompt engineering': /prompt\s*engineer|프롬프트\s*엔지니어/i,
  'stable diffusion': /stable\s*diffusion/i,
  'computer vision': /computer\s*vision|컴퓨터\s*비전/i,
  'nlp': /(?<![a-z])nlp(?!\w)|자연어\s*처리/i,

  // Design
  'figma': /figma/i,
};

/**
 * Extract skills from text (title + description).
 * Returns canonical skill names (lowercase, normalized).
 * @param {string} text - Job title or combined title+description
 * @returns {string[]} Array of matched skill names
 */
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
  const rangeMatch = exp.match(/(\d+)\s*[~-]\s*(\d+)\s*년/);
  const minMatch = exp.match(/(\d+)\s*년\s*이상/);
  const upMatch = exp.match(/(\d+)\s*년\s*↑/);
  const singleMatch = exp.match(/(\d+)\s*년/);
  let years = null;
  if (rangeMatch) years = parseInt(rangeMatch[2]);
  else if (minMatch) years = parseInt(minMatch[1]);
  else if (upMatch) years = parseInt(upMatch[1]);
  else if (singleMatch) years = parseInt(singleMatch[1]);
  if (years === null) return null;
  if (years <= 3) return 'junior';
  if (years <= 7) return 'mid';
  if (years <= 12) return 'senior';
  return 'lead';
}

module.exports = { inferSkills, deriveCareerStage, SKILL_MAP };
