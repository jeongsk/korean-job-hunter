const ENHANCED_SIMILARITY_MAP = {
  // Core exact equivalents (100%)
  'typescript': ['javascript'],
  'javascript': ['typescript'],
  'react': ['next.js', 'react-dom'],
  'next.js': ['react', 'nuxt.js'],
  'vue': ['vue.js', 'nuxt.js'],
  'nuxt.js': ['vue', 'next.js'],
  'angular': ['angular.js'],
  
  // Backend strong matches (75%)
  'node.js': ['express', 'nestjs', 'fastapi'],
  'express': ['node.js', 'nestjs'],
  'nestjs': ['node.js', 'express'],
  'spring': ['spring boot', 'spring framework'],
  'spring boot': ['spring'],
  'python': ['django', 'flask', 'fastapi'],
  'django': ['python', 'flask'],
  'flask': ['python', 'django'],
  'fastapi': ['python', 'django'],
  
  // Database matches (75%)
  'postgresql': ['mysql', 'mariadb', 'sql'],
  'mysql': ['postgresql', 'mariadb', 'sql'],
  'mariadb': ['mysql', 'postgresql', 'sql'],
  'sql': ['postgresql', 'mysql', 'mariadb'],
  'mongodb': ['cassandra', 'redis'],
  'redis': ['mongodb', 'cassandra'],
  
  // DevOps/Cloud matches (75%)
  'docker': ['kubernetes', 'container'],
  'kubernetes': ['docker', 'container'],
  'container': ['docker', 'kubernetes'],
  'aws': ['gcp', 'azure', 'cloud'],
  'gcp': ['aws', 'azure', 'cloud'],
  'azure': ['aws', 'gcp', 'cloud'],
  'cloud': ['aws', 'gcp', 'azure'],
  
  // Frontend partial matches (50%)
  'javascript': ['jquery', 'coffeescript'],
  'css': ['scss', 'sass', 'less'],
  'html': ['xhtml', 'html5'],
  
  // Data/ML partial matches (50%)
  'python': ['r', 'julia'],
  'tensorflow': ['pytorch', 'keras'],
  'pytorch': ['tensorflow', 'keras'],
  'machine learning': ['ai', 'deep learning'],
  'data science': ['data analysis', 'big data'],
  
  // Korean market special mappings (context-based 50%)
  '백엔드': ['backend', 'node.js', 'java', 'python'],
  '프론트엔드': ['frontend', 'react', 'vue', 'angular'],
  '풀스택': ['fullstack', 'full-stack', '백엔드+프론트엔드'],
  'DevOps': ['devops', 'site reliability', 'sre'],
  '데이터': ['data', '데이터분석', '데이터엔지니어링'],
};

const ENHANCED_WEIGHTS = {
  skill: 0.60,      // Core skill importance enhanced
  experience: 0.20, // Career stage alignment
  preferred: 0.10,  // Nice-to-have qualifications
  work_type: 0.05,  // Reduced importance
  commute: 0.05     // Reduced importance
};

function analyzeCareerStage(experienceYears) {
  if (experienceYears < 2) return 'junior';
  if (experienceYears < 5) return 'mid';
  if (experienceYears < 8) return 'senior';
  return 'principal';
}

const STAGE_REQUIREMENTS = {
  junior: { min: 0, max: 3, ideal: 1 },
  mid: { min: 2, max: 6, ideal: 4 },
  senior: { min: 5, max: 10, ideal: 7 },
  principal: { min: 8, max: 15, ideal: 12 }
};

const STAGE_MULTIPLIERS = {
  junior: { exact: 1.0, strong: 0.8, moderate: 0.4, weak: 0.1 },
  mid: { exact: 1.0, strong: 0.9, moderate: 0.6, weak: 0.2 },
  senior: { exact: 1.0, strong: 1.0, moderate: 0.7, weak: 0.3 },
  principal: { exact: 1.0, strong: 1.0, moderate: 0.8, weak: 0.4 }
};

function getSimilarityTier(jdSkill, resumeSkill) {
  if (jdSkill === resumeSkill) return 'exact';
  
  const similarSkills = ENHANCED_SIMILARITY_MAP[jdSkill];
  if (similarSkills?.includes(resumeSkill)) return 'strong';
  
  // Check reverse mapping
  const reverseSimilar = ENHANCED_SIMILARITY_MAP[resumeSkill];
  if (reverseSimilar?.includes(jdSkill)) return 'strong';
  
  // Check for domain/context matches
  const domainMatches = [
    ['frontend', 'backend', 'fullstack'],
    ['python', 'java', 'javascript', 'typescript'],
    ['aws', 'gcp', 'azure', 'cloud'],
    ['docker', 'kubernetes', 'container']
  ];
  
  for (const domain of domainMatches) {
    if (domain.includes(jdSkill) && domain.includes(resumeSkill)) {
      return 'moderate';
    }
  }
  
  return 'weak';
}

