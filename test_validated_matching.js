/**
 * EXP-037: Validated Matching Algorithm Tests
 * 
 * Tests the matching algorithm with validated v4 weights (EXP-017),
 * skill-gated scoring (EXP-021), and primary domain alignment (EXP-024).
 * 
 * The old enhanced_job_matching_v{1,2,3}.js files use stale weights
 * and don't reflect the validated algorithm documented in SKILL.md.
 */

// === Validated v4 Weights (EXP-017) ===
const WEIGHTS = {
  skill: 0.35,
  experience: 0.25,
  culture: 0.15,
  career_stage: 0.15,
  location_work: 0.10,
};

// === Tiered Similarity Map (SKILL.md) ===
const TIER1 = { // 100%
  'typescript': ['javascript'], 'javascript': ['typescript'],
  'react': ['next.js'], 'next.js': ['react'],
  'vue': ['nuxt.js', 'nuxt'], 'nuxt.js': ['vue'], 'nuxt': ['vue'], // EXP-087: nuxt alias
  'postgresql': ['mysql', 'sql'], 'mysql': ['postgresql', 'sql'], 'sql': ['postgresql', 'mysql'],
  'docker': ['container'], 'container': ['docker'],
  'kubernetes': ['k8s'], 'k8s': ['kubernetes'], // alias (EXP-064)
  'spring_boot': ['spring boot'], 'spring boot': ['spring_boot'], // alias (EXP-064)
};

const TIER2 = { // 75%
  'spring': ['spring boot', 'spring_boot'], 'spring boot': ['spring'], 'spring_boot': ['spring'],
  'express': ['node.js', 'nestjs'], 'node.js': ['express', 'nestjs'], 'nestjs': ['node.js', 'express'],
  'fastapi': ['python', 'django', 'flask'], 'python': ['fastapi', 'django', 'flask'],
  'django': ['python', 'fastapi', 'flask'], 'flask': ['python', 'fastapi', 'django'],
  'aws': ['gcp', 'azure', 'cloud'], 'gcp': ['aws', 'azure', 'cloud'], 'azure': ['aws', 'gcp', 'cloud'],
  'java': ['kotlin'], 'kotlin': ['java'], // JVM interoperable (EXP-062)
  'react': ['react native', 'redux'], 'react native': ['react'], // shared React paradigm + state management (EXP-062, EXP-100)
  // EXP-064: Detail-skill similarity pairs
  'graphql': ['rest api'], 'rest api': ['graphql'], // API paradigms (EXP-088: fixed underscore→space to match skill-inference key)
  'jenkins': ['github actions'], 'github actions': ['jenkins', 'ci/cd'], // CI/CD (EXP-093: fixed underscore→space + merged duplicate key)
  'terraform': ['ansible'], 'ansible': ['terraform'], // IaC/config management
  'kafka': ['rabbitmq'], 'rabbitmq': ['kafka'], // message queues
  'tensorflow': ['pytorch', 'machine learning'], 'pytorch': ['tensorflow', 'machine learning'], // ML frameworks + EXP-087: ML ecosystem
  'elasticsearch': ['redis'], 'redis': ['elasticsearch'], // real-time data stores
  'oracle': ['mssql'], 'mssql': ['oracle'], // enterprise RDBMS
  // EXP-087: Orphaned skill similarity connections
  'go': ['rust'], 'rust': ['go'], // systems languages
  'c#': ['.net'], '.net': ['c#'], // .NET ecosystem
  'ruby': ['rails'], 'rails': ['ruby'], // Ruby ecosystem
  'php': ['laravel'], 'laravel': ['php'], // PHP ecosystem
  'swiftui': ['swift'], 'swift': ['swiftui'], // Apple ecosystem
  'jetpack compose': ['kotlin'], 'kotlin': ['jetpack compose'], // Android modern UI
  'dart': ['flutter'], 'flutter': ['dart'], // Flutter ecosystem (promoted from TIER3, EXP-096: Dart IS Flutter's language, as close as swift↔swiftUI)
  'angular': ['typescript'], 'typescript': ['angular'], // Angular mandates TypeScript (EXP-096)
  'redux': ['react'], // React state management (EXP-100)
  'zustand': ['react'], 'recoil': ['react'], 'mobx': ['react'], // React state management (EXP-100)
  'vuex': ['vue'], 'pinia': ['vue'], 'vue': ['vuex', 'pinia'], // Vue state management (EXP-100)
  'bigquery': ['snowflake'], 'snowflake': ['bigquery'], // cloud data warehouses
  'airflow': ['dbt'], 'dbt': ['airflow'], // data orchestration
  'linux': ['docker', 'nginx'], // OS/container/infra stack
  'ci/cd': ['jenkins', 'github actions'], // CI/CD ecosystem (EXP-093: removed duplicate 'github actions' key, merged into line above)
  'unity': ['unreal'], 'unreal': ['unity'], // game engines
  'machine learning': ['tensorflow', 'pytorch'], // ML concept
  // EXP-097: AI/LLM ecosystem connections
  'llm': ['machine learning', 'pytorch', 'tensorflow'], 'machine learning': ['llm'], // LLM is an ML subfield
  'langchain': ['llm'], 'llm': ['langchain'], // LangChain is the primary LLM orchestration framework
  'rag': ['llm', 'vector database'], 'vector database': ['rag'], // RAG combines LLM with vector search
  'mlops': ['machine learning', 'docker', 'kubernetes'], // MLOps connects ML with DevOps
  'computer vision': ['machine learning', 'pytorch', 'tensorflow'], // CV is an ML subfield
  'nlp': ['machine learning', 'llm'], 'machine learning': ['nlp'], // NLP is an ML subfield
  'huggingface': ['pytorch', 'tensorflow', 'llm'], // HuggingFace hosts ML models
  // EXP-088: Remaining orphan connections
  'jpa': ['spring', 'java'], 'spring': ['jpa'], 'java': ['kotlin', 'jpa'], // JPA/Hibernate is Spring Data's ORM layer (merged with existing kotlin entry)
  'devops': ['docker', 'kubernetes', 'terraform', 'ci/cd'], // DevOps umbrella connects to core tools
  'aws lambda': ['aws'], 'aws s3': ['aws'], 'aws sqs': ['aws'], // AWS services connect to parent cloud
};

