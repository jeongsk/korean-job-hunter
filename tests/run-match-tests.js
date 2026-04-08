#!/usr/bin/env node
/**
 * Match Discrimination Test Runner
 * 
 * Tests the job-matching skill's ability to discriminate between
 * well-matched and poorly-matched jobs for a given candidate.
 * 
 * Usage: node tests/run-match-tests.js
 */

const fs = require('fs');
const path = require('path');

const TEST_FILE = path.join(__dirname, 'match-discrimination.test.json');
const REPORT_FILE = path.join(__dirname, 'match-discrimination-report.json');

// EXP-129: Use shared skill-inference instead of duplicate local map
const { inferSkills } = require('../scripts/skill-inference');

function loadTestCases() {
  if (!fs.existsSync(TEST_FILE)) {
    console.error('❌ Test file not found:', TEST_FILE);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
}

/**
 * Score a single job against the candidate using the matching algorithm.
 * This implements a simplified version of the job-matching SKILL.md algorithm.
 */
function calculateMatch(candidate, job) {
  const scores = {};
  
  // --- 1. Skill Match (35%) ---
  const jobContent = (job.content || '').toLowerCase();
  const jobTitle = (job.title || '').toLowerCase();
  const jobText = jobTitle + ' ' + jobContent;
  
  const candidateSkills = candidate.skills.map(s => s.toLowerCase());
  
  // EXP-129: Use inferSkills() from skill-inference.js (135+ skills with Korean equivalents)
  // instead of a hardcoded 13-skill map
  const jobExtractedSkills = inferSkills(jobText);
  
  // EXP-129: Comprehensive similarity maps aligned with SKILL.md v3.13
  // Tier 2 equivalents (75% credit): related technologies, same ecosystem
  const tier2Map = {
    // Frontend frameworks
    'react': ['vue', 'nuxt', 'svelte', 'angular', 'next.js', 'react native'],
    'vue': ['react', 'nuxt', 'svelte', 'angular'],
    'angular': ['react', 'vue', 'svelte', 'typescript'],
    'next.js': ['nuxt', 'remix', 'gatsby', 'react', 'vercel'],
    'nuxt': ['next.js', 'remix', 'vue'],
    'typescript': ['javascript'],
    'javascript': ['typescript'],
    // JS runtimes/frameworks
    'node.js': ['express', 'nestjs', 'deno', 'bun', 'hono', 'fastify', 'koa'],
    'express': ['node.js', 'nestjs'],
    'nestjs': ['node.js', 'express'],
    // Python ecosystem
    'python': ['django', 'flask', 'fastapi'],
    'django': ['python', 'flask', 'fastapi'],
    'flask': ['python', 'django', 'fastapi'],
    'fastapi': ['python', 'django', 'flask'],
    // Java ecosystem
    'java': ['spring', 'spring boot', 'kotlin', 'jpa'],
    'spring': ['spring boot', 'java', 'kotlin', 'jpa'],
    'spring boot': ['spring', 'java'],
    'kotlin': ['java', 'spring'],
    // Cloud
    'aws': ['gcp', 'azure'],
    'gcp': ['aws', 'azure'],
    'azure': ['aws', 'gcp'],
    // Container/DevOps
    'docker': ['kubernetes', 'terraform', 'ansible'],
    'kubernetes': ['docker', 'terraform'],
    'terraform': ['ansible', 'docker', 'kubernetes'],
    'jenkins': ['github actions'],
    'github actions': ['jenkins'],
    // Databases
    'postgresql': ['mysql', 'oracle', 'mssql'],
    'mysql': ['postgresql', 'oracle', 'mssql'],
    'mongodb': ['redis', 'elasticsearch'],
    'redis': ['mongodb', 'elasticsearch'],
    'elasticsearch': ['redis', 'mongodb'],
    // Messaging
    'kafka': ['rabbitmq'],
    'rabbitmq': ['kafka'],
    // Data engineering
    'spark': ['hadoop'],
    'hadoop': ['spark'],
    // AI/ML
    'tensorflow': ['pytorch'],
    'pytorch': ['tensorflow'],
    'machine learning': ['tensorflow', 'pytorch', 'llm'],
    'llm': ['langchain', 'rag', 'machine learning'],
    // Mobile
    'flutter': ['dart', 'react native'],
    'react native': ['flutter', 'react'],
    'swift': ['swiftui'],
    'swiftui': ['swift'],
    // State management
    'redux': ['zustand', 'recoil', 'mobx'],
    'zustand': ['redux', 'recoil', 'mobx'],
    // API
    'graphql': ['rest api'],
    'rest api': ['graphql'],
    // Monitoring
    'datadog': ['grafana', 'prometheus'],
    'grafana': ['datadog', 'prometheus'],
    'prometheus': ['grafana', 'datadog'],
    // ORM
    'prisma': ['drizzle', 'typeorm', 'sequelize'],
    'drizzle': ['prisma', 'typeorm'],
    // Testing frameworks (EXP-166)
    'vitest': ['jest'],
    'jest': ['vitest'],
    'cypress': ['playwright', 'selenium'],
    'playwright': ['cypress', 'selenium'],
    'selenium': ['cypress', 'playwright'],
    // BaaS (EXP-166)
    'firebase': ['supabase'],
    'supabase': ['firebase'],
    // Package managers (EXP-166)
    'pnpm': ['yarn'],
    'yarn': ['pnpm'],
    // State management expansion (EXP-166)
    'recoil': ['redux', 'zustand', 'mobx'],
    'mobx': ['redux', 'zustand', 'recoil'],
    'vuex': ['pinia'],
    'pinia': ['vuex'],
    'jotai': ['zustand', 'recoil'],
    // Systems languages (EXP-166)
    'go': ['rust', 'c++'],
    'rust': ['go', 'c++'],
    'c++': ['go', 'rust', 'c#'],
    'c#': ['c++', '.net'],
    '.net': ['c#'],
    'ruby': ['rails'],
    'rails': ['ruby', 'laravel'],
    'php': ['laravel'],
    'laravel': ['php', 'rails'],
    // Build tools (EXP-166)
    'vite': ['turborepo', 'storybook'],
    'turborepo': ['vite'],
    // CSS frameworks (EXP-166)
    'tailwind': ['storybook'],
    // Desktop frameworks (EXP-166)
    'electron': ['tauri'],
    'tauri': ['electron'],
    // Mobile cross-platform (EXP-166)
    'capacitor': ['ionic', 'react native'],
    'ionic': ['capacitor', 'react native'],
    // API protocols (EXP-166)
    'grpc': ['graphql', 'rest api'],
    // Data orchestration (EXP-166)
    'airflow': ['dbt'],
    'dbt': ['airflow'],
    'snowflake': ['bigquery'],
    'bigquery': ['snowflake'],
    // Cloud services (EXP-166)
    'dynamodb': ['mongodb'],
    'aws lambda': ['aws'],
    'aws s3': ['aws'],
    'aws sqs': ['kafka'],
    'cloudwatch': ['datadog', 'grafana'],
    // Data stores (EXP-166)
    'opensearch': ['elasticsearch'],
    'mybatis': ['jpa'],
    // AI/ML expansion (EXP-166)
    'mlops': ['docker', 'kubernetes'],
    'vector database': ['elasticsearch', 'mongodb'],
    'fine-tuning': ['pytorch', 'tensorflow'],
    'huggingface': ['pytorch', 'tensorflow'],
    'prompt engineering': ['llm', 'rag'],
    'stable diffusion': ['pytorch'],
    'computer vision': ['tensorflow', 'pytorch'],
    'nlp': ['llm', 'machine learning'],
    // Java ecosystem (EXP-166)
    'msa': ['kubernetes', 'docker'],
    'webflux': ['spring', 'spring boot'],
    'celery': ['kafka', 'rabbitmq'],
    // Game engines (EXP-166)
    'unity': ['unreal'],
    'unreal': ['unity'],
    // Blockchain (EXP-166)
    'solidity': ['ethereum', 'blockchain', 'smart contract'],
    'blockchain': ['solidity', 'ethereum', 'web3', 'smart contract'],
    'web3': ['blockchain', 'ethereum'],
    'ethereum': ['solidity', 'blockchain', 'web3'],
    'smart contract': ['solidity', 'blockchain'],
    // Security (EXP-166)
    'devsecops': ['docker', 'kubernetes', 'ci/cd'],
    'owasp': ['cybersecurity', 'penetration testing'],
    'cybersecurity': ['owasp', 'penetration testing'],
    'penetration testing': ['owasp', 'cybersecurity'],
    // Platform/SRE (EXP-166)
    'sre': ['kubernetes', 'docker', 'prometheus'],
    'platform engineering': ['kubernetes', 'docker', 'terraform'],
    'istio': ['kubernetes'],
    'argocd': ['kubernetes', 'ci/cd'],
    // Monitoring expansion (EXP-166)
    'sentry': ['datadog'],
    // Linux/Infra (EXP-166)
    'linux': ['docker', 'kubernetes', 'nginx'],
    'nginx': ['linux', 'docker'],
    'ci/cd': ['jenkins', 'github actions'],
    // React ecosystem (EXP-166)
    'react query': ['graphql', 'rest api'],
    // Frameworks (EXP-166)
    'astro': ['next.js', 'nuxt'],
    'r': ['python', 'machine learning'],
    // DB ODM (EXP-166)
    'mongoose': ['mongodb'],
  };
  
  // Tier 3 partial overlap (25%): same broad domain
  const tier3Map = {
    'react': ['frontend', '프론트엔드', 'ui'],
    'vue': ['frontend', '프론트엔드', 'ui'],
    'angular': ['frontend', '프론트엔드', 'ui'],
    'node.js': ['backend', '백엔드', '서버'],
    'python': ['backend', '백엔드', '데이터'],
    'java': ['backend', '백엔드', '서버'],
    'spring': ['backend', '백엔드'],
    'aws': ['devops', '인프라', 'infra', '클라우드'],
    'docker': ['devops', '인프라', '배포', 'cicd'],
    'kubernetes': ['devops', '인프라'],
    'postgresql': ['database', '데이터베이스', 'db', 'sql'],
    'mysql': ['database', '데이터베이스', 'db', 'sql'],
    'figma': ['design', '디자인', 'ui'],
  };
  
  // EXP-129: Set-based matching using inferSkills() results
  const jobSkillSet = new Set(jobExtractedSkills);
  const candidateSkillSet = new Set(candidateSkills);
  
  let exactMatches = 0;
  let strongMatches = 0;
  let partialMatches = 0;
  let totalCandidateSkills = candidateSkills.length;
  
  for (const skill of candidateSkills) {
    // Exact match: candidate skill is in job's extracted skills
    if (jobSkillSet.has(skill)) {
      exactMatches++;
      continue;
    }
    
    // Check tier 2: candidate skill's equivalents are in job's extracted skills
    const t2 = tier2Map[skill] || [];
    if (t2.some(eq => jobSkillSet.has(eq))) {
      strongMatches++;
      continue;
    }
    
    // Check tier 3: broader domain overlap with job text
    const t3 = tier3Map[skill] || [];
    if (t3.some(kw => jobText.includes(kw))) {
      partialMatches++;
      continue;
    }
  }
  
  // --- Job-centric skill coverage (EXP-022 + EXP-129) ---
  // Measure how well the candidate covers each skill the job requires.
  const jobRequiredSkills = jobExtractedSkills;
  let coveragePoints = 0;
  const maxCoveragePoints = Math.max(jobRequiredSkills.length, 1) * 100;
  
  for (const reqSkill of jobRequiredSkills) {
    // Exact: candidate has this skill
    if (candidateSkillSet.has(reqSkill)) {
      coveragePoints += 100;
      continue;
    }
    
    // Tier 2: candidate has an equivalent skill
    const candidateHasTier2 = candidateSkills.some(cs => {
      const t2 = tier2Map[cs] || [];
      return t2.includes(reqSkill);
    });
    if (candidateHasTier2) {
      coveragePoints += 75;
      continue;
    }
    
    // Tier 3: broader domain match
    const candidateHasTier3 = candidateSkills.some(cs => {
      const t3 = tier3Map[cs] || [];
      return t3.some(kw => reqSkill.includes(kw) || kw.includes(reqSkill));
    });
    if (candidateHasTier3) {
      coveragePoints += 25;
      continue;
    }
    
    coveragePoints += 0;
  }
  
  // Hybrid: blend job-centric coverage with candidate-centric relevance
  const jobCoverageScore = Math.min(100, Math.round((coveragePoints / maxCoveragePoints) * 100));
  const candidateRelevancePoints = exactMatches * 100 + strongMatches * 75 + partialMatches * 25;
  const candidateRelevanceScore = Math.min(100, Math.round((candidateRelevancePoints / (totalCandidateSkills * 100)) * 100));
  
  // Blend: 60% job coverage + 40% candidate relevance
  let skillScore = Math.min(100, Math.round(jobCoverageScore * 0.6 + candidateRelevanceScore * 0.4));
  
  // EXP-129: Use inferSkills() results for domain detection instead of manual pattern matching
  const DOMAIN_MAP = {
    'js/ts': ['react', 'next.js', 'vue', 'nuxt', 'svelte', 'angular', 'node.js', 'express', 'nestjs', 'react native', 'deno', 'bun', 'remix', 'astro', 'fastify', 'koa', 'hono', 'vite', 'tailwind', 'vercel', 'trpc', 'storybook', 'jest', 'cypress', 'playwright', 'selenium', 'prisma', 'drizzle', 'typeorm', 'sequelize', 'mongoose', 'redux', 'zustand', 'recoil', 'mobx', 'vuex', 'pinia', 'electron', 'capacitor', 'ionic', 'sentry', 'firebase', 'supabase', 'graphql', 'rest api', 'grpc', 'javascript', 'typescript', 'vitest', 'webflux', 'turborepo'],
    'python': ['python', 'django', 'flask', 'fastapi', 'tensorflow', 'pytorch', 'machine learning', 'llm', 'langchain', 'mlops', 'computer vision', 'nlp', 'huggingface', 'fine-tuning', 'stable diffusion', 'rag', 'prompt engineering', 'vector database', 'celery'],
    'java': ['java', 'spring', 'spring boot', 'jpa', 'kotlin', 'mybatis', 'msa'],
    'cloud': ['aws', 'gcp', 'azure', 'aws lambda', 'aws s3', 'sqs', 'sns', 'dynamodb', 'cloudwatch', 'aurora', 'documentdb', 'elasticache', 'msk'],
    'devops': ['docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github actions', 'linux', 'nginx', 'ci/cd', 'datadog', 'grafana', 'prometheus', 'devops'],
    'data': ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'mssql', 'mariadb', 'kafka', 'rabbitmq', 'spark', 'hadoop', 'airflow', 'dbt', 'bigquery', 'snowflake', 'opensearch'],
    'rust': ['rust', 'tauri'],
    'go': ['go'],
    'swift': ['swift', 'swiftui'],
    'csharp': ['c#', '.net'],
    'cpp': ['c++'],
    'dart': ['dart', 'flutter'],
    'ruby': ['ruby', 'rails'],
    'php': ['php', 'laravel'],
    'game': ['unity', 'unreal'],
    'design': ['figma'],
    'blockchain': ['solidity', 'blockchain', 'web3', 'ethereum'],
    'security': ['cybersecurity', 'penetration testing', 'devsecops'],
  };
  
  // Detect job's primary domains from extracted skills
  const jobDomains = new Set();
  for (const skill of jobExtractedSkills) {
    for (const [domain, domainSkills] of Object.entries(DOMAIN_MAP)) {
      if (domainSkills.includes(skill)) {
        jobDomains.add(domain);
        break;
      }
    }
  }
  
  // Check if candidate has any skill in any of job's domains
  const candidateHasPrimaryDomain = candidateSkills.some(cs => {
    // Check if candidate skill belongs to any job domain
    for (const domain of jobDomains) {
      const domainSkills = DOMAIN_MAP[domain] || [];
      if (domainSkills.includes(cs)) return true;
      // Also check tier2
      const t2 = tier2Map[cs] || [];
      if (t2.some(eq => domainSkills.includes(eq))) return true;
    }
    return false;
  });
  // If job has primary tech domains and candidate has NO overlap, penalize skill score
  if (jobDomains.size > 0 && !candidateHasPrimaryDomain && skillScore > 0) {
    // Reduce by 25% - infrastructure overlap still counts but shouldn't dominate
    skillScore = Math.round(skillScore * 0.75);
  }
  scores.skill = { score: skillScore, weight: 0.35, exact: exactMatches, strong: strongMatches, partial: partialMatches, jobCoverage: jobCoverageScore, candidateRelevance: candidateRelevanceScore, jobRequired: jobRequiredSkills.length };
  
  // --- 2. Experience Fit (25%) ---
  const expRange = jobContent.match(/(\d+)\s*[~\-]\s*(\d+)\s*년/);
  const expMin = jobContent.match(/(\d+)\s*년\s*이상/);
  let requiredYearsMin = 0;
  let requiredYearsMax = 0;
  if (expRange) {
    requiredYearsMin = parseInt(expRange[1]);
    requiredYearsMax = parseInt(expRange[2]);
  } else if (expMin) {
    requiredYearsMin = parseInt(expMin[1]);
    requiredYearsMax = requiredYearsMin * 2; // "N년 이상" → upper bound ~2x
  }
  
  const candidateYears = candidate.experience_years;
  let experienceScore = 60; // baseline when no requirement specified
  
  if (requiredYearsMin > 0) {
    const ratio = candidateYears / requiredYearsMin;
    if (requiredYearsMax > 0 && candidateYears >= requiredYearsMin && candidateYears <= requiredYearsMax) {
      // Perfect: within the stated range
      experienceScore = 95;
    } else if (ratio >= 0.8 && ratio <= 1.5) {
      experienceScore = 90;
    } else if (ratio >= 0.6 && ratio <= 2.0) {
      experienceScore = 65;
    } else if (ratio > 2.0) {
      experienceScore = 45; // overqualified
    } else {
      experienceScore = 30;
    }
  } else if (job.experience === '경력') {
    // EXP-160: Bare 경력 (no year range) — employer wants "someone with experience"
    // Most Wanted API jobs have experience='경력' with no specific year requirement
    if (candidateYears >= 3) experienceScore = 90;                                // solid experience, matches generic 경력 well
    else if (candidateYears >= 1) experienceScore = 70;                           // some experience
    else experienceScore = 30;                                                    // no experience, doesn't meet 경력 requirement
  } else if (job.experience === '무관' || job.experience === '경력 무관') {
    // Any experience level is fine — mild preference for some experience
    experienceScore = Math.min(90, 60 + candidateYears * 5);
  }
  scores.experience = { score: experienceScore, weight: 0.25, required: requiredYearsMin, actual: candidateYears };
  
  // --- 3. Company Culture Fit (15%) ---
  // EXP-159: Synced with post-processor's 7 culture categories (was missing learning_focused, work_life_balance)
  const cultureKeywords = {
    'innovative': ['혁신', '도전', '창의', 'creative', 'innovation', '새로운'],
    'collaborative': ['협업', '팀워크', '팀', 'collaborative', 'partnership', '함께', 'agile'],
    'fast-paced': ['agile', '빠른', '실시간', '스타트업'],
    'structured': ['체계', 'process', 'systematic', '프로세스'],
    'learning_focused': ['성장', '학습', 'learning', 'growth', '교육', '워크샵', '컨퍼런스', '스터디', '멘토링', '세미나'],
    'autonomous': ['자율', '독립', 'self-directed', '자유', '오너십', '주도적'],
    'work_life_balance': ['워라밸', '워크라이프밸런스', 'wlb', '유연근무', '시차출근', '자유출퇴근', '연차', '휴가', '리프레시'],
  };
  
  let cultureScore = 40; // baseline for jobs with no culture signals
  const candidateCulture = candidate.cultural_preferences || {};
  let cultureSignals = 0;
  let cultureMatches = 0;
  let cultureChecked = 0;
  
  // Use structured culture_keywords if available (from post-processor), otherwise scan text
  const jobCultureTraits = new Set(job.culture_keywords || []);
  
  for (const [trait, keywords] of Object.entries(cultureKeywords)) {
    const jobHasTrait = jobCultureTraits.size > 0
      ? jobCultureTraits.has(trait)
      : keywords.some(kw => jobText.includes(kw));
    const candidatePrefers = (candidateCulture[trait] || 0) > 0.5;
    
    if (jobHasTrait) {
      cultureSignals++;
      if (candidatePrefers) cultureMatches++;
    }
    if (candidatePrefers) cultureChecked++;
  }
  
  // Score based on match rate among detected signals
  if (cultureSignals > 0) {
    cultureScore = Math.round((cultureMatches / cultureSignals) * 80) + 20;
  } else if (cultureChecked > 0) {
    // No culture signals detected - neutral
    cultureScore = 50;
  }
  scores.culture = { score: cultureScore, weight: 0.15 };
  
  // --- 4. Career Stage Alignment (15%) ---
  const seniorityKeywords = {
    'junior': ['주니어', 'junior', '신입', '1~3년'],
    'mid': ['미들', 'mid', '3~5년', '3~7년', '5년'],
    'senior': ['시니어', 'senior', 'lead', '리드', '7년 이상', '10년'],
  };
  
  let jobSeniority = null; // null = not detected from text
  let isSpecificRange = false; // true if specific year range found (e.g., "3~7년")
  let isMugwan = false; // true if experience is 무관 (open to all levels)
  
  for (const [level, kws] of Object.entries(seniorityKeywords)) {
    if (kws.some(kw => jobText.includes(kw))) {
      jobSeniority = level;
      isSpecificRange = kws.some(kw => /\d/.test(kw) && jobText.includes(kw));
      break;
    }
  }
  
  // Check for 무관 (open to all levels) — less informative than specific ranges
  const jobExperience = (job.experience || '').toLowerCase();
  if (jobExperience === '무관' || jobExperience === '경력무관') {
    isMugwan = true;
    jobSeniority = jobSeniority || 'mid'; // default to mid for scoring
  }
  
  // Default to mid if no seniority detected
  if (!jobSeniority) jobSeniority = 'mid';
  
  let careerScore = 50;
  if (jobSeniority === candidate.career_stage) {
    careerScore = 85;
    // Discount for non-specific signals
    if (isMugwan) careerScore = 70; // 무관: accepts everyone, less informative
    else if (!isSpecificRange) careerScore = 75; // no specific year range detected
  }
  else if (
    (jobSeniority === 'junior' && candidate.career_stage === 'mid') ||
    (jobSeniority === 'mid' && candidate.career_stage === 'senior')
  ) careerScore = 55;
  else careerScore = 30;
  
  // Domain relevance penalty: if no skill overlap at all, career alignment is less meaningful
  if (exactMatches === 0 && strongMatches === 0 && partialMatches === 0) {
    careerScore = Math.round(careerScore * 0.4); // 60% penalty for completely different domain
  } else if (exactMatches + strongMatches === 0) {
    careerScore = Math.round(careerScore * 0.7); // 30% penalty for mostly unrelated
  }
  scores.career = { score: careerScore, weight: 0.15, job: jobSeniority, candidate: candidate.career_stage };
  
  // --- 5. Location/Work Type (10%) ---
  let locationScore = 50;
  const jobWorkType = (job.work_type || '').toLowerCase();
  const preferredTypes = (candidate.preferred_work_type || []).map(t => t.toLowerCase());
  const preferredLocations = candidate.preferred_location || [];
  
  // Work type match
  if (preferredTypes.includes(jobWorkType)) locationScore += 25;
  else if (jobWorkType === 'remote' && preferredTypes.includes('remote')) locationScore += 25;
  
  // Location match
  const jobLoc = (job.location || '').toLowerCase();
  if (preferredLocations.some(loc => jobLoc.includes(loc.toLowerCase()))) locationScore += 25;
  
  locationScore = Math.min(100, locationScore);
  scores.location = { score: locationScore, weight: 0.10 };
  
  // --- Skill-gated multiplier (EXP-165: quadratic gate synced with SKILL.md) ---
  // When skill overlap is low, dampen all non-skill components.
  // Rationale: culture fit, career alignment, etc. are meaningless
  // if you don't have the right skills for the job.
  // Quadratic gate: 0.12 + 0.88 * (skill/40)² for skill < 40, gate = 1.0 for skill >= 40
  // At skill=0: gate=0.12, skill=10: gate=0.175, skill=20: gate=0.34, skill=40: gate=1.0
  const SKILL_GATE_THRESHOLD = 40;
  const skillGate = scores.skill.score >= SKILL_GATE_THRESHOLD 
    ? 1.0 
    : 0.12 + 0.88 * Math.pow(scores.skill.score / SKILL_GATE_THRESHOLD, 2);
  
  const gatedExperience = Math.round(scores.experience.score * skillGate);
  const gatedCulture = Math.round(scores.culture.score * skillGate);
  const gatedCareer = Math.round(scores.career.score * skillGate);  // already has domain penalty, but gate further
  const gatedLocation = Math.round(scores.location.score * skillGate);
  
  // --- Total ---
  const totalScore = Math.round(
    scores.skill.score * scores.skill.weight +
    gatedExperience * scores.experience.weight +
    gatedCulture * scores.culture.weight +
    gatedCareer * scores.career.weight +
    gatedLocation * scores.location.weight
  );
  
  return { total: totalScore, components: scores, skillGate };
}

