/**
 * EXP-052: Title-Based Skill Inference for Matching Algorithm
 * 
 * When job.skills is empty (common from LinkedIn/partial scrapes),
 * the skill score defaults to 50 — essentially a coin flip.
 * 
 * This extracts explicit technology mentions from job titles to improve
 * matching accuracy for partially-scraped jobs.
 * 
 * Rules:
 * - Only extract EXPLICIT tech mentions (React, Java, Python, etc.)
 * - Do NOT infer from role names ("프론트엔드" ≠ React specifically)
 * - Korean equivalents: 리액트→React, 파이썬→Python, etc.
 * - Only used when job.skills is empty or has <2 skills
 */

// === Skill extraction patterns ===
const TITLE_SKILL_PATTERNS = {
  // Languages
  'javascript': ['javascript', '자바스크립트', ' js ', '자스'],
  'typescript': ['typescript', '타입스크립트', ' ts '],
  'python': ['python', '파이썬'],
  'java': ['java', '자바'],
  'go': ['golang', '고언어', 'go 언어'],
  'rust': ['rust', '러스트'],
  'c++': ['c\\+\\+', 'cpp'],
  'c#': ['c#', 'csharp'],
  'swift': ['swift', '스위프트'],
  'kotlin': ['kotlin', '코틀린'],
  'ruby': ['ruby', '루비'],
  'php': ['php'],
  // Frameworks
  'react': ['react', '리액트'],
  'vue': ['vue\\.?js?', 'vue', '뷰'],
  'angular': ['angular', '앵귤러'],
  'next.js': ['next\\.?js?', '넥스트'],
  'node.js': ['node\\.?js?', '노드'],
  'express': ['express', '익스프레스'],
  'spring': ['spring', '스프링'],
  'django': ['django', '장고'],
  'flask': ['flask', '플라스크'],
  'fastapi': ['fastapi'],
  'flutter': ['flutter', '플러터'],
  'swiftui': ['swiftui'],
  'nestjs': ['nest\\.?js?', '네스트'],
  // Infrastructure
  'aws': ['aws'],
  'docker': ['docker', '도커'],
  'kubernetes': ['kubernetes', 'k8s', '쿠버네티스'],
  'terraform': ['terraform', '테라폼'],
};

function inferSkillsFromTitle(title) {
  if (!title || typeof title !== 'string') return [];
  const lower = title.toLowerCase();
  const found = [];
  
  // Sort by pattern length DESC to match longer patterns first (e.g., "typescript" before "type")
  const entries = Object.entries(TITLE_SKILL_PATTERNS);
  
  for (const [skill, patterns] of entries) {
    for (const pattern of patterns) {
      try {
        // For patterns like " js " with spaces, use includes
        // For regex patterns, use regex
        if (pattern.includes(' ') || pattern.startsWith(' ') || pattern.endsWith(' ')) {
          // Space-delimited keyword — check word boundaries
          if (lower.includes(pattern.trim())) {
            // Verify it's a standalone word (not part of another word)
            const idx = lower.indexOf(pattern.trim());
            const before = idx > 0 ? lower[idx - 1] : ' ';
            const after = idx + pattern.trim().length < lower.length ? lower[idx + pattern.trim().length] : ' ';
            if (/[\s\-\/\(\)\|,]/.test(before) && /[\s\-\/\(\)\|,]/.test(after)) {
              found.push(skill);
              break;
            }
          }
        } else if (pattern.includes('\\')) {
          // Regex pattern
          const regex = new RegExp(pattern, 'i');
          if (regex.test(title)) {
            found.push(skill);
            break;
          }
        } else {
          // Simple string match with word boundary check
          const regex = new RegExp(`(?:^|[\\s\\-\\/\\(\\)\\|,])${pattern}(?:$|[\\s\\-\\/\\(\\)\\|,])`, 'i');
          if (regex.test(title)) {
            found.push(skill);
            break;
          }
        }
      } catch (e) {
        // Skip broken patterns
      }
    }
  }
  
  // Deduplicate
  return [...new Set(found)];
}

// === Copy matching algorithm from test_validated_matching.js ===
const WEIGHTS = { skill: 0.35, experience: 0.25, culture: 0.15, career_stage: 0.15, location_work: 0.10 };