const TIER3 = { // 25%
  'react': ['vue', 'svelte', 'angular'], 'vue': ['react', 'svelte', 'angular'], 'svelte': ['react', 'vue', 'angular'], 'angular': ['react', 'vue', 'svelte'],
  'node.js': ['python'], 'python': ['node.js'],
  'aws': ['docker'], 'docker': ['aws', 'kubernetes', 'terraform', 'nginx'], 'kubernetes': ['docker'], // container ecosystem (EXP-062) + DevOps (EXP-064)
  'kubernetes': ['container'], 'container': ['kubernetes'],
  'sql': ['mongodb'], 'mongodb': ['sql'],
  // EXP-064: Detail-skill partial overlaps
  'terraform': ['docker'], 'nginx': ['docker'], // DevOps provisioning/infra
  'spark': ['hadoop', 'pandas', 'airflow', 'dbt'], 'hadoop': ['spark', 'bigquery', 'snowflake'], 'pandas': ['spark'], // big data + data processing (EXP-064) + EXP-087 orchestration
  'graphql': ['grpc'], 'grpc': ['graphql'], // modern API protocols
  'mongodb': ['redis'], 'redis': ['mongodb'], // NoSQL stores
  // EXP-087: Orphaned skill partial overlaps
  'go': ['c++', 'java'], 'rust': ['c++'], 'c++': ['go', 'rust'], // systems/compiled languages
  'c#': ['java'], // managed languages
  'r': ['python'], 'python': ['r'], // data science languages
  // EXP-088: Remaining orphan partial overlaps
  'devops': ['jenkins', 'github actions'], // DevOps connects to CI/CD tools
  'aws lambda': ['docker', 'kubernetes'], // serverless↔container compute models
  'aws s3': ['bigquery', 'snowflake'], // storage↔data warehouse pipeline
  'aws sqs': ['kafka', 'rabbitmq'], // managed↔self-hosted messaging
  'figma': ['angular', 'react', 'vue'], // design tools overlap with frontend frameworks
  // EXP-101: Modern web tool connections
  'vite': ['next.js', 'react', 'vue', 'svelte'], 'next.js': ['vite'], // Vite is used with these frameworks
  'tailwind': ['react', 'vue', 'svelte', 'next.js'], // Tailwind pairs with frontend frameworks
  'prisma': ['postgresql', 'mysql', 'mongodb', 'typescript'], // Prisma ORM connects to DBs and TS
  'vercel': ['next.js', 'react'], 'next.js': ['vercel'], // Vercel is Next.js's platform
  'trpc': ['typescript', 'next.js'], // tRPC requires TypeScript, commonly with Next.js
  'hono': ['typescript', 'node.js'], // Hono is a JS/TS framework
  'firebase': ['react', 'vue', 'angular'], // Firebase as BaaS for frontend frameworks
  'supabase': ['postgresql', 'firebase'], 'postgresql': ['supabase'], // Supabase is Postgres-based Firebase alternative
  'storybook': ['react', 'vue', 'angular'], // Storybook for component docs
  'jest': ['react', 'typescript'], // Jest testing with these
  'cypress': ['react', 'vue'], // Cypress E2E testing
  // EXP-097: AI/LLM partial overlaps
  'llm': ['rag', 'huggingface'], // LLM ecosystem
  'prompt engineering': ['llm'], // prompt engineering is LLM-specific
  // EXP-100: State management partial overlaps
  'redux': ['zustand', 'recoil', 'mobx'], 'zustand': ['redux', 'recoil', 'mobx'], // React state management alternatives
  'vuex': ['pinia'], 'pinia': ['vuex'], // Vue state management alternatives
  'fine-tuning': ['pytorch', 'tensorflow', 'machine learning'], // fine-tuning uses ML frameworks
  'stable diffusion': ['pytorch', 'computer vision'], // generative AI overlaps
  'vector database': ['elasticsearch', 'redis', 'mongodb'], // vector DB overlaps with search/NoSQL
  'mlops': ['terraform', 'ci/cd'], // MLOps shares infra tooling with DevOps
  'langchain': ['python', 'typescript'], // LangChain runs on Python/TS
};

// Merge all tiers for lookup
function getSimilarity(skillA, skillB) {
  const a = skillA.toLowerCase(), b = skillB.toLowerCase();
  if (a === b) return 1.0;
  if (TIER1[a]?.includes(b)) return 1.0;
  if (TIER2[a]?.includes(b)) return 0.75;
  if (TIER3[a]?.includes(b)) return 0.25;
  return 0;
}

// === Primary Domain Detection (EXP-024, EXP-049: framework-aware) ===
const PRIMARY_DOMAINS = {
  // Languages
  'python': 'python', 'java': 'java', 'javascript': 'js/ts', 'typescript': 'js/ts',
  'go': 'go', 'rust': 'rust', 'swift': 'swift', 'c++': 'c++', 'c#': 'c#', 'kotlin': 'java',
  // Frameworks → parent language domain (EXP-049)
  'spring': 'java', 'spring boot': 'java',
  'django': 'python', 'flask': 'python', 'fastapi': 'python',
  'react': 'js/ts', 'next.js': 'js/ts', 'vue': 'js/ts', 'nuxt.js': 'js/ts', 'svelte': 'js/ts',
  'express': 'js/ts', 'nestjs': 'js/ts', 'node.js': 'js/ts',
  'swiftui': 'swift', 'flutter': 'dart', 'dart': 'dart',
  '.net': 'c#', 'asp.net': 'c#',
  'ruby on rails': 'ruby', 'rails': 'ruby', 'ruby': 'ruby',
  'php': 'php', 'laravel': 'php',
  // AI/ML domain (EXP-097)
  'tensorflow': 'python', 'pytorch': 'python', 'machine learning': 'python',
  'llm': 'python', 'langchain': 'python', 'mlops': 'python',
  'computer vision': 'python', 'nlp': 'python', 'huggingface': 'python',
  'fine-tuning': 'python', 'stable diffusion': 'python', 'rag': 'python',
  'prompt engineering': 'python', 'vector database': 'python',
};

function detectPrimaryDomain(jobSkills) {
  const domains = new Set();
  for (const s of jobSkills) {
    const d = PRIMARY_DOMAINS[s.toLowerCase()];
    if (d) domains.add(d);
  }
  return domains;
}