function runTests() {
  const data = loadTestCases();
  const { candidate, test_cases, discrimination_rules } = data;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Match Discrimination Test Runner');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const results = [];
  const groups = { high: [], medium: [], low: [] };
  
  for (const tc of test_cases) {
    const match = calculateMatch(candidate, tc.job);
    const pass = match.total >= tc.expected.min_score;
    const inRange = match.total >= tc.expected.expected_range[0] && match.total <= tc.expected.expected_range[1];
    
    const result = {
      id: tc.id,
      description: tc.description,
      score: match.total,
      min_score: tc.expected.min_score,
      expected_range: tc.expected.expected_range,
      rank_group: tc.expected.rank_group,
      pass,
      in_range: inRange,
      components: match.components,
    };
    
    results.push(result);
    groups[tc.expected.rank_group].push(result);
    
    const status = pass ? '✅' : '❌';
    const range = inRange ? '📊' : '⚠️';
    console.log(`${status} ${range} [${tc.id}] ${tc.description}`);
    console.log(`   Score: ${match.total} (expected: ${tc.expected.expected_range[0]}-${tc.expected.expected_range[1]}, min: ${tc.expected.min_score})`);
    console.log(`   Skills: ${match.components.skill.score} | Exp: ${match.components.experience.score} | Culture: ${match.components.culture.score} | Career: ${match.components.career.score} | Location: ${match.components.location.score}`);
    console.log();
  }
  
  // Discrimination checks
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Discrimination Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const highScores = groups.high.map(r => r.score);
  const medScores = groups.medium.map(r => r.score);
  const lowScores = groups.low.map(r => r.score);
  
  const minHigh = Math.min(...highScores);
  const maxMed = Math.max(...medScores);
  const minMed = Math.min(...medScores);
  const maxLow = Math.max(...lowScores);
  const minLow = Math.min(...lowScores);
  const maxHigh = Math.max(...highScores);
  
  const rule1 = minHigh > maxMed;
  const rule2 = minMed > maxLow;
  const spread = maxHigh - minLow;
  const rule3 = spread >= 30;
  
  console.log(`HIGH scores:  [${highScores.join(', ')}] (range: ${Math.min(...highScores)}-${Math.max(...highScores)})`);
  console.log(`MED scores:   [${medScores.join(', ')}] (range: ${Math.min(...medScores)}-${Math.max(...medScores)})`);
  console.log(`LOW scores:   [${lowScores.join(', ')}] (range: ${Math.min(...lowScores)}-${Math.max(...lowScores)})`);
  console.log();
  console.log(`${rule1 ? '✅' : '❌'} Rule 1: All HIGH > all MEDIUM (min HIGH ${minHigh} > max MED ${maxMed})`);
  console.log(`${rule2 ? '✅' : '❌'} Rule 2: All MEDIUM > all LOW (min MED ${minMed} > max LOW ${maxLow})`);
  console.log(`${rule3 ? '✅' : '❌'} Rule 3: Spread >= 30 (actual: ${spread})`);
  console.log();
  
  const allPassed = results.every(r => r.pass);
  const allDiscrimination = rule1 && rule2 && rule3;
  
  const summary = {
    timestamp: new Date().toISOString(),
    total_tests: results.length,
    passed: results.filter(r => r.pass).length,
    failed: results.filter(r => !r.pass).length,
    in_range: results.filter(r => r.in_range).length,
    discrimination: { rule1, rule2, rule3, spread, allPassed: allDiscrimination },
    results,
    groups: {
      high: { scores: highScores, min: minHigh, max: maxHigh },
      medium: { scores: medScores, min: minMed, max: maxMed },
      low: { scores: lowScores, min: minLow, max: maxLow },
    }
  };
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(allPassed && allDiscrimination ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log(`   ${summary.passed}/${summary.total_tests} score tests passed`);
  console.log(`   Discrimination: ${allDiscrimination ? 'PASS' : 'FAIL'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  fs.writeFileSync(REPORT_FILE, JSON.stringify(summary, null, 2));
  console.log(`📄 Report saved to ${REPORT_FILE}`);
  
  return allPassed && allDiscrimination;
}

const success = runTests();
process.exit(success ? 0 : 1);
