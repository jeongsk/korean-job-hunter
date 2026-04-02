/**
 * EXP-051: Missing-Field Robustness Tests for Matching Algorithm
 * 
 * Real scraped jobs often have missing fields — no experience range,
 * no location, no culture_keywords, no career_stage. This tests that
 * the matching algorithm degrades gracefully with partial data.
 * 
 * Hypothesis: Jobs with missing fields should:
 * 1. Never score higher than a fully-matching job with all fields
 * 2. Score within a reasonable range (not extreme highs/lows)
 * 3. Maintain discrimination: a skill-matched partial job > skill-mismatched partial job
 * 4. Each missing field should reduce the score proportionally to its weight
 */

// === Copy algorithm from test_validated_matching.js ===
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
  'fastapi': ['python', 'django', 'flask'], 'python': ['fastapi', 'django', 'flask'],
  'django': ['python', 'fastapi', 'flask'], 'flask': ['python', 'fastapi', 'django'],
  'aws': ['gcp', 'azure', 'cloud'], 'gcp': ['aws', 'azure', 'cloud'], 'azure': ['aws', 'gcp', 'cloud'],
};
const TIER3 = {
  'react': ['vue', 'angular'], 'vue': ['react', 'angular'], 'angular': ['react', 'vue'],
  'node.js': ['python'], 'python': ['node.js'],
  'aws': ['docker'], 'docker': ['aws'],
  'kubernetes': ['container'], 'container': ['kubernetes'],
  'sql': ['mongodb'], 'mongodb': ['sql'],
};

function getSimilarity(a, b) {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return 1.0;
  if (TIER1[al]?.includes(bl)) return 1.0;
  if (TIER2[al]?.includes(bl)) return 0.75;
  if (TIER3[al]?.includes(bl)) return 0.25;
  return 0;
}

const PRIMARY_DOMAINS = {
  'python': 'python', 'java': 'java', 'javascript': 'js/ts', 'typescript': 'js/ts',
  'go': 'go', 'rust': 'rust', 'swift': 'swift', 'c++': 'c++', 'c#': 'c#', 'kotlin': 'java',
  'spring': 'java', 'spring boot': 'java',
  'django': 'python', 'flask': 'python', 'fastapi': 'python',
  'react': 'js/ts', 'next.js': 'js/ts', 'vue': 'js/ts', 'nuxt.js': 'js/ts', 'svelte': 'js/ts', 'angular': 'js/ts',
  'express': 'js/ts', 'nestjs': 'js/ts', 'node.js': 'js/ts',
  'swiftui': 'swift', 'flutter': 'dart', 'dart': 'dart',
  '.net': 'c#', 'asp.net': 'c#',
  'ruby on rails': 'ruby', 'rails': 'ruby', 'ruby': 'ruby',
  'php': 'php', 'laravel': 'php',
};

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

function calculateSkillScore(jobSkills, candSkills) {
  if (jobSkills.length === 0) return 50;
  let total = 0;
  for (const js of jobSkills) { let best = 0; for (const cs of candSkills) { best = Math.max(best, getSimilarity(js, cs)); } total += best; }
  let score = (total / jobSkills.length) * 100;
  if (!hasDomainOverlap(jobSkills, candSkills)) score *= 0.60;
  return Math.round(score);
}

function skillGate(skillScore) {
  if (skillScore >= 40) return 1.0;
  return Math.max(0.04, (skillScore / 40) ** 2);
}

function calculateExperienceScore(jobExp, candidateYears) {
  if (typeof jobExp === 'string') {
    if (jobExp.includes('무관') || jobExp === 'any') return 80;
    const m = jobExp.match(/(\d+)\s*[~-~]\s*(\d+)/);
    if (m) { const min = parseInt(m[1]), max = parseInt(m[2]); if (candidateYears >= min && candidateYears <= max) return 95; if (candidateYears < min) return Math.max(0, 95 - (min - candidateYears) * 15); return Math.max(50, 95 - (candidateYears - max) * 10); }
    const sm = jobExp.match(/(\d+)/);
    if (sm) { const req = parseInt(sm[1]); return candidateYears >= req ? 90 : Math.max(0, 90 - (req - candidateYears) * 20); }
  }
  return 50; // EXP-051
}

function calculateCultureScore(jobCulture, candPrefs) {
  if (!jobCulture || jobCulture.length === 0) return 50; // EXP-051
  let matches = 0;
  for (const kw of jobCulture) { const p = candPrefs[kw]; if (p !== undefined && p >= 0.6) matches++; else if (p !== undefined && p >= 0.3) matches += 0.5; }
  return Math.round(Math.min(100, (matches / jobCulture.length) * 100));
}