function hasDomainOverlap(jobSkills, candidateSkills) {
  const jobDomains = detectPrimaryDomain(jobSkills);
  const candDomains = detectPrimaryDomain(candidateSkills);
  for (const d of jobDomains) {
    if (candDomains.has(d)) return true;
  }
  return jobDomains.size === 0; // no domain detected = no penalty
}

// === Skill Score Calculation ===
function calculateSkillScore(jobSkills, candidateSkills) {
  if (jobSkills.length === 0) return 50; // neutral
  let total = 0;
  for (const js of jobSkills) {
    let best = 0;
    for (const cs of candidateSkills) {
      best = Math.max(best, getSimilarity(js, cs));
    }
    total += best;
  }
  let score = (total / jobSkills.length) * 100;
  // Domain alignment penalty (EXP-024, tuned EXP-037: 25% → 40%)
  if (!hasDomainOverlap(jobSkills, candidateSkills)) {
    score *= 0.60;
  }
  return Math.round(score);
}

// === Skill Gate (EXP-021, tuned EXP-037) ===
// Quadratic ramp: gate = (skill / threshold)^2
// More aggressive dampening for low skill scores
// At skill=0: gate=0.04, skill=20: gate=0.25, skill=40: gate=1.0
function skillGate(skillScore) {
  if (skillScore >= 40) return 1.0;
  return Math.max(0.04, (skillScore / 40) ** 2);
}

// === Experience Score ===
function calculateExperienceScore(jobExpRange, candidateYears) {
  // jobExpRange: "3~5년", "신입", "신입·경력", "경력무관", "3년 이상", or {min, max}
  if (typeof jobExpRange === 'string') {
    // 신입·경력 / 신입/경력 (both entry and experienced welcome) — very common in Korean job market
    if (/신입[·/].*경력|경력[·/].*신입/.test(jobExpRange)) return 85; // broad match
    // 신입 (entry-level / new graduate)
    if (/신입/.test(jobExpRange) && !/경력/.test(jobExpRange)) {
      if (candidateYears <= 1) return 95;  // perfect: new grad
      if (candidateYears <= 3) return 65;  // junior overqualified
      return 40;                           // senior overqualified — poor fit
    }
    if (jobExpRange.includes('무관') || jobExpRange.includes('不限') || jobExpRange === 'any') return 80;
    const match = jobExpRange.match(/(\d+)\s*[~-~]\s*(\d+)/);
    if (match) {
      const min = parseInt(match[1]), max = parseInt(match[2]);
      if (candidateYears >= min && candidateYears <= max) return 95;
      if (candidateYears < min) return Math.max(0, 95 - (min - candidateYears) * 15);
      return Math.max(50, 95 - (candidateYears - max) * 10);
    }
    // "N년 이상" (N+ years) — explicitly minimum
    const minMatch = jobExpRange.match(/(\d+)\s*년?\s*이상/);
    if (minMatch) {
      const req = parseInt(minMatch[1]);
      if (candidateYears >= req) return 90;
      return Math.max(0, 90 - (req - candidateYears) * 20);
    }
    const singleMatch = jobExpRange.match(/(\d+)/);
    if (singleMatch) {
      const req = parseInt(singleMatch[1]);
      if (candidateYears >= req) return 90;
      return Math.max(0, 90 - (req - candidateYears) * 20);
    }
  }
  return 50; // default (EXP-051: neutral, not generous)
}

// === Culture Score ===
function calculateCultureScore(jobCultureKeywords, candidatePreferences) {
  if (!jobCultureKeywords || jobCultureKeywords.length === 0) return 50; // EXP-051
  let matches = 0;
  for (const kw of jobCultureKeywords) {
    const pref = candidatePreferences[kw];
    if (pref !== undefined && pref >= 0.6) matches++;
    else if (pref !== undefined && pref >= 0.3) matches += 0.5;
  }
  if (jobCultureKeywords.length === 0) return 50; // EXP-051
  return Math.round(Math.min(100, (matches / jobCultureKeywords.length) * 100));
}

// === Career Stage Score ===
function calculateCareerStageScore(jobStage, candidateYears) {
  const stages = ['entry', 'junior', 'mid', 'senior', 'lead'];
  const candidateStage = candidateYears <= 1 ? 'entry' : candidateYears <= 3 ? 'junior' : candidateYears <= 7 ? 'mid' : candidateYears <= 12 ? 'senior' : 'lead';
  if (!jobStage) return 50; // EXP-051
  const gap = Math.abs(stages.indexOf(jobStage) - stages.indexOf(candidateStage));
  if (gap === 0) return 95;
  if (gap === 1) return 75;
  return 40;
}

// === Salary Alignment Score (EXP-084) ===
// When both candidate has salary preference and job has salary data,
// compute alignment. Returns adjustment (-20 to +20) or 0 if no salary data.
function calculateSalaryAlignment(jobSalaryMin, jobSalaryMax, candidateSalaryRange) {
  if (!candidateSalaryRange || !jobSalaryMin) return 0; // no data = neutral
  const prefMin = candidateSalaryRange.min;
  const prefMax = candidateSalaryRange.max;
  if (prefMin == null) return 0;
  
  const jobMin = jobSalaryMin;
  const jobMax = jobSalaryMax || jobSalaryMin;
  
  // Calculate overlap
  const overlapMin = Math.max(prefMin, jobMin);
  const overlapMax = Math.min(prefMax || Infinity, jobMax);
  
  if (overlapMin <= overlapMax) {
    // Ranges overlap — how well?
    const prefRange = (prefMax || prefMin * 1.5) - prefMin;
    const overlap = overlapMax - overlapMin;
    const ratio = Math.min(1, overlap / Math.max(1, prefRange));
    // Good overlap: +5 to +20
    return Math.round(5 + ratio * 15);
  }
  
  // No overlap
  if (jobMax < prefMin) {
    // Job pays less than candidate wants
    const gap = prefMin - jobMax;
    const gapRatio = Math.min(1, gap / Math.max(1, prefMin));
    return Math.round(-5 - gapRatio * 15); // -5 to -20
  }
  
  // Job pays more than candidate wants — slight positive
  return 5;
}

