/**
 * EXP-044: Resume → Matching Pipeline Integration Tests
 * 
 * Verifies that resume-agent's master.yaml output schema
 * correctly feeds into the matching algorithm without data loss
 * or type mismatches.
 */

const passed = [];
const failed = [];

function assert(name, condition) {
  if (condition) {
    passed.push(name);
  } else {
    failed.push(name);
    console.log(`❌ ${name}`);
  }
}

// === Resume-agent output schema (what master.yaml produces) ===
const masterYaml = {
  profile: { name: "정석", home_address: "서울시 강남구" },
  skills: {
    languages: ["JavaScript", "TypeScript", "Python"],
    frameworks: ["React", "Next.js", "Node.js", "Express"],
    databases: ["PostgreSQL", "Redis", "MongoDB"],
    tools: ["Git", "Docker", "AWS", "Kubernetes"],
    methodologies: ["Agile", "TDD", "CI/CD"],
  },
  experience: [
    { company: "카카오", position: "프론트엔드 개발자", period: "2021.03 - 2024.06", years: 3.25, tech_stack: ["React", "TypeScript", "AWS"] },
    { company: "스타트업A", position: "백엔드 인턴", period: "2020.01 - 2021.02", years: 1.08, tech_stack: ["Node.js", "Express", "MongoDB"] },
  ],
  derived: {
    total_experience_years: 4.33,
    career_stage: "mid",
    primary_domain: "frontend",
    skill_summary: ["JavaScript", "TypeScript", "Python", "React", "Next.js", "Node.js", "Express", "PostgreSQL", "Redis", "MongoDB", "Git", "Docker", "AWS", "Kubernetes", "Agile", "TDD", "CI/CD"],
  },
  preferences: {
    work_type: ["hybrid", "remote"],
    location: ["서울", "판교"],
    salary_range: { min: 5000, max: 8000 },
  },
  cultural_preferences: {
    innovative: 0.8,
    collaborative: 0.7,
    autonomous: 0.6,
    structured: 0.4,
    fast_paced: 0.7,
    learning_focused: 0.8,
  },
};

// === Matching algorithm expects these fields ===
// (from matcher-agent.md / test_validated_matching.js)

// --- 1. Skill Summary → Skill Score ---
// Matcher reads: candidate.skills (array of strings)
function extractCandidateSkills(yaml) {
  return yaml.derived.skill_summary.map(s => s.toLowerCase());
}

const candidateSkills = extractCandidateSkills(masterYaml);
assert("skills-extracted", candidateSkills.length === 17);
assert("skills-lowercase", candidateSkills.every(s => s === s.toLowerCase()));
assert("skills-no-duplicates", new Set(candidateSkills).size === candidateSkills.length);

// Matcher can compute skill overlap
const jobSkills = ["React", "TypeScript", "AWS", "Docker"];
const overlap = jobSkills.filter(js => candidateSkills.includes(js.toLowerCase()));
assert("skill-overlap-computed", overlap.length === 4);

// Mismatched skills
const mismatchJob = ["Java", "Spring", "Kubernetes"];
const mismatchOverlap = mismatchJob.filter(js => candidateSkills.includes(js.toLowerCase()));
assert("skill-mismatch-detected", mismatchOverlap.length === 1); // only Kubernetes

// --- 2. Experience Years → Experience Score ---
// Matcher reads: candidate.experience_years (number)
function extractExperienceYears(yaml) {
  return yaml.derived.total_experience_years;
}

const expYears = extractExperienceYears(masterYaml);
assert("experience-is-number", typeof expYears === "number");
assert("experience-positive", expYears > 0);
assert("experience-reasonable", expYears >= 0 && expYears <= 40);

// Verify experience score can be computed for various ranges
function calcExpScore(range, years) {
  const m = range.match(/(\d+)\s*[~\-]\s*(\d+)/);
  if (m) {
    const [_, lo, hi] = m.map(Number);
    if (years >= lo && years <= hi) return 95;
    if (years < lo) return Math.max(0, 100 - (lo - years) * 15);
    return Math.max(50, 95 - (years - hi) * 5);
  }
  if (range.includes("무관")) return 80;
  return 60;
}

assert("exp-score-in-range", calcExpScore("3~7년", expYears) === 95); // 4.33 fits 3-7
assert("exp-score-below-range", calcExpScore("7~10년", expYears) < 95);
assert("exp-score-any", calcExpScore("경력무관", expYears) === 80);

// --- 3. Career Stage → Career Stage Score ---
// Matcher reads: candidate.career_stage (string)
function extractCareerStage(yaml) {
  return yaml.derived.career_stage;
}

const stage = extractCareerStage(masterYaml);
const validStages = ["entry", "junior", "mid", "senior", "lead"];
assert("career-stage-valid", validStages.includes(stage));
assert("career-stage-matches-years", stage === "mid"); // 4.33 years = mid (3-7)

