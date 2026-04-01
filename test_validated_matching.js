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
  'vue': ['nuxt.js'], 'nuxt.js': ['vue'],
  'postgresql': ['mysql', 'sql'], 'mysql': ['postgresql', 'sql'], 'sql': ['postgresql', 'mysql'],
  'docker': ['container'], 'container': ['docker'],
};

const TIER2 = { // 75%
  'spring': ['spring boot'], 'spring boot': ['spring'],
  'express': ['node.js', 'nestjs'], 'node.js': ['express', 'nestjs'], 'nestjs': ['node.js', 'express'],
  'fastapi': ['python'], 'python': ['fastapi', 'django', 'flask'],
  'django': ['python'], 'flask': ['python'],
  'aws': ['gcp', 'azure', 'cloud'], 'gcp': ['aws', 'azure', 'cloud'], 'azure': ['aws', 'gcp', 'cloud'],
  'java': ['kotlin'], 'kotlin': ['java'], // JVM interoperable (EXP-062)
  'react': ['react native'], 'react native': ['react'], // shared React paradigm (EXP-062)
};

const TIER3 = { // 25%
  'react': ['vue', 'svelte'], 'vue': ['react', 'svelte'], 'svelte': ['react', 'vue'],
  'node.js': ['python'], 'python': ['node.js'],
  'aws': ['docker'], 'docker': ['aws', 'kubernetes'], 'kubernetes': ['docker'], // container ecosystem (EXP-062)
  'kubernetes': ['container'], 'container': ['kubernetes'],
  'sql': ['mongodb'], 'mongodb': ['sql'],
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
  // jobExpRange: "3~5년" or "경력무관" or {min, max}
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

// === Location/Work Score ===
function calculateLocationWorkScore(jobLocation, jobWorkType, candidatePrefs) {
  let score = 50;
  if (candidatePrefs.locations?.some(l => jobLocation?.includes(l))) score += 25;
  if (candidatePrefs.work_types?.some(w => w === jobWorkType)) score += 25;
  return Math.min(100, score);
}

// === Full Match Score ===
function calculateMatch(job, candidate) {
  const skillScore = calculateSkillScore(job.skills, candidate.skills);
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

// Summary
console.log(`\n📊 Results: ${passed}/${passed + failed} passed, ${failed} failed`);
if (failed === 0) console.log('✅ All validated matching algorithm tests passed!');
else console.log('❌ Some tests failed - algorithm needs adjustment');