// === Location/Work/Salary Score (EXP-084: salary preference added) ===
function calculateLocationWorkScore(jobLocation, jobWorkType, candidatePrefs, jobSalaryMin, jobSalaryMax, jobEmploymentType) {
  let score = 50;
  if (candidatePrefs.locations?.some(l => jobLocation?.includes(l))) score += 15;
  if (candidatePrefs.work_types?.some(w => w === jobWorkType)) score += 15;
  // Salary alignment (EXP-084)
  score += calculateSalaryAlignment(jobSalaryMin, jobSalaryMax, candidatePrefs.salary_range);
  // Employment type alignment (EXP-085)
  if (candidatePrefs.employment_types && jobEmploymentType) {
    if (candidatePrefs.employment_types.includes(jobEmploymentType)) {
      score += 5; // bonus for preferred employment type
    } else if (jobEmploymentType === 'contract' && !candidatePrefs.employment_types.includes('contract')) {
      score -= 10; // penalty for unwanted contract
    } else if (jobEmploymentType === 'intern' && !candidatePrefs.employment_types.includes('intern')) {
      score -= 15; // larger penalty for unwanted intern
    }
  }
  return Math.max(0, Math.min(100, score));
}

// === Full Match Score ===
function calculateMatch(job, candidate) {
  const skillScore = calculateSkillScore(job.skills, candidate.skills);
  const gate = skillGate(skillScore);
  
  const expScore = calculateExperienceScore(job.experience, candidate.experience_years);
  const cultureScore = calculateCultureScore(job.culture_keywords, candidate.cultural_preferences);
  const stageScore = calculateCareerStageScore(job.career_stage, candidate.experience_years);
  const locScore = calculateLocationWorkScore(job.location, job.work_type, candidate.preferences, job.salary_min, job.salary_max, job.employment_type);
  
  const raw = 
    skillScore * WEIGHTS.skill +
    expScore * WEIGHTS.experience * gate +
    cultureScore * WEIGHTS.culture * gate +
    stageScore * WEIGHTS.career_stage * gate +
    locScore * WEIGHTS.location_work * gate;
  
  return {
    overall: Math.round(raw),
    components: {
      skills: { score: skillScore, weighted: Math.round(skillScore * WEIGHTS.skill) },
      experience: { score: expScore, weighted: Math.round(expScore * WEIGHTS.experience * gate) },
      culture: { score: cultureScore, weighted: Math.round(cultureScore * WEIGHTS.culture * gate) },
      career_stage: { score: stageScore, weighted: Math.round(stageScore * WEIGHTS.career_stage * gate) },
      location: { score: locScore, weighted: Math.round(locScore * WEIGHTS.location_work * gate) },
    },
    gate_multiplier: gate,
  };
}

// === Test Data ===
// Candidate: JS/React fullstack dev, 5 years
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
    salary_range: { min: 5000, max: 8000 }, // EXP-084: salary preference (만원)
  },
};

const jobs = {
  // HIGH: Perfect frontend match
  'HIGH-001': {
    skills: ['React', 'TypeScript', 'Next.js', 'PostgreSQL'],
    experience: '3~7년',
    culture_keywords: ['innovative', 'collaborative', 'learning_focused'],
    career_stage: 'mid',
    location: '서울 강남구',
    work_type: 'hybrid',
    salary_min: 6000, salary_max: 8000, // within candidate range
    label: 'HIGH',
  },
  // HIGH: Fullstack with some overlap
  'HIGH-002': {
    skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
    experience: '3~5년',
    culture_keywords: ['fast_paced', 'innovative'],
    career_stage: 'mid',
    location: '판교',
    work_type: 'hybrid',
    salary_min: 5500, salary_max: 7500, // within candidate range
    label: 'HIGH',
  },
  // MED: Python/Django - infrastructure overlap only (EXP-024)
  'MED-001': {
    skills: ['Python', 'Django', 'AWS', 'Docker', 'PostgreSQL'],
    experience: '3~5년',
    culture_keywords: ['collaborative', 'learning_focused'],
    career_stage: 'mid',
    location: '서울',
    work_type: 'onsite',
    label: 'MEDIUM',
  },
  // MED-BORDERLINE: Vue frontend - same JS domain, different framework
  // Scores HIGH because JavaScript/Node.js match perfectly + Vue is tier-3 with React
  'MED-BORDER': {
    skills: ['Vue', 'JavaScript', 'Node.js'],
    experience: '5~10년',
    culture_keywords: ['structured', 'collaborative'],
    career_stage: 'senior',
    location: '부산',
    work_type: 'onsite',
    label: 'BORDERLINE', // Same domain, should score between HIGH and MED
  },
  // LOW: Java/Spring - completely different domain
  'LOW-001': {
    skills: ['Java', 'Spring', 'MySQL', 'Kubernetes'],
    experience: '5~10년',
    culture_keywords: ['structured'],
    career_stage: 'senior',
    location: '대전',
    work_type: 'onsite',
    label: 'LOW',
  },
  // LOW: Data/ML - completely different domain
  'LOW-002': {
    skills: ['Python', 'TensorFlow', 'Pandas', 'Spark'],
    experience: '3~7년',
    culture_keywords: ['learning_focused'],
    career_stage: 'mid',
    location: '서울',
    work_type: 'onsite',
    label: 'LOW',
  },
  // LOW: Go/DevOps
  'LOW-003': {
    skills: ['Go', 'Docker', 'Kubernetes', 'Terraform'],
    experience: '경력무관',
    culture_keywords: [],
    career_stage: null,
    location: '서울',
    work_type: 'remote',
    label: 'LOW',
  },
  // EXP-084: Salary alignment test jobs
  'SALARY-PERFECT': {
    skills: ['React', 'TypeScript', 'Node.js'],
    experience: '3~7년',
    culture_keywords: ['innovative'],
    career_stage: 'mid',
    location: '서울',
    work_type: 'hybrid',
    salary_min: 5000, salary_max: 8000, // exact match to preference
    label: 'SALARY',
  },
  'SALARY-PARTIAL': {
    skills: ['React', 'TypeScript', 'Node.js'],
    experience: '3~7년',
    culture_keywords: ['innovative'],
    career_stage: 'mid',
    location: '서울',
    work_type: 'hybrid',
    salary_min: 4000, salary_max: 6000, // partial overlap (5000-6000)
    label: 'SALARY',
  },
  'SALARY-LOW': {
    skills: ['React', 'TypeScript', 'Node.js'],
    experience: '3~7년',
    culture_keywords: ['innovative'],
    career_stage: 'mid',
    location: '서울',
    work_type: 'hybrid',
    salary_min: 2500, salary_max: 3500, // below candidate range
    label: 'SALARY',
  },
  'SALARY-HIGH': {
    skills: ['React', 'TypeScript', 'Node.js'],
    experience: '3~7년',
    culture_keywords: ['innovative'],
    career_stage: 'mid',
    location: '서울',
    work_type: 'hybrid',
    salary_min: 9000, salary_max: 12000, // above candidate range
    label: 'SALARY',
  },
  'SALARY-NO-DATA': {
    skills: ['React', 'TypeScript', 'Node.js'],
    experience: '3~7년',
    culture_keywords: ['innovative'],
    career_stage: 'mid',
    location: '서울',
    work_type: 'hybrid',
    // no salary fields — should be neutral
    label: 'SALARY',
  },
};