const TIER1 = {
  'typescript': ['javascript'], 'javascript': ['typescript'],
  'react': ['next.js'], 'next.js': ['react'],
  'vue': ['nuxt.js'], 'nuxt.js': ['vue'],
  'postgresql': ['mysql', 'sql'], 'mysql': ['postgresql', 'sql'], 'sql': ['postgresql', 'mysql'],
  'docker': ['container'], 'container': ['docker'],
};
const TIER2 = {
  'spring': ['spring boot'], 'spring boot': ['spring'],
  'express': ['node.js', 'nestjs'], 'node.js': ['express', 'nestjs'], 'nestjs': ['node.js', 'express'],
  'fastapi': ['python'], 'python': ['fastapi', 'django', 'flask'],
  'django': ['python'], 'flask': ['python'],
  'aws': ['gcp', 'azure', 'cloud'], 'gcp': ['aws', 'azure', 'cloud'], 'azure': ['aws', 'gcp', 'cloud'],
};
const TIER3 = {
  'react': ['vue'], 'vue': ['react'],
  'node.js': ['python'], 'python': ['node.js'],
  'aws': ['docker'], 'docker': ['aws'],
  'kubernetes': ['container'], 'container': ['kubernetes'],
  'sql': ['mongodb'], 'mongodb': ['sql'],
};

const PRIMARY_DOMAINS = {
  'python': 'python', 'java': 'java', 'javascript': 'js/ts', 'typescript': 'js/ts',
  'go': 'go', 'rust': 'rust', 'swift': 'swift', 'c++': 'c++', 'c#': 'c#', 'kotlin': 'java',
  'spring': 'java', 'spring boot': 'java',
  'django': 'python', 'flask': 'python', 'fastapi': 'python',
  'react': 'js/ts', 'next.js': 'js/ts', 'vue': 'js/ts', 'nuxt.js': 'js/ts', 'svelte': 'js/ts',
  'express': 'js/ts', 'nestjs': 'js/ts', 'node.js': 'js/ts',
  'swiftui': 'swift', 'flutter': 'dart', 'dart': 'dart',
  '.net': 'c#', 'asp.net': 'c#',
  'ruby on rails': 'ruby', 'rails': 'ruby', 'ruby': 'ruby',
  'php': 'php', 'laravel': 'php',
};

function getSimilarity(a, b) {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return 1.0;
  if (TIER1[al]?.includes(bl)) return 1.0;
  if (TIER2[al]?.includes(bl)) return 0.75;
  if (TIER3[al]?.includes(bl)) return 0.25;
  return 0;
}

function detectPrimaryDomain(skills) {
  const d = new Set();
  for (const s of skills) { const dom = PRIMARY_DOMAINS[s.toLowerCase()]; if (dom) d.add(dom); }
  return d;
}

function hasDomainOverlap(jobSkills, candSkills) {
  const jd = detectPrimaryDomain(jobSkills), cd = detectPrimaryDomain(candSkills);
  for (const d of jd) { if (cd.has(d)) return true; }
  return jd.size === 0;
}

function calculateSkillScore(jobSkills, candidateSkills) {
  if (jobSkills.length === 0) return 50;
  let total = 0;
  for (const js of jobSkills) {
    let best = 0;
    for (const cs of candidateSkills) { best = Math.max(best, getSimilarity(js, cs)); }
    total += best;
  }
  let score = (total / jobSkills.length) * 100;
  if (!hasDomainOverlap(jobSkills, candidateSkills)) score *= 0.60;
  return Math.round(score);
}

function skillGate(skillScore) {
  if (skillScore >= 40) return 1.0;
  return Math.max(0.04, (skillScore / 40) ** 2);
}

function calculateExperienceScore(jobExpRange, candidateYears) {
  if (typeof jobExpRange === 'string') {
    if (jobExpRange.includes('무관') || jobExpRange.includes('不限') || jobExpRange === 'any') return 80;
    const match = jobExpRange.match(/(\d+)\s*[~-~]\s*(\d+)/);
    if (match) {
      const min = parseInt(match[1]), max = parseInt(match[2]);
      if (candidateYears >= min && candidateYears <= max) return 95;
      if (candidateYears < min) return Math.max(0, 95 - (min - candidateYears) * 15);
      return Math.max(50, 95 - (candidateYears - max) * 10);
    }
    const singleMatch = jobExpRange.match(/(\d+)/);
    if (singleMatch) {
      const req = parseInt(singleMatch[1]);
      if (candidateYears >= req) return 90;
      return Math.max(0, 90 - (req - candidateYears) * 20);
    }
  }
  return 50;
}

function calculateCultureScore(jobCultureKeywords, candidatePreferences) {
  if (!jobCultureKeywords || jobCultureKeywords.length === 0) return 50;
  let matches = 0;
  for (const kw of jobCultureKeywords) {
    const pref = candidatePreferences[kw];
    if (pref !== undefined && pref >= 0.6) matches++;
    else if (pref !== undefined && pref >= 0.3) matches += 0.5;
  }
  return Math.round(Math.min(100, (matches / jobCultureKeywords.length) * 100));
}