function calculateCareerStageScore(jobStage, candYears) {
  const stages = ['entry', 'junior', 'mid', 'senior', 'lead'];
  const cs = candYears <= 1 ? 'entry' : candYears <= 3 ? 'junior' : candYears <= 7 ? 'mid' : candYears <= 12 ? 'senior' : 'lead';
  if (!jobStage) return 50; // EXP-051
  const gap = Math.abs(stages.indexOf(jobStage) - stages.indexOf(cs));
  if (gap === 0) return 95; if (gap === 1) return 75; return 40;
}

function calculateLocationWorkScore(jobLoc, jobWT, candPrefs) {
  let score = 50;
  if (candPrefs.locations?.some(l => jobLoc?.includes(l))) score += 25;
  if (candPrefs.work_types?.some(w => w === jobWT)) score += 25;
  return Math.min(100, score);
}

function calculateMatch(job, candidate) {
  const skillScore = calculateSkillScore(job.skills || [], candidate.skills || []);
  const gate = skillGate(skillScore);
  const expScore = calculateExperienceScore(job.experience, candidate.experience_years);
  const cultureScore = calculateCultureScore(job.culture_keywords, candidate.cultural_preferences);
  const stageScore = calculateCareerStageScore(job.career_stage, candidate.experience_years);
  const locScore = calculateLocationWorkScore(job.location, job.work_type, candidate.preferences);
  const raw = skillScore * WEIGHTS.skill + expScore * WEIGHTS.experience * gate + cultureScore * WEIGHTS.culture * gate + stageScore * WEIGHTS.career_stage * gate + locScore * WEIGHTS.location_work * gate;
  return { overall: Math.round(raw), skillScore, gate, components: { exp: expScore, culture: cultureScore, stage: stageScore, loc: locScore } };
}

// === Candidate (same as validated matching) ===
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
const passed = [], failed = [];
function assert(name, ok) { (ok ? passed : failed).push(name); console.log(`${ok ? '✅' : '❌'} ${name}`); }

// Baseline: full job
const fullJob = {
  skills: ['React', 'TypeScript', 'Next.js', 'PostgreSQL'],
  experience: '3~7년',
  culture_keywords: ['innovative', 'collaborative', 'learning_focused'],
  career_stage: 'mid',
  location: '서울 강남구',
  work_type: 'hybrid',
};
const fullScore = calculateMatch(fullJob, candidate).overall;
console.log(`\n📊 Baseline (full job): ${fullScore}\n`);

// === Group 1: Progressive field removal ===
console.log('━━━ Group 1: Progressive Field Removal ━━━');
const noExp = { ...fullJob, experience: undefined };
const noCulture = { ...fullJob, culture_keywords: [] };
const noStage = { ...fullJob, career_stage: null };
const noLoc = { ...fullJob, location: undefined, work_type: undefined };
const noExpCult = { ...fullJob, experience: undefined, culture_keywords: [] };
const noExpCultStage = { ...fullJob, experience: undefined, culture_keywords: [], career_stage: null };
const minimal = { ...fullJob, experience: undefined, culture_keywords: [], career_stage: null, location: undefined, work_type: undefined };

const scores = {
  full: fullScore,
  noExp: calculateMatch(noExp, candidate).overall,
  noCulture: calculateMatch(noCulture, candidate).overall,
  noStage: calculateMatch(noStage, candidate).overall,
  noLoc: calculateMatch(noLoc, candidate).overall,
  noExpCult: calculateMatch(noExpCult, candidate).overall,
  noExpCultStage: calculateMatch(noExpCultStage, candidate).overall,
  minimal: calculateMatch(minimal, candidate).overall,
};

for (const [k, v] of Object.entries(scores)) console.log(`  ${k}: ${v}`);

// Rule 1: Removing fields should never increase score
assert('noExp ≤ full', scores.noExp <= fullScore);
assert('noCulture ≤ full', scores.noCulture <= fullScore);
assert('noStage ≤ full', scores.noStage <= fullScore);
assert('noLoc ≤ full', scores.noLoc <= fullScore);
assert('minimal ≤ full', scores.minimal <= fullScore);

// Rule 2: More missing fields → lower score (monotonic decrease)
assert('noExpCult < noExp', scores.noExpCult < scores.noExp);
assert('noExpCultStage < noExpCult', scores.noExpCultStage < scores.noExpCult);
assert('minimal < noExpCultStage', scores.minimal < scores.noExpCultStage);

// Rule 3: Minimal (only skills) should still be > 0 and reasonable
assert('minimal > 0', scores.minimal > 0);
assert('minimal >= 20', scores.minimal >= 20); // skills alone should carry some weight

// Rule 4: Minimal should be noticeably lower than full
assert('full - minimal >= 10', fullScore - scores.minimal >= 10);

// === Group 2: Discrimination preserved with missing fields ===
console.log('\n━━━ Group 2: Discrimination With Missing Fields ━━━');