// === Discrimination Rules (EXP-028) ===
function checkDiscrimination(results) {
  const highs = results.filter(r => r.label === 'HIGH');
  const meds = results.filter(r => r.label === 'MEDIUM');
  const lows = results.filter(r => r.label === 'LOW');
  
  const rules = {
    high_min_70: highs.every(r => r.score >= 70),
    high_med_gap_15: (Math.min(...highs.map(r => r.score)) - Math.max(...meds.map(r => r.score))) >= 15,
    low_max_25: lows.every(r => r.score <= 25),
    ranking_correct: Math.min(...highs.map(r => r.score)) > Math.max(...meds.map(r => r.score)) && Math.max(...meds.map(r => r.score)) > Math.max(...lows.map(r => r.score)),
  };
  return rules;
}

// === Run Tests ===
let passed = 0, failed = 0;
const results = [];

for (const [id, job] of Object.entries(jobs)) {
  const match = calculateMatch(job, candidate);
  results.push({ id, label: job.label, score: match.overall, components: match.components, gate: match.gate_multiplier });
}

// Test 1: HIGH scores are actually high
console.log('=== HIGH Group Tests ===');
for (const r of results.filter(r => r.label === 'HIGH')) {
  const ok = r.score >= 70;
  console.log(`${ok ? '✅' : '❌'} ${r.id}: ${r.score} (skill: ${r.components.skills.score}, gate: ${r.gate.toFixed(2)})`);
  ok ? passed++ : failed++;
}

// Test 2: MEDIUM (cross-domain with infrastructure overlap) should be 60-80
console.log('\n=== MEDIUM Group Tests ===');
for (const r of results.filter(r => r.label === 'MEDIUM')) {
  const ok = r.score >= 60 && r.score <= 80;
  console.log(`${ok ? '✅' : '❌'} ${r.id}: ${r.score} — range 60-80 (skill: ${r.components.skills.score}, gate: ${r.gate.toFixed(2)})`);
  ok ? passed++ : failed++;
}

// Test 2b: Borderline (same domain, different stack) should score below perfect HIGH
console.log('\n=== Borderline Tests ===');
const highScores = results.filter(r => r.label === 'HIGH').map(r => r.score);
for (const r of results.filter(r => r.label === 'BORDERLINE')) {
  const belowHigh = r.score < Math.max(...highScores);
  console.log(`${belowHigh ? '✅' : '❌'} ${r.id}: ${r.score} — below HIGH max (${Math.max(...highScores)})`);
  belowHigh ? passed++ : failed++;
}

// Test 3: LOW scores are actually low
console.log('\n=== LOW Group Tests ===');
for (const r of results.filter(r => r.label === 'LOW')) {
  const ok = r.score <= 25;
  console.log(`${ok ? '✅' : '❌'} ${r.id}: ${r.score} (skill: ${r.components.skills.score}, gate: ${r.gate.toFixed(2)})`);
  ok ? passed++ : failed++;
}

// Test 4: Discrimination rules
console.log('\n=== Discrimination Rules ===');
const disc = checkDiscrimination(results);
for (const [rule, ok] of Object.entries(disc)) {
  console.log(`${ok ? '✅' : '❌'} ${rule}`);
  ok ? passed++ : failed++;
}

// Test 5: Skill gate activates for LOW
console.log('\n=== Skill Gate Tests ===');
const lowWithNoSkill = results.find(r => r.id === 'LOW-002');
const gateActive = lowWithNoSkill && lowWithNoSkill.gate < 0.5;
console.log(`${gateActive ? '✅' : '❌'} LOW-002 gate active (< 0.5): ${lowWithNoSkill?.gate.toFixed(2)}`);
gateActive ? passed++ : failed++;

// Test 6: Domain alignment penalizes MED-001 (Python job for JS candidate)
console.log('\n=== Domain Alignment Tests ===');
const med001 = results.find(r => r.id === 'MED-001');
const noJavaOverlap = !hasDomainOverlap(['Python', 'Django'], candidate.skills);
console.log(`${noJavaOverlap ? '✅' : '❌'} Python/Django has no JS/TS domain overlap`);
noJavaOverlap ? passed++ : failed++;

const med001SkillScore = med001?.components.skills.score;
const domainPenalty = med001SkillScore !== undefined && med001SkillScore < 40; // Should be penalized
console.log(`${domainPenalty ? '✅' : '❌'} MED-001 skill score penalized (< 40): ${med001SkillScore}`);
domainPenalty ? passed++ : failed++;

// Test 7: Framework-aware domain detection (EXP-049)
console.log('\n=== Framework Domain Detection Tests ===');
const frameworkDomainTests = [
  [['Spring', 'Spring Boot', 'MySQL'], ['React', 'TypeScript'], false, 'Java frameworks vs JS candidate → no overlap'],
  [['Django', 'PostgreSQL'], ['Python', 'Flask'], true, 'Django vs Flask → same python domain'],
  [['React', 'Next.js'], ['Vue', 'JavaScript'], true, 'React vs Vue → same js/ts domain'],
  [['Express', 'MongoDB'], ['Java', 'Spring'], false, 'Express (js/ts) vs Spring (java) → no overlap'],
  [['Flutter'], ['React', 'TypeScript'], false, 'Flutter (dart) vs React (js/ts) → no overlap'],
  [['Laravel', 'MySQL'], ['Express', 'Node.js'], false, 'Laravel (php) vs Express (js/ts) → no overlap'],
];
for (const [jobSkills, candSkills, expectOverlap, desc] of frameworkDomainTests) {
  const result = hasDomainOverlap(jobSkills, candSkills);
  const ok = result === expectOverlap;
  console.log(`${ok ? '✅' : '❌'} ${desc}: overlap=${result} (expected ${expectOverlap})`);
  ok ? passed++ : failed++;
}