function calculateEnhancedSkillMatch(jdSkills, resumeSkills, careerStage) {
  let exact = 0, strong = 0, moderate = 0, weak = 0;
  
  jdSkills.forEach(jdSkill => {
    resumeSkills.forEach(resumeSkill => {
      const tier = getSimilarityTier(jdSkill, resumeSkill);
      switch (tier) {
        case 'exact': exact++; break;
        case 'strong': strong++; break;
        case 'moderate': moderate++; break;
        case 'weak': weak++; break;
      }
    });
  });
  
  const stage = STAGE_MULTIPLIERS[careerStage];
  const weightedScore = (exact * stage.exact) + 
                       (strong * stage.strong) + 
                       (moderate * stage.moderate) + 
                       (weak * stage.weak);
  
  return Math.round((weightedScore / jdSkills.length) * 100);
}

function calculateExperienceScore(jdExperience, resumeExperience) {
  const careerStage = analyzeCareerStage(resumeExperience);
  const req = STAGE_REQUIREMENTS[careerStage];
  
  if (resumeExperience >= req.ideal) return 100;
  if (resumeExperience >= req.min && resumeExperience <= req.max) {
    const alignment = Math.abs(resumeExperience - req.ideal) / (req.max - req.ideal);
    return Math.round(100 - (alignment * 50));
  }
  
  const gap = Math.abs(jdExperience - resumeExperience);
  if (gap <= 1) return 80;
  if (gap <= 2) return 60;
  if (gap <= 3) return 40;
  return 20;
}

function calculateWorkTypeScore(jobWorkType, resumePreferences) {
  const rank = resumePreferences.indexOf(jobWorkType);
  if (rank === 0) return 100;
  if (rank === 1) return 70;
  if (rank === 2) return 40;
  return 0;
}

function calculateCommuteScore(jobLocation, resumeHome, maxCommute = 60) {
  if (!jobLocation || jobLocation === 'remote') return 100;
  
  // Simplified distance calculation (should be enhanced with real API)
  const distances = {
    '서울시 마포구': { '서울시 강남구': 30, '서울시 송파구': 25, '서울시 용산구': 15, '서울시 영등포구': 10 },
    '서울시 강남구': { '서울시 마포구': 30, '서울시 송파구': 20, '서울시 용산구': 25, '서울시 영등포구': 20 },
    '부산시 해운대구': { '서울시 마포구': 450, '대전시 유성구': 200 },
    '경기도 성남시': { '서울시 마포구': 25 },
    '대전시 유성구': { '서울시 마포구': 150, '부산시 해운대구': 200 }
  };
  
  const distance = distances[resumeHome]?.[jobLocation] || maxCommute * 2;
  
  if (distance <= maxCommute * 0.5) return 100;
  if (distance <= maxCommute * 0.75) return 80;
  if (distance <= maxCommute * 1.0) return 60;
  if (distance <= maxCommute * 1.2) return 30;
  return 0;
}