// Skill-matched partial vs skill-mismatched partial — both with no extra fields
const partialMatch = { skills: ['React', 'TypeScript', 'Node.js'], experience: undefined, culture_keywords: [], career_stage: null, location: undefined, work_type: undefined };
const partialMismatch = { skills: ['Java', 'Spring', 'MySQL'], experience: undefined, culture_keywords: [], career_stage: null, location: undefined, work_type: undefined };

const pmScore = calculateMatch(partialMatch, candidate).overall;
const pmmScore = calculateMatch(partialMismatch, candidate).overall;
console.log(`  partial match: ${pmScore}, partial mismatch: ${pmmScore}`);

assert('partial match > partial mismatch', pmScore > pmmScore);
assert('partial match - partial mismatch >= 15', pmScore - pmmScore >= 15);

// === Group 3: Empty/null edge cases ===
console.log('\n━━━ Group 3: Edge Cases ━━━');

// Job with no skills at all
const noSkills = { skills: [], experience: undefined, culture_keywords: [], career_stage: null, location: undefined, work_type: undefined };
const noSkillsScore = calculateMatch(noSkills, candidate).overall;
console.log(`  no skills job: ${noSkillsScore}`);
assert('no-skills job score is neutral (40-60)', noSkillsScore >= 40 && noSkillsScore <= 60);

// Job with all defaults (undefined fields)
const allDefaults = { skills: ['React', 'TypeScript'] };
const allDefaultsScore = calculateMatch(allDefaults, candidate).overall;
console.log(`  all-defaults job: ${allDefaultsScore}`);
assert('all-defaults score reasonable (25-75)', allDefaultsScore >= 25 && allDefaultsScore <= 75);

// Job with experience "경력무관" + missing other fields
const expAny = { skills: ['React', 'TypeScript'], experience: '경력무관' };
const expAnyScore = calculateMatch(expAny, candidate).overall;
console.log(`  경력무관 + missing fields: ${expAnyScore}`);
assert('경력무관 + defaults > same without experience', expAnyScore >= allDefaultsScore);

// === Group 4: Missing field doesn't break gate ===
console.log('\n━━━ Group 4: Gate Behavior With Missing Fields ━━━');

// Cross-domain job with all fields missing should still have skill gate active
const crossDomainMinimal = { skills: ['Java', 'Spring'], experience: undefined, culture_keywords: [], career_stage: null, location: undefined, work_type: undefined };
const cdm = calculateMatch(crossDomainMinimal, candidate);
console.log(`  cross-domain minimal: ${cdm.overall} (skill: ${cdm.skillScore}, gate: ${cdm.gate.toFixed(2)})`);
assert('cross-domain gate < 0.5', cdm.gate < 0.5);
assert('cross-domain score <= 15', cdm.overall <= 15);

// Same-domain job with all fields missing — gate should be 1.0
const sameDomainMinimal = { skills: ['React', 'TypeScript', 'Node.js'], experience: undefined, culture_keywords: [], career_stage: null, location: undefined, work_type: undefined };
const sdm = calculateMatch(sameDomainMinimal, candidate);
console.log(`  same-domain minimal: ${sdm.overall} (skill: ${sdm.skillScore}, gate: ${sdm.gate.toFixed(2)})`);
assert('same-domain gate = 1.0', sdm.gate === 1.0);

// === Group 5: Score bounds for common scraping outcomes ===
console.log('\n━━━ Group 5: Common Scraping Outcomes ━━━');

// Typical Wanted scrape result (good skills, no culture, no stage)
const wantedTypical = { skills: ['React', 'TypeScript', 'Next.js'], experience: '3~5년', culture_keywords: [], career_stage: null, location: '서울', work_type: 'hybrid' };
const wt = calculateMatch(wantedTypical, candidate).overall;
console.log(`  Wanted typical: ${wt}`);
assert('Wanted typical 50-90', wt >= 50 && wt <= 90);

// Typical JobKorea scrape result (skills + salary + deadline, no culture)
const jkTypical = { skills: ['React', 'JavaScript', 'Node.js'], experience: '경력 3~10년', culture_keywords: [], career_stage: null, location: '서울 영등포구', work_type: undefined };
const jk = calculateMatch(jkTypical, candidate).overall;
console.log(`  JobKorea typical: ${jk}`);
assert('JobKorea typical 50-90', jk >= 50 && jk <= 90);

// LinkedIn minimal (often just title + company, few skills extracted)
const linkedinMinimal = { skills: ['React'], experience: undefined, culture_keywords: [], career_stage: null, location: '서울특별시, 대한민국', work_type: undefined };
const li = calculateMatch(linkedinMinimal, candidate).overall;
console.log(`  LinkedIn minimal: ${li}`);
assert('LinkedIn minimal 20-70', li >= 20 && li <= 70);

// === Summary ===
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Missing-Field Robustness: ${passed.length}/${passed.length + failed.length} passed`);
if (failed.length === 0) console.log('✅ All missing-field robustness tests passed!');
else console.log(`❌ ${failed.length} tests failed: ${failed.join(', ')}`);