// Test 7b: Similarity map correctness
console.log('\n=== Similarity Map Tests ===');
const simTests = [
  ['TypeScript', 'JavaScript', 1.0],
  ['React', 'Next.js', 1.0],
  ['Express', 'Node.js', 0.75],
  ['Python', 'Django', 0.75],
  ['React', 'Vue', 0.25],
  ['React', 'Java', 0],
  ['Docker', 'Kubernetes', 0.25], // container ecosystem (EXP-062)
  ['Java', 'Kotlin', 0.75], // JVM interoperable (EXP-062)
  ['React', 'React Native', 0.75], // shared React paradigm (EXP-062)
  ['Svelte', 'Vue', 0.25], // component frameworks (EXP-062)
  ['Svelte', 'React', 0.25], // component frameworks (EXP-062)
  // EXP-064: Detail-skill similarity pairs
  ['GraphQL', 'REST API', 0.75], // API paradigms (EXP-088: fixed key to match skill-inference)
  ['Jenkins', 'GitHub Actions', 0.75], // CI/CD (EXP-093: fixed to use space key matching skill-inference output)
  ['Terraform', 'Docker', 0.25], // DevOps provisioning
  ['Kafka', 'RabbitMQ', 0.75], // message queues
  ['TensorFlow', 'PyTorch', 0.75], // ML frameworks
  ['Elasticsearch', 'Redis', 0.75], // real-time data stores
  ['Spark', 'Hadoop', 0.25], // big data ecosystem
  ['MongoDB', 'Redis', 0.25], // NoSQL stores
  ['GraphQL', 'gRPC', 0.25], // modern API protocols
  ['Kubernetes', 'K8s', 1.0], // alias
  // EXP-074: Python web framework cross-similarity
  ['FastAPI', 'Django', 0.75], // Python web frameworks
  ['FastAPI', 'Flask', 0.75], // Python web frameworks
  ['Django', 'Flask', 0.75], // Python web frameworks
  ['Angular', 'React', 0.25], // frontend frameworks
  ['Angular', 'Vue', 0.25], // frontend frameworks
  ['Angular', 'TypeScript', 0.75], // Angular mandates TypeScript (EXP-096)
  // EXP-087: Orphaned skill similarity tests
  ['Go', 'Rust', 0.75], // systems languages
  ['C#', '.NET', 0.75], // .NET ecosystem
  ['Ruby', 'Rails', 0.75], // Ruby ecosystem
  ['PHP', 'Laravel', 0.75], // PHP ecosystem
  ['SwiftUI', 'Swift', 0.75], // Apple ecosystem
  ['Jetpack Compose', 'Kotlin', 0.75], // Android modern UI
  ['BigQuery', 'Snowflake', 0.75], // cloud data warehouses
  ['Airflow', 'dbt', 0.75], // data orchestration
  ['Unity', 'Unreal', 0.75], // game engines
  ['Nuxt', 'Vue', 1.0], // nuxt alias
  ['Go', 'C++', 0.25], // systems/compiled
  ['Rust', 'C++', 0.25], // systems/compiled
  ['Dart', 'Flutter', 0.75], // Flutter ecosystem (EXP-096: promoted to TIER2 — Dart IS Flutter's language)
  ['R', 'Python', 0.25], // data science
  ['Hadoop', 'BigQuery', 0.25], // big data → cloud DW
  // EXP-100: State management ↔ framework connections
  ['Redux', 'React', 0.75], // React state management
  ['Zustand', 'React', 0.75], // React state management
  ['Recoil', 'React', 0.75], // React state management
  ['Vuex', 'Vue', 0.75], // Vue state management
  ['Pinia', 'Vue', 0.75], // Vue state management
  ['Redux', 'Zustand', 0.25], // React state alternatives (partial overlap)
  ['Vuex', 'Pinia', 0.25], // Vue state alternatives (partial overlap)
  // EXP-101: Modern web tool similarity
  ['Vite', 'Next.js', 0.25], // Vite used with Next.js
  ['Tailwind', 'React', 0.25], // Tailwind pairs with React
  ['Prisma', 'PostgreSQL', 0.25], // Prisma ORM → PostgreSQL
  ['Prisma', 'TypeScript', 0.25], // Prisma is TypeScript-native
  ['Vercel', 'Next.js', 0.25], // Vercel → Next.js platform
  ['Supabase', 'PostgreSQL', 0.25], // Supabase is Postgres-based
  ['Supabase', 'Firebase', 0.25], // Supabase ↔ Firebase BaaS alternatives
  ['Storybook', 'React', 0.25], // Storybook for React components
];
for (const [a, b, expected] of simTests) {
  const actual = getSimilarity(a, b);
  const ok = actual === expected;
  console.log(`${ok ? '✅' : '❌'} ${a} ↔ ${b}: ${actual} (expected ${expected})`);
  ok ? passed++ : failed++;
}

// Test 8: Experience scoring with upper bounds
console.log('\n=== Experience Score Tests ===');
const expTests = [
  ['3~7년', 5, 95], // perfect fit
  ['3~7년', 2, 'less'], // below range
  ['3~7년', 8, 'less'], // above range but close
  ['경력무관', 5, 80], // any experience
  // EXP-076: 신입 (entry-level) tests
  ['신입', 0, 95],   // new grad → perfect
  ['신입', 1, 95],   // 1 year → still perfect
  ['신입', 3, 65],   // junior → overqualified
  ['신입', 7, 40],   // senior → poor fit
  // 신입·경력 (both welcome)
  ['신입·경력', 0, 85],  // new grad → good match
  ['신입·경력', 5, 85],  // experienced → good match
  ['신입/경력', 3, 85],  // alt separator
  // N년 이상 (minimum years)
  ['3년 이상', 5, 90],  // meets minimum
  ['3년 이상', 2, 70],  // below minimum (90 - 1*20)
  ['5년 이상', 3, 50],  // well below (90 - 2*20 = 50)
];
for (const [range, years, expected] of expTests) {
  const score = calculateExperienceScore(range, years);
  const ok = typeof expected === 'string' ? score < 95 : score === expected;
  console.log(`${ok ? '✅' : '❌'} "${range}" with ${years}y: ${score} (expected ${expected})`);
  ok ? passed++ : failed++;
}