function calculateEnhancedJobMatch(job, resume) {
  const careerStage = analyzeCareerStage(resume.experience_years);
  
  // Calculate component scores
  const skillScore = calculateEnhancedSkillMatch(
    job.required_skills, 
    resume.skills, 
    careerStage
  );
  
  const experienceScore = calculateExperienceScore(
    job.experience_years, 
    resume.experience_years
  );
  
  // Preferred skills (30% of skill score)
  const preferredSkillScore = calculateEnhancedSkillMatch(
    job.preferred_skills,
    resume.skills,
    careerStage
  );
  
  const finalSkillScore = Math.round((skillScore * 0.7) + (preferredSkillScore * 0.3));
  
  const preferredScore = Math.round((job.preferred_skills.filter(s => 
    resume.skills.includes(s) || ENHANCED_SIMILARITY_MAP[s]?.some(rs => 
      resume.skills.includes(rs)
    )
  ).length / job.preferred_skills.length * 100));
  
  const workTypeScore = calculateWorkTypeScore(job.work_type, resume.work_preference);
  const commuteScore = calculateCommuteScore(job.location, resume.home);
  
  // Calculate weighted total
  const totalScore = Math.round(
    (finalSkillScore * ENHANCED_WEIGHTS.skill) +
    (experienceScore * ENHANCED_WEIGHTS.experience) +
    (preferredScore * ENHANCED_WEIGHTS.preferred) +
    (workTypeScore * ENHANCED_WEIGHTS.work_type) +
    (commuteScore * ENHANCED_WEIGHTS.commute)
  );
  
  return {
    job_id: job.title + '@' + job.company,
    overall_score: Math.min(100, totalScore),
    components: {
      skill: { 
        score: finalSkillScore, 
        weighted: Math.round(finalSkillScore * ENHANCED_WEIGHTS.skill),
        breakdown: {
          exact: 0, strong: 0, moderate: 0, weak: 0
        }
      },
      experience: { 
        score: experienceScore, 
        weighted: Math.round(experienceScore * ENHANCED_WEIGHTS.experience),
        required: job.experience_years,
        actual: resume.experience_years,
        stage: careerStage
      },
      preferred: { 
        score: preferredScore, 
        weighted: Math.round(preferredScore * ENHANCED_WEIGHTS.preferred),
        matched: job.preferred_skills.filter(s => 
          resume.skills.includes(s) || ENHANCED_SIMILARITY_MAP[s]?.some(rs => 
            resume.skills.includes(rs)
          )
        ),
        missing: job.preferred_skills.filter(s => 
          !resume.skills.includes(s) && !ENHANCED_SIMILARITY_MAP[s]?.some(rs => 
            resume.skills.includes(rs)
          )
        )
      },
      work_type: { 
        score: workTypeScore, 
        weighted: Math.round(workTypeScore * ENHANCED_WEIGHTS.work_type),
        job: job.work_type,
        preference_rank: resume.work_preference.indexOf(job.work_type) + 1
      },
      commute: { 
        score: commuteScore, 
        weighted: Math.round(commuteScore * ENHANCED_WEIGHTS.commute),
        location: job.location,
        home: resume.home
      }
    }
  };
}

// Test the enhanced matching algorithm
const testCases = require('./data/autoresearch/test_cases/matching_cases.json');

console.log('Enhanced Job Matching Algorithm Test');
console.log('=====================================');

let totalScore = 0;
let results = [];

testCases.forEach((testCase, index) => {
  const result = calculateEnhancedJobMatch(testCase.job, testCase.resume);
  results.push(result);
  
  console.log(`\nTest Case ${index + 1}: ${testCase.id} (${testCase.label})`);
  console.log(`Company: ${testCase.job.company}`);
  console.log(`Title: ${testCase.job.title}`);
  console.log(`Overall Score: ${result.overall_score}/100`);
  console.log(`Expected: ${testCase.expected.min_score}-${testCase.expected.max_score || testCase.expected.min_score}`);
  
  // Check if score falls within expected range
  const expectedMin = testCase.expected.min_score;
  const expectedMax = testCase.expected.max_score || expectedMin;
  const isInRange = result.overall_score >= expectedMin && result.overall_score <= expectedMax;
  
  console.log(`✅ Range Check: ${isInRange ? 'PASS' : 'FAIL'} (${expectedMin}-${expectedMax})`);
  
  totalScore += result.overall_score;
});

// Calculate discrimination metric
const positiveScores = results.filter(r => 
  testCases.find(tc => tc.id === r.job_id.split('@')[0]).label === 'positive'
).map(r => r.overall_score);

const negativeScores = results.filter(r => 
  testCases.find(tc => tc.id === r.job_id.split('@')[0]).label === 'negative'
).map(r => r.overall_score);

const positiveAvg = positiveScores.reduce((a, b) => a + b, 0) / positiveScores.length;
const negativeAvg = negativeScores.reduce((a, b) => a + b, 0) / negativeScores.length;
const discrimination = positiveAvg - negativeAvg;

console.log('\n📊 Performance Metrics');
console.log('====================');
console.log(`Average Score: ${Math.round(totalScore / results.length)}/100`);
console.log(`Positive Cases Avg: ${Math.round(positiveAvg)}/100`);
console.log(`Negative Cases Avg: ${Math.round(negativeAvg)}/100`);
console.log(`Discrimination Metric: ${Math.round(discrimination)}`);
console.log(`Target: 60+ | Current: ${Math.round(discrimination)}`);
console.log(`Improvement Needed: ${Math.max(0, 60 - Math.round(discrimination))}`);

// Check if we achieved the target
if (discrimination >= 60) {
  console.log('🎉 SUCCESS: Discrimination metric target achieved!');
} else {
  console.log('❌ NEEDS IMPROVEMENT: Discrimination metric below target');
  console.log('Next steps: Further enhance algorithm parameters');
}