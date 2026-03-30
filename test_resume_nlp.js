// Test suite for resume-agent Korean NLP skill extraction, career stage, and domain detection
// EXP-032: Validates the core extraction logic from resume-agent.md

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

// === Korean Skill Extraction Maps ===
const languageMap = {
  'javascript': ['자바스크립트', 'javascript', 'js', '자스'],
  'typescript': ['타입스크립트', 'typescript', 'ts'],
  'python': ['파이썬', 'python'],
  'java': ['자바', 'java'],
  'go': ['고언어', 'golang', 'go 언어'],
  'rust': ['러스트', 'rust'],
  'c++': ['시플러스', 'c++', 'cpp'],
  'c#': ['씨샵', 'c#', 'csharp'],
  'swift': ['스위프트', 'swift'],
  'kotlin': ['코틀린', 'kotlin'],
  'ruby': ['루비', 'ruby'],
  'php': ['피에이치피', 'php'],
};

const frameworkMap = {
  'react': ['리액트', 'react'],
  'vue': ['뷰', 'vue.js', 'vue'],
  'angular': ['앵귤러', 'angular'],
  'next.js': ['넥스트', 'next.js', 'nextjs'],
  'nuxt': ['넉스트', 'nuxt.js', 'nuxt'],
  'node.js': ['노드', 'node.js', 'nodejs'],
  'express': ['익스프레스', 'express'],
  'nestjs': ['네스트', 'nestjs', 'nest.js'],
  'spring': ['스프링', 'spring'],
  'django': ['장고', 'django'],
  'flask': ['플라스크', 'flask'],
  'fastapi': ['패스트에이피아이', 'fastapi'],
  'svelte': ['스벨트', 'svelte'],
};

const dbMap = {
  'postgresql': ['포스트그레스', 'postgresql', 'postgres', 'pg'],
  'mysql': ['마이에스큐엘', 'mysql'],
  'mongodb': ['몽고디비', 'mongodb', 'mongo'],
  'redis': ['레디스', 'redis'],
  'elasticsearch': ['일래스틱', 'elasticsearch', 'es'],
  'sqlite': ['에스큐라이트', 'sqlite'],
  'oracle': ['오라클', 'oracle'],
};

const infraMap = {
  'aws': ['아마존웹서비스', 'aws', 'amazon web services'],
  'gcp': ['구글클라우드', 'gcp', 'google cloud'],
  'azure': ['애저', 'azure'],
  'docker': ['도커', 'docker'],
  'kubernetes': ['쿠버네티스', 'kubernetes', 'k8s'],
  'terraform': ['테라폼', 'terraform'],
  'jenkins': ['젠킨스', 'jenkins'],
  'github actions': ['깃헙액션', 'github actions'],
  'git': ['깃', 'git', 'github'],
};

function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = { languages: [], frameworks: [], databases: [], tools: [] };

  // Detect java vs javascript using word-boundary-aware matching
  const hasJavascript = /\bjavascript\b/i.test(text) || text.includes('자바스크립트') || text.includes('자스');
  const hasJavaAlone = hasJavascript
    ? (/\bjava\b(?!\s*script)/i.test(text) || text.includes('자바') && !text.includes('자바스크립트'))
    : (lower.includes('java') || text.includes('자바'));

  for (const [skill, keywords] of Object.entries(languageMap)) {
    if (skill === 'java') {
      if (hasJavaAlone && !found.languages.includes('java')) found.languages.push('java');
      continue;
    }
    if (skill === 'javascript') {
      if (hasJavascript && !found.languages.includes('javascript')) found.languages.push('javascript');
      continue;
    }
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      if (!found.languages.includes(skill)) found.languages.push(skill);
    }
  }

  for (const [skill, keywords] of Object.entries(frameworkMap)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      if (!found.frameworks.includes(skill)) found.frameworks.push(skill);
    }
  }

  for (const [skill, keywords] of Object.entries(dbMap)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      if (!found.databases.includes(skill)) found.databases.push(skill);
    }
  }

  for (const [skill, keywords] of Object.entries(infraMap)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      if (!found.tools.includes(skill)) found.tools.push(skill);
    }
  }

  return found;
}

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
    // Use exact word match for short indicators to avoid substring false positives (e.g., 'r' in 'spring')
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