// Test 9: Ordered ranking
console.log('\n=== Ranking Order Test ===');
const ranked = [...results].sort((a, b) => b.score - a.score);
const correctOrder = ranked.map(r => r.id).join(', ');
const highFirst = ranked[0].label === 'HIGH';
const lowLast = ranked[ranked.length - 1].label === 'LOW';
console.log(`Ranking: ${correctOrder}`);
console.log(`${highFirst ? '✅' : '❌'} Highest is HIGH`);
console.log(`${lowLast ? '✅' : '❌'} Lowest is LOW`);
highFirst ? passed++ : failed++;
lowLast ? passed++ : failed++;

// Test 10: Salary alignment (EXP-084)
console.log('\n=== Salary Alignment Tests ===');
const salaryResults = results.filter(r => r.id.startsWith('SALARY-'));

// SALARY-PERFECT should have highest location score (exact overlap)
const salaryPerfect = results.find(r => r.id === 'SALARY-PERFECT');
const salaryLow = results.find(r => r.id === 'SALARY-LOW');
const salaryPartial = results.find(r => r.id === 'SALARY-PARTIAL');
const salaryHigh = results.find(r => r.id === 'SALARY-HIGH');
const salaryNoData = results.find(r => r.id === 'SALARY-NO-DATA');

// Perfect overlap scores highest
const perfectLoc = salaryPerfect?.components.location.score;
const lowLoc = salaryLow?.components.location.score;
const ok1 = perfectLoc > lowLoc;
console.log(`${ok1 ? '✅' : '❌'} Perfect salary overlap (${perfectLoc}) > low salary (${lowLoc})`);
ok1 ? passed++ : failed++;

// Low salary penalized
const ok2 = lowLoc < salaryNoData?.components.location.score;
console.log(`${ok2 ? '✅' : '❌'} Low salary location score (${lowLoc}) < no-data neutral (${salaryNoData?.components.location.score})`);
ok2 ? passed++ : failed++;

// High salary (above range) gets slight positive
const highLoc = salaryHigh?.components.location.score;
const ok3 = highLoc > salaryNoData?.components.location.score;
console.log(`${ok3 ? '✅' : '❌'} High salary (${highLoc}) > no-data neutral (${salaryNoData?.components.location.score})`);
ok3 ? passed++ : failed++;

// No-data is neutral (same as before)
const noDataLoc = salaryNoData?.components.location.score;
const ok4 = noDataLoc === 80; // 50 base + 15 loc + 15 work_type, no salary
console.log(`${ok4 ? '✅' : '❌'} No salary data is neutral (${noDataLoc}, expected 80)`);
ok4 ? passed++ : failed++;

// Partial overlap between perfect and low
const partialLoc = salaryPartial?.components.location.score;
const ok5 = partialLoc < perfectLoc && partialLoc > lowLoc;
console.log(`${ok5 ? '✅' : '❌'} Partial overlap (${partialLoc}) between perfect (${perfectLoc}) and low (${lowLoc})`);
ok5 ? passed++ : failed++;

// Perfect salary overall score > low salary overall score (same skills/exp)
const ok6 = salaryPerfect && salaryLow && salaryPerfect.score > salaryLow.score;
console.log(`${ok6 ? '✅' : '❌'} Perfect salary overall (${salaryPerfect?.score}) > low salary (${salaryLow?.score})`);
ok6 ? passed++ : failed++;

// Salary unit tests for calculateSalaryAlignment
console.log('\n=== Salary Alignment Unit Tests ===');
const salaryUnitTests = [
  // [jobMin, jobMax, prefRange, expectedRange, description]
  [5000, 8000, {min:5000, max:8000}, [15, 20], 'exact match'],
  [6000, 7000, {min:5000, max:8000}, [5, 20], 'job within preference'],
  [4000, 6000, {min:5000, max:8000}, [5, 20], 'partial overlap'],
  [2000, 3000, {min:5000, max:8000}, [-20, -5], 'below range'],
  [9000, 12000, {min:5000, max:8000}, [5, 5], 'above range → slight positive'],
  [null, null, {min:5000, max:8000}, [0, 0], 'no job salary data'],
  [5000, 8000, null, [0, 0], 'no candidate preference'],
  [5000, null, {min:5000, max:8000}, [5, 20], 'single job salary value'],
];
for (const [jMin, jMax, pref, expectedRange, desc] of salaryUnitTests) {
  const score = calculateSalaryAlignment(jMin, jMax, pref);
  const ok = score >= expectedRange[0] && score <= expectedRange[1];
  console.log(`${ok ? '✅' : '❌'} ${desc}: ${score} (expected ${expectedRange[0]}~${expectedRange[1]})`);
  ok ? passed++ : failed++;
}

// === Employment Type Tests (EXP-085) ===
console.log('\n--- Employment Type Tests (EXP-085) ---');

// Test: regular job with regular preference → no penalty
{
  const prefs = { locations: [], work_types: [], employment_types: ['regular'] };
  const s = calculateLocationWorkScore('서울', 'onsite', prefs, null, null, 'regular');
  const ok = s === 55; // 50 base + 5 employment match
  console.log(`${ok ? '✅' : '❌'} Regular job + regular preference: ${s} (expected 55)`);
  ok ? passed++ : failed++;
}

// Test: contract job without contract preference → penalty
{
  const prefs = { locations: [], work_types: [], employment_types: ['regular'] };
  const s = calculateLocationWorkScore('서울', 'onsite', prefs, null, null, 'contract');
  const ok = s === 40; // 50 base - 10 contract penalty
  console.log(`${ok ? '✅' : '❌'} Contract job + regular-only preference: ${s} (expected 40)`);
  ok ? passed++ : failed++;
}

