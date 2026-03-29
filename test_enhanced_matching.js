#!/usr/bin/env node

// Enhanced Job Matching Test Script
// Tests the new graduated similarity scoring system

const testCases = [
  {
    id: "TC-006",
    label: "borderline",
    job: {
      required_skills: ["Java", "Spring Boot", "MySQL"],
      preferred_skills: ["Kubernetes", "JPA"],
      experience_years: 5,
      work_type: "onsite",
      location: "서울시 영등포구"
    },
    resume: {
      skills: ["Node.js", "TypeScript", "PostgreSQL", "Docker"],
      experience_years: 4,
      work_preference: ["remote", "hybrid"],
      home: "서울시 마포구"
    },
    expected: { min: 20, max: 55 },
    reason: "Spring≈Spring Boot 유사도로 약간의 점수"
  },
  {
    id: "TC-010", 
    label: "borderline",
    job: {
      required_skills: ["Python", "FastAPI", "PostgreSQL"],
      preferred_skills: ["Docker", "Kubernetes", "gRPC"],
      experience_years: 4,
      work_type: "hybrid",
      location: "서울시 마포구"
    },
    resume: {
      skills: ["Node.js", "TypeScript", "PostgreSQL", "Docker"],
      experience_years: 4,
      work_preference: ["remote", "hybrid"],
      home: "서울시 마포구"
    },
    expected: { min: 40, max: 65 },
    reason: "PostgreSQL 일치, Docker 우대 일치, FastAPI≈Python 유사도"
  }
];

// Enhanced similarity mapping
const similarityMap = {
  tier1: {
    "TypeScript": ["JavaScript"],
    "React": ["Next.js"],
    "Vue": ["Nuxt.js"],
    "PostgreSQL": ["MySQL", "SQL"],
    "Docker": ["Container"]
  },
  tier2: {
    "Spring": ["Spring Boot"],
    "Express": ["Node.js", "NestJS"],
    "FastAPI": ["Python"],
    "Django": ["Python"],
    "AWS": ["GCP", "Azure", "Cloud"]
  },
  tier3: {
    "React": ["Vue"],
    "Node.js": ["Python"],
    "AWS": ["Docker"],
    "Kubernetes": ["Container"],
    "SQL": ["NoSQL"],
    "Python": ["Java"]
  },
  context: {
    "Frontend": ["React", "Vue"],
    "Backend": ["Node.js", "Python"],
    "Database": ["SQL", "NoSQL"],
    "DevOps": ["Docker", "Kubernetes"]
  }
};

function calculateEnhancedSkillMatch(jobSkills, resumeSkills, isPreferred = false) {
  let exact = 0, strong = 0, partial = 0, context = 0;
  
  jobSkills.forEach(jobSkill => {
    resumeSkills.forEach(resumeSkill => {
      // Exact match
      if (jobSkill === resumeSkill) {
        exact++;
      }
      // Tier 2: Strong compatibility (75%)
      else if (similarityMap.tier2[jobSkill]?.includes(resumeSkill)) {
        strong++;
      }
      // Tier 3: Partial overlap (25%)
      else if (similarityMap.tier3[jobSkill]?.includes(resumeSkill)) {
        partial++;
      }
      // Context match (50%)
      else if (similarityMap.context[jobSkill]?.includes(resumeSkill)) {
        context++;
      }
      // Reverse check for asymmetric matches
      else if (similarityMap.tier2[resumeSkill]?.includes(jobSkill)) {
        strong++;
      }
      else if (similarityMap.tier3[resumeSkill]?.includes(jobSkill)) {
        partial++;
      }
      else if (similarityMap.context[resumeSkill]?.includes(jobSkill)) {
        context++;
      }
    });
  });

  const weightedMatches = exact + (strong * 0.75) + (partial * 0.25) + (context * 0.5);
  const totalSkills = jobSkills.length;
  const skillScore = (weightedMatches / totalSkills) * (isPreferred ? 30 : 70);
  
  return {
    exact, strong, partial, context, weightedMatches, skillScore: Math.round(skillScore)
  };
}

function calculateExperienceScore(jobExp, resumeExp) {
  if (resumeExp >= jobExp) return 100;
  const diff = jobExp - resumeExp;
  if (diff === 1) return 70;
  if (diff === 2) return 40;
  if (diff >= 3) return Math.max(10, 80 - (diff - 3) * 10);
  return 100; // Overqualified case
}