// --- 4. Preferences → Location/Work-type Score ---
// Matcher reads: candidate.preferred_work_type, candidate.preferred_location
function extractPreferences(yaml) {
  return {
    work_type: yaml.preferences.work_type,
    location: yaml.preferences.location,
  };
}

const prefs = extractPreferences(masterYaml);
assert("pref-work-type-is-array", Array.isArray(prefs.work_type));
assert("pref-location-is-array", Array.isArray(prefs.location));
assert("pref-work-type-values", prefs.work_type.every(w => ["remote", "hybrid", "onsite"].includes(w)));

// Location matching
assert("location-match-seoul", prefs.location.includes("서울"));
assert("location-match-pangyo", prefs.location.includes("판교"));

// Work type matching against scraped jobs
assert("work-type-match-hybrid", prefs.work_type.includes("hybrid"));
const remoteJob = { work_type: "remote" };
const onsiteJob = { work_type: "onsite" };
assert("work-type-remote-match", prefs.work_type.includes(remoteJob.work_type));
assert("work-type-onsite-no-match", !prefs.work_type.includes(onsiteJob.work_type));

// --- 5. Cultural Preferences → Culture Score ---
// Matcher reads: candidate.cultural_preferences (object with 6 dimensions)
function extractCulturalPrefs(yaml) {
  return yaml.cultural_preferences;
}

const cultPrefs = extractCulturalPrefs(masterYaml);
const requiredDims = ["innovative", "collaborative", "autonomous", "structured", "fast_paced", "learning_focused"];
assert("culture-all-dims", requiredDims.every(d => d in cultPrefs));
assert("culture-values-01", requiredDims.every(d => cultPrefs[d] >= 0 && cultPrefs[d] <= 1));
assert("culture-values-numeric", requiredDims.every(d => typeof cultPrefs[d] === "number"));

// Culture score computation
function calcCultureScore(candidatePrefs, jobKeywords) {
  if (!jobKeywords || jobKeywords.length === 0) return 70; // neutral
  let total = 0;
  for (const kw of jobKeywords) {
    const dim = kw.toLowerCase();
    total += candidatePrefs[dim] !== undefined ? candidatePrefs[dim] : 0.5;
  }
  return Math.round((total / jobKeywords.length) * 100);
}

assert("culture-score-with-keywords", calcCultureScore(cultPrefs, ["innovative", "fast_paced"]) === 75);
assert("culture-score-no-keywords", calcCultureScore(cultPrefs, []) === 70);
assert("culture-score-mismatch", calcCultureScore(cultPrefs, ["structured", "autonomous"]) === 50);

// --- 6. Primary Domain → Domain Alignment ---
// Matcher reads: candidate skill_summary for domain detection
const PRIMARY_DOMAINS = {
  'python': 'python', 'java': 'java', 'javascript': 'js/ts', 'typescript': 'js/ts',
  'go': 'go', 'rust': 'rust', 'swift': 'swift', 'c++': 'c++', 'c#': 'c#',
};

function detectDomain(skills) {
  const domains = new Set();
  for (const s of skills) {
    const d = PRIMARY_DOMAINS[s.toLowerCase()];
    if (d) domains.add(d);
  }
  return domains;
}

const candidateDomain = detectDomain(candidateSkills);
assert("domain-detected", candidateDomain.has("js/ts"));
assert("domain-has-python", candidateDomain.has("python"));

// Domain overlap check
const jsJobDomain = detectDomain(["JavaScript", "React", "TypeScript"]);
const javaJobDomain = detectDomain(["Java", "Spring"]);
assert("domain-overlap-js", [...candidateDomain].some(d => jsJobDomain.has(d)));
assert("domain-no-overlap-java", ![...candidateDomain].some(d => javaJobDomain.has(d)));