// Test: intern job without intern preference → larger penalty
{
  const prefs = { locations: [], work_types: [], employment_types: ['regular'] };
  const s = calculateLocationWorkScore('서울', 'onsite', prefs, null, null, 'intern');
  const ok = s === 35; // 50 base - 15 intern penalty
  console.log(`${ok ? '✅' : '❌'} Intern job + regular-only preference: ${s} (expected 35)`);
  ok ? passed++ : failed++;
}

// Test: contract job with contract preference → bonus
{
  const prefs = { locations: [], work_types: [], employment_types: ['regular', 'contract'] };
  const s = calculateLocationWorkScore('서울', 'onsite', prefs, null, null, 'contract');
  const ok = s === 55; // 50 base + 5 employment match
  console.log(`${ok ? '✅' : '❌'} Contract job + contract preference: ${s} (expected 55)`);
  ok ? passed++ : failed++;
}

// Test: no employment preference → neutral
{
  const prefs = { locations: [], work_types: [] }; // no employment_types
  const s = calculateLocationWorkScore('서울', 'onsite', prefs, null, null, 'contract');
  const ok = s === 50; // 50 base, no employment effect
  console.log(`${ok ? '✅' : '❌'} Contract job + no preference: ${s} (expected 50)`);
  ok ? passed++ : failed++;
}

// Test: no employment_type on job → neutral
{
  const prefs = { locations: [], work_types: [], employment_types: ['regular'] };
  const s = calculateLocationWorkScore('서울', 'onsite', prefs, null, null, null);
  const ok = s === 50; // 50 base, no job employment_type
  console.log(`${ok ? '✅' : '❌'} No employment_type on job: ${s} (expected 50)`);
  ok ? passed++ : failed++;
}

// Test: employment type discrimination in full match score
{
  const regularJob = { title: 'React Dev', company: 'A', skills: ['React', 'TypeScript'], experience: '경력 3~5년', work_type: 'onsite', employment_type: 'regular', location: '서울', culture_keywords: [], career_stage: 'mid' };
  const contractJob = { ...regularJob, employment_type: 'contract' };
  const candidate = { skills: ['React', 'TypeScript', 'JavaScript'], experience_years: 4, cultural_preferences: [], preferences: { locations: ['서울'], work_types: ['onsite'], employment_types: ['regular'] } };
  const regularScore = calculateMatch(regularJob, candidate).overall;
  const contractScore = calculateMatch(contractJob, candidate).overall;
  const ok = regularScore > contractScore;
  console.log(`${ok ? '✅' : '❌'} Full match: regular(${regularScore}) > contract(${contractScore})`);
  ok ? passed++ : failed++;
}

// Test: Wanted post-processor extracts employment_type
{
  const { parseWantedJob } = require('./scripts/post-process-wanted');
  const contractJob = parseWantedJob('[프론트엔드 개발자] 카카오 경력 3~7년 계약직 서울');
  const ok1 = contractJob.employment_type === 'contract';
  console.log(`${ok1 ? '✅' : '❌'} Wanted: 계약직 → contract (got: ${contractJob.employment_type})`);
  ok1 ? passed++ : failed++;

  const internJob = parseWantedJob('[백엔드 개발자] 네이버 인턴 경력 무관 판교');
  const ok2 = internJob.employment_type === 'intern';
  console.log(`${ok2 ? '✅' : '❌'} Wanted: 인턴 → intern (got: ${internJob.employment_type})`);
  ok2 ? passed++ : failed++;

  const regularJob2 = parseWantedJob('[iOS 개발자] 토스 경력 2~5년 서울');
  const ok3 = regularJob2.employment_type === 'regular';
  console.log(`${ok3 ? '✅' : '❌'} Wanted: no type → regular (got: ${regularJob2.employment_type})`);
  ok3 ? passed++ : failed++;
}

// Test: JobKorea post-processor extracts employment_type
{
  const { parseJobKoreaCard } = require('./scripts/post-process-jobkorea');
  const card = parseJobKoreaCard('React 개발자\n카카오\n경력 3~7년\n계약직\n서울\n마감 4/10');
  const ok = card.employment_type === 'contract';
  console.log(`${ok ? '✅' : '❌'} JobKorea: 계약직 → contract (got: ${card.employment_type})`);
  ok ? passed++ : failed++;
}

// EXP-093: Verify all skill-inference keys are used consistently in similarity maps (no underscore mismatches)
{
  const { SKILL_MAP } = require('./scripts/skill-inference');
  const allInferenceKeys = Object.keys(SKILL_MAP);
  const allTierKeys = [...Object.keys(TIER1), ...Object.keys(TIER2), ...Object.keys(TIER3)];
  const allTierValues = [...Object.values(TIER1), ...Object.values(TIER2), ...Object.values(TIER3)].flat();
  const allTierEntries = [...new Set([...allTierKeys, ...allTierValues])];

  // Find inference keys that appear in TIER maps but with wrong format (underscore vs space)
  const mismatches = [];
  for (const skillKey of allInferenceKeys) {
    if (allTierEntries.includes(skillKey)) continue; // correct format exists
    const underscored = skillKey.replace(/ /g, '_').replace(/\//g, '_');
    if (allTierEntries.includes(underscored)) {
      mismatches.push({ skill: skillKey, tierHas: underscored });
    }
  }

  const ok = mismatches.length === 0;
  console.log(`${ok ? '✅' : '❌'} Skill-inference key format consistency: ${mismatches.length === 0 ? 'all match' : mismatches.map(m => `${m.skill} vs ${m.tierHas}`).join(', ')}`);
  ok ? passed++ : failed++;
}

// EXP-093: Verify jenkins↔github actions similarity works with skill-inference output keys
{
  const sim = getSimilarity('jenkins', 'github actions');
  const ok = sim === 0.75;
  console.log(`${ok ? '✅' : '❌'} Jenkins ↔ github actions similarity: ${sim} (expected 0.75)`);
  ok ? passed++ : failed++;

  const sim2 = getSimilarity('github actions', 'jenkins');
  const ok2 = sim2 === 0.75;
  console.log(`${ok2 ? '✅' : '❌'} github actions ↔ Jenkins similarity: ${sim2} (expected 0.75)`);
  ok2 ? passed++ : failed++;
}

// Summary
console.log(`\n📊 Results: ${passed}/${passed + failed} passed, ${failed} failed`);
if (failed === 0) console.log('✅ All validated matching algorithm tests passed!');
else console.log('❌ Some tests failed - algorithm needs adjustment');