// === TEST CASES ===

console.log('\n🧪 Resume Agent NLP Tests (EXP-032)\n');

// --- 1. Korean Language Keyword Extraction ---
console.log('📝 Korean Language Keyword Extraction');

const t1 = extractSkills('3년차 리액트 개발자, 타입스크립트, 넥스트 사용');
assert('Korean: 리액트 → react', t1.frameworks.includes('react'));
assert('Korean: 타입스크립트 → typescript', t1.languages.includes('typescript'));
assert('Korean: 넥스트 → next.js', t1.frameworks.includes('next.js'));

const t2 = extractSkills('자바스크립트와 파이썬 경험, 루비도 가능');
assert('Korean: 자바스크립트 → javascript', t2.languages.includes('javascript'));
assert('Korean: 파이썬 → python', t2.languages.includes('python'));
assert('Korean: 루비 → ruby', t2.languages.includes('ruby'));
assert('No false java match from 자바스크립트', !t2.languages.includes('java'));

const t3 = extractSkills('자바 백엔드 개발, 스프링 프레임워크 사용');
assert('Korean: 자바 → java (standalone)', t3.languages.includes('java'));
assert('Korean: 스프링 → spring', t3.frameworks.includes('spring'));

const t4 = extractSkills('도커, 쿠버네티스, AWS, 젠킨스 사용');
assert('Korean: 도커 → docker', t4.tools.includes('docker'));
assert('Korean: 쿠버네티스 → kubernetes', t4.tools.includes('kubernetes'));
assert('Korean: 젠킨스 → jenkins', t4.tools.includes('jenkins'));
assert('English: AWS → aws', t4.tools.includes('aws'));

// --- 2. Database Extraction ---
console.log('📝 Database Keyword Extraction');

const t5 = extractSkills('포스트그레스와 레디스 경험, 몽고디비도 사용');
assert('Korean: 포스트그레스 → postgresql', t5.databases.includes('postgresql'));
assert('Korean: 레디스 → redis', t5.databases.includes('redis'));
assert('Korean: 몽고디비 → mongodb', t5.databases.includes('mongodb'));

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

// Mixed frontend+backend should be hybrid
const domainMixed = detectDomain(['react', 'typescript', 'spring', 'java', 'docker']);
assert('Fullstack hybrid detected', domainMixed.includes('/') && domainMixed.includes('frontend') && domainMixed.includes('backend'));

// --- 5. Mixed English/Korean Input ---
console.log('📝 Mixed English/Korean Input');

const t6 = extractSkills('React, Node.js, PostgreSQL 경험. AWS와 Docker 사용. Kubernetes 운영');
assert('Mixed: React detected', t6.frameworks.includes('react'));
assert('Mixed: Node.js detected', t6.frameworks.includes('node.js'));
assert('Mixed: PostgreSQL detected', t6.databases.includes('postgresql'));
assert('Mixed: AWS detected', t6.tools.includes('aws'));
assert('Mixed: Docker detected', t6.tools.includes('docker'));
assert('Mixed: Kubernetes detected', t6.tools.includes('kubernetes'));

// --- 6. Edge Cases ---
console.log('📝 Edge Cases');

const t7 = extractSkills('');
assert('Empty input: no skills', t7.languages.length === 0 && t7.frameworks.length === 0);

const t8 = extractSkills('자스 타스');
assert('Korean abbreviations: 자스 → javascript', t8.languages.includes('javascript'));

const t9 = extractSkills('Vue.js와 Nuxt.js로 프로젝트 진행');
assert('Vue.js with dot → vue', t9.frameworks.includes('vue'));
assert('Nuxt.js with dot → nuxt', t9.frameworks.includes('nuxt'));

// java vs javascript disambiguation
const t10 = extractSkills('JavaScript, TypeScript, Java');
assert('English: JavaScript detected', t10.languages.includes('javascript'));
assert('English: Java detected (standalone)', t10.languages.includes('java'));
assert('English: TypeScript detected', t10.languages.includes('typescript'));

// === RESULTS ===
console.log('\n' + results.join('\n'));
console.log(`\n📊 Results: ${passed}/${passed + failed} passed${failed > 0 ? `, ${failed} FAILED` : ''}\n`);

process.exit(failed > 0 ? 1 : 0);