// --- 7. Full Pipeline: Resume → Score ---
function computeFullScore(yaml, job) {
  const skills = extractCandidateSkills(yaml);
  const expYears = extractExperienceYears(yaml);
  const prefs = extractPreferences(yaml);
  const cultPrefs = extractCulturalPrefs(yaml);
  const candidateDomain = detectDomain(skills);
  
  // Skill score (simplified)
  const jobSkillsLower = (job.skills || []).map(s => s.toLowerCase());
  let skillScore = 0;
  if (jobSkillsLower.length > 0) {
    let total = 0;
    for (const js of jobSkillsLower) {
      let best = skills.includes(js) ? 1 : 0;
      total += best;
    }
    skillScore = Math.round((total / jobSkillsLower.length) * 100);
    // Domain penalty
    const jobDomain = detectDomain(job.skills || []);
    const overlap = [...candidateDomain].some(d => jobDomain.has(d));
    if (!overlap && jobDomain.size > 0) skillScore = Math.round(skillScore * 0.6);
  } else {
    skillScore = 50;
  }
  
  // Experience score
  const expScore = job.experience ? calcExpScore(job.experience, expYears) : 70;
  
  // Work type score
  let wtScore = 50;
  if (job.work_type && prefs.work_type.includes(job.work_type)) wtScore = 100;
  else if (job.work_type === "onsite") wtScore = 40;
  
  // Culture score
  const cultureScore = calcCultureScore(cultPrefs, job.culture_keywords || []);
  
  // Stage score
  const stageScore = job.career_stage === stage ? 95 : 70;
  
  // Weighted
  const overall = Math.round(
    skillScore * 0.35 + expScore * 0.25 + cultureScore * 0.15 + stageScore * 0.15 + wtScore * 0.10
  );
  
  return { overall, skillScore, expScore, cultureScore, stageScore, wtScore };
}

// Perfect match
const perfectJob = {
  skills: ["React", "TypeScript", "Node.js", "AWS"],
  experience: "3~7년",
  work_type: "hybrid",
  career_stage: "mid",
  culture_keywords: ["innovative", "learning_focused"],
};
const perfectScore = computeFullScore(masterYaml, perfectJob);
assert("perfect-high-score", perfectScore.overall >= 80);
assert("perfect-skill-100", perfectScore.skillScore === 100);
assert("perfect-exp-95", perfectScore.expScore === 95);
assert("perfect-wt-100", perfectScore.wtScore === 100);

// Bad match
const badJob = {
  skills: ["Java", "Spring", "Oracle"],
  experience: "7~10년",
  work_type: "onsite",
  career_stage: "senior",
  culture_keywords: ["structured"],
};
const badScore = computeFullScore(masterYaml, badJob);
assert("bad-low-score", badScore.overall < perfectScore.overall);
assert("bad-domain-penalized", badScore.skillScore < perfectScore.skillScore);
assert("bad-exp-below", badScore.expScore < perfectScore.expScore);

// Discrimination gap
const gap = perfectScore.overall - badScore.overall;
assert("discrimination-gap-20+", gap >= 20);

// --- 8. Schema Completeness ---
// Verify all fields the matcher needs exist in the yaml
assert("yaml-has-profile", "profile" in masterYaml);
assert("yaml-has-skills", "skills" in masterYaml);
assert("yaml-has-derived", "derived" in masterYaml);
assert("yaml-has-preferences", "preferences" in masterYaml);
assert("yaml-has-cultural", "cultural_preferences" in masterYaml);
assert("yaml-has-skill-summary", Array.isArray(masterYaml.derived.skill_summary));
assert("yaml-has-total-exp", typeof masterYaml.derived.total_experience_years === "number");
assert("yaml-has-career-stage", typeof masterYaml.derived.career_stage === "string");
assert("yaml-has-work-type-pref", Array.isArray(masterYaml.preferences.work_type));
assert("yaml-has-location-pref", Array.isArray(masterYaml.preferences.location));

// --- 9. Edge Cases ---
// Missing optional fields
const minimalYaml = {
  profile: { name: "테스트" },
  skills: { languages: ["Python"] },
  derived: {
    total_experience_years: 1,
    career_stage: "junior",
    primary_domain: "backend",
    skill_summary: ["Python"],
  },
  preferences: { work_type: ["onsite"], location: ["서울"] },
  cultural_preferences: {
    innovative: 0.5, collaborative: 0.5, autonomous: 0.5,
    structured: 0.5, fast_paced: 0.5, learning_focused: 0.5,
  },
};
const minimalSkills = extractCandidateSkills(minimalYaml);
assert("minimal-skills-work", minimalSkills.length === 1);

const minimalJob = {
  skills: ["Python", "Django"],
  experience: "경력무관",
  work_type: "onsite",
  career_stage: "junior",
  culture_keywords: [],
};
const minimalScore = computeFullScore(minimalYaml, minimalJob);
assert("minimal-reasonable-score", minimalScore.overall > 0 && minimalScore.overall <= 100);

// Empty job skills
const noSkillJob = { skills: [], experience: "경력무관", work_type: "hybrid" };
const noSkillScore = computeFullScore(masterYaml, noSkillJob);
assert("empty-job-skills-neutral", noSkillScore.skillScore === 50);

// Summary
console.log("\n=== Resume → Match Pipeline Integration Tests ===");
for (const p of passed) console.log(`✅ ${p}`);
for (const f of failed) console.log(`❌ ${f}`);
console.log(`\n📊 Results: ${passed.length}/${passed.length + failed.length} passed, ${failed.length} failed`);
if (failed.length === 0) console.log("✅ All resume→match integration tests passed!");
else console.log("❌ Pipeline integration has gaps!");