function calculateWorkTypeScore(jobType, resumePrefs) {
  const rank = resumePrefs.indexOf(jobType);
  if (rank === 0) return 100;
  if (rank === 1) return 70;
  if (rank === 2) return 40;
  return 0;
}

function calculateCommuteScore(jobLocation, resumeHome, maxCommute = 60) {
  if (jobLocation === null || jobLocation.includes("원격")) return 100;
  if (jobLocation === resumeHome) return 100;
  // Simple distance approximation - Seoul districts
  const seoulDistricts = ["강남구", "마포구", "서초구", "송파구", "용산구", "영등포구"];
  if (seoulDistricts.some(d => jobLocation.includes(d) && resumeHome.includes(d))) return 100;
  if (seoulDistricts.some(d => jobLocation.includes(d) || resumeHome.includes(d))) return 80;
  return 60;
}

function runEnhancedMatch(testCase) {
  const { job, resume } = testCase;
  
  const skillResult = calculateEnhancedSkillMatch(job.required_skills, resume.skills);
  const preferredResult = calculateEnhancedSkillMatch(job.preferred_skills, resume.skills, true);
  
  const experienceScore = calculateExperienceScore(job.experience_years, resume.experience_years);
  const workTypeScore = calculateWorkTypeScore(job.work_type, resume.work_preference);
  const commuteScore = calculateCommuteScore(job.location, resume.home);
  
  const skillScore = skillResult.skillScore + preferredResult.skillScore;
  const experienceWeighted = experienceScore * 0.15;
  const preferredWeighted = preferredResult.skillScore * 0.1;
  const workTypeWeighted = workTypeScore * 0.15;
  const commuteWeighted = commuteScore * 0.1;
  
  const totalScore = skillScore + experienceWeighted + preferredWeighted + workTypeWeighted + commuteWeighted;
  
  return {
    testCase: testCase.id,
    label: testCase.label,
    totalScore: Math.round(totalScore),
    components: {
      skill: { score: skillScore, weighted: skillScore, breakdown: skillResult },
      experience: { score: experienceScore, weighted: experienceWeighted },
      preferred: { score: preferredResult.skillScore, weighted: preferredWeighted, breakdown: preferredResult },
      work_type: { score: workTypeScore, weighted: workTypeWeighted },
      commute: { score: commuteScore, weighted: commuteWeighted }
    },
    expected: testCase.expected,
    reason: testCase.reason
  };
}

console.log("=== Enhanced Job Matching Test ===\n");
const results = testCases.map(runEnhancedMatch);

results.forEach(result => {
  console.log(`Test Case: ${result.testCase} (${result.label})`);
  console.log(`Score: ${result.totalScore} (Expected: ${result.expected.min}-${result.expected.max})`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Components:`);
  Object.entries(result.components).forEach(([key, comp]) => {
    if (comp.breakdown) {
      console.log(`  ${key}: ${comp.score} (exact:${comp.breakdown.exact}, strong:${comp.breakdown.strong}, partial:${comp.breakdown.partial}, context:${comp.breakdown.context})`);
    } else {
      console.log(`  ${key}: ${comp.score} → ${comp.weighted}`);
    }
  });
  console.log(`Status: ${result.totalScore >= result.expected.min && result.totalScore <= result.expected.max ? '✅ PASS' : '❌ FAIL'}\n`);
});

// Calculate overall metrics
const positiveResults = results.filter(r => r.label === 'positive');
const negativeResults = results.filter(r => r.label === 'negative');
const borderlineResults = results.filter(r => r.label === 'borderline');

const positiveAvg = positiveResults.reduce((sum, r) => sum + r.totalScore, 0) / positiveResults.length;
const negativeAvg = negativeResults.reduce((sum, r) => sum + r.totalScore, 0) / negativeResults.length;
const borderlineAvg = borderlineResults.reduce((sum, r) => sum + r.totalScore, 0) / borderlineResults.length;
const discrimination = Math.abs(positiveAvg - negativeAvg);

console.log("=== Enhanced Metrics ===");
console.log(`Positive Average: ${positiveAvg.toFixed(1)}`);
console.log(`Negative Average: ${negativeAvg.toFixed(1)}`);
console.log(`Borderline Average: ${borderlineAvg.toFixed(1)}`);
console.log(`Discrimination: ${discrimination.toFixed(2)}`);