function calculateCareerStageScore(jobStage, candidateYears) {
  const stages = ['entry', 'junior', 'mid', 'senior', 'lead'];
  const candidateStage = candidateYears <= 1 ? 'entry' : candidateYears <= 3 ? 'junior' : candidateYears <= 7 ? 'mid' : candidateYears <= 12 ? 'senior' : 'lead';
  if (!jobStage) return 50;
  const gap = Math.abs(stages.indexOf(jobStage) - stages.indexOf(candidateStage));
  if (gap === 0) return 95;
  if (gap === 1) return 75;
  return 40;
}

function calculateLocationWorkScore(jobLocation, jobWorkType, candidatePrefs) {
  let score = 50;
  if (candidatePrefs.locations?.some(l => jobLocation?.includes(l))) score += 25;
  if (candidatePrefs.work_types?.some(w => w === jobWorkType)) score += 25;
  return Math.min(100, score);
}

// NEW: Enhanced calculateMatch that uses title-based skill inference
function calculateMatchWithTitleInference(job, candidate) {
  // Use title-inferred skills when job.skills is empty or very sparse
  let effectiveSkills = job.skills || [];
  if (effectiveSkills.length < 2 && job.title) {
    const titleSkills = inferSkillsFromTitle(job.title);
    if (titleSkills.length > 0) {
      // Merge: title skills fill gaps, don't replace explicit skills
      const existing = new Set(effectiveSkills.map(s => s.toLowerCase()));
      effectiveSkills = [...effectiveSkills, ...titleSkills.filter(s => !existing.has(s.toLowerCase()))];
    }
  }
  
  const skillScore = calculateSkillScore(effectiveSkills, candidate.skills);
  const gate = skillGate(skillScore);
  
  const expScore = calculateExperienceScore(job.experience, candidate.experience_years);
  const cultureScore = calculateCultureScore(job.culture_keywords, candidate.cultural_preferences);
  const stageScore = calculateCareerStageScore(job.career_stage, candidate.experience_years);
  const locScore = calculateLocationWorkScore(job.location, job.work_type, candidate.preferences);
  
  const raw = 
    skillScore * WEIGHTS.skill +
    expScore * WEIGHTS.experience * gate +
    cultureScore * WEIGHTS.culture * gate +
    stageScore * WEIGHTS.career_stage * gate +
    locScore * WEIGHTS.location_work * gate;
  
  return {
    overall: Math.round(raw),
    skillScore,
    gate,
    effectiveSkills,
    titleInferred: (job.skills || []).length < effectiveSkills.length,
  };
}

// === Candidate ===
const candidate = {
  skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker', 'AWS', 'Git'],
  experience_years: 5,
  cultural_preferences: {
    innovative: 0.8, collaborative: 0.7, autonomous: 0.6,
    structured: 0.4, fast_paced: 0.7, learning_focused: 0.8,
  },
  preferences: {
    locations: ['서울', '판교'],
    work_types: ['hybrid', 'remote'],
  },
};

// === Tests ===
let passed = 0, failed = 0;
function assert(name, condition, detail = '') {
  if (condition) { console.log(`✅ ${name}`); passed++; }
  else { console.log(`❌ ${name} ${detail}`); failed++; }
}

// === Group 1: Title skill extraction accuracy ===
console.log('━━━ Group 1: Title Skill Extraction ━━━');

const extractionTests = [
  { title: 'React 프론트엔드 개발자', expected: ['react'] },
  { title: 'Java/Spring 백엔드 개발자', expected: ['java', 'spring'] },
  { title: 'Python Django 백엔드', expected: ['python', 'django'] },
  { title: 'Vue.js 프론트엔드 시니어', expected: ['vue'] },
  { title: 'Next.js 풀스택 개발자', expected: ['next.js'] },
  { title: 'iOS Swift 개발자', expected: ['swift'] },
  { title: 'Flutter 모바일 개발자', expected: ['flutter'] },
  { title: 'TypeScript/Node.js 백엔드', expected: ['typescript', 'node.js'] },
  { title: 'Kotlin Android 개발자', expected: ['kotlin'] },
  { title: 'Go/Golang 마이크로서비스', expected: ['go'] },
  { title: 'AI/ML 엔지니어', expected: [] }, // No explicit tech, "AI" and "ML" are not skill keywords
  { title: 'DevOps 엔지니어', expected: [] }, // Role name, not tech
  { title: '프론트엔드 개발자', expected: [] }, // Korean role name only
  { title: 'AWS/Docker/Kubernetes 인프라 엔지니어', expected: ['aws', 'docker', 'kubernetes'] },
  { title: 'React/TypeScript 프론트엔드 (3~5년)', expected: ['react', 'typescript'] },
  { title: 'Spring Boot 백엔드 시니어', expected: ['spring'] }, // "Spring Boot" → spring
  { title: '리액트 개발자', expected: ['react'] }, // Korean equivalent
  { title: '파이썬 데이터 엔지니어', expected: ['python'] },
  { title: '스프링 백엔드', expected: ['spring'] },
  { title: 'FastAPI 백엔드 개발자', expected: ['fastapi'] },
];

for (const { title, expected } of extractionTests) {
  const result = inferSkillsFromTitle(title);
  const ok = expected.length === result.length && expected.every(e => result.includes(e));
  assert(`"${title}" → [${result.join(', ')}] (expected [${expected.join(', ')}])`, ok, `got [${result.join(', ')}]`);
}

// === Group 2: Matching improvement with title inference ===
console.log('\n━━━ Group 2: Matching Improvement ━━━');

// Same candidate, job with no skills but title mentions React
const reactTitleJob = {
  title: 'React/TypeScript 프론트엔드 개발자',
  skills: [],
  experience: '3~7년',
  culture_keywords: [],
  career_stage: null,
  location: '서울',
  work_type: 'hybrid',
};

const reactTitleResult = calculateMatchWithTitleInference(reactTitleJob, candidate);
assert(`React title job scores high (>=60): ${reactTitleResult.overall}`, reactTitleResult.overall >= 60);
assert(`React title job uses title inference`, reactTitleResult.titleInferred);
assert(`React title inferred skills: [${reactTitleResult.effectiveSkills.join(', ')}]`, 
  reactTitleResult.effectiveSkills.includes('react'));

// Compare: Java title job with no skills should score much lower for same candidate
const javaTitleJob = {
  title: 'Java/Spring 백엔드 개발자',
  skills: [],
  experience: '3~7년',
  culture_keywords: [],
  career_stage: null,
  location: '서울',
  work_type: 'onsite',
};

const javaTitleResult = calculateMatchWithTitleInference(javaTitleJob, candidate);
assert(`Java title job scores low (<=25): ${javaTitleResult.overall}`, javaTitleResult.overall <= 25);
assert(`React title >> Java title for JS candidate`, reactTitleResult.overall - javaTitleResult.overall >= 20,
  `gap: ${reactTitleResult.overall - javaTitleResult.overall}`);

// === Group 3: Regression — existing tests still pass ===
console.log('\n━━━ Group 3: Regression Tests ━━━');

// Jobs with explicit skills should NOT use title inference
const explicitSkillJob = {
  title: 'React 프론트엔드 개발자',
  skills: ['React', 'TypeScript', 'Next.js', 'PostgreSQL'],
  experience: '3~7년',
  culture_keywords: ['innovative', 'collaborative', 'learning_focused'],
  career_stage: 'mid',
  location: '서울 강남구',
  work_type: 'hybrid',
};

const explicitResult = calculateMatchWithTitleInference(explicitSkillJob, candidate);
assert(`Explicit skills job: no title inference needed`, !explicitResult.titleInferred);
assert(`Explicit skills job score unchanged (HIGH): ${explicitResult.overall}`, explicitResult.overall >= 70);

// Job with 1 skill — should supplement from title
const sparseSkillJob = {
  title: 'React/Node.js 풀스택',
  skills: ['React'],
  experience: '3~5년',
  culture_keywords: [],
  career_stage: null,
  location: undefined,
  work_type: undefined,
};

const sparseResult = calculateMatchWithTitleInference(sparseSkillJob, candidate);
assert(`Sparse skills (1) supplements from title`, sparseResult.titleInferred);
assert(`Sparse skills supplements Node.js from title`, sparseResult.effectiveSkills.includes('node.js'));

// Job with no title and no skills → still defaults to 50
const noTitleNoSkills = {
  title: '',
  skills: [],
  experience: undefined,
  culture_keywords: [],
  career_stage: null,
  location: undefined,
  work_type: undefined,
};

const noTitleResult = calculateMatchWithTitleInference(noTitleNoSkills, candidate);
assert(`No title + no skills: neutral score (40-60): ${noTitleResult.overall}`, 
  noTitleResult.overall >= 40 && noTitleResult.overall <= 60);
assert(`No title + no skills: no inference`, !noTitleResult.titleInferred);

// === Group 4: Domain alignment still works with inferred skills ===
console.log('\n━━━ Group 4: Domain Alignment With Inferred Skills ━━━');

const pythonTitleJob = {
  title: 'Python/Django 백엔드 개발자',
  skills: [],
  experience: '3~5년',
  culture_keywords: [],
  career_stage: 'mid',
  location: '서울',
  work_type: 'onsite',
};

const pythonResult = calculateMatchWithTitleInference(pythonTitleJob, candidate);
assert(`Python/Django title: domain penalty active (<=25): ${pythonResult.overall}`, pythonResult.overall <= 25);
assert(`Python/Django title: skill score penalized (< 40): ${pythonResult.skillScore}`, pythonResult.skillScore < 40);

// === Summary ===
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Title Skill Inference: ${passed}/${passed + failed} passed`);
if (failed === 0) console.log('✅ All title skill inference tests passed!');
else console.log('❌ Some tests failed');
