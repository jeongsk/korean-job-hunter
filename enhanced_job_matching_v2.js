const ENHANCED_SIMILARITY_MAP = {
  // Core exact equivalents (100%)
  'typescript': ['javascript'],
  'javascript': ['typescript'],
  'react': ['next.js', 'react-dom'],
  'next.js': ['react'],
  'vue': ['vue.js'],
  'angular': ['angular.js'],
  
  // Backend strong matches (75%)
  'node.js': ['express', 'nestjs'],
  'express': ['node.js'],
  'nestjs': ['node.js'],
  'spring': ['spring boot'],
  'spring boot': ['spring'],
  'python': ['django', 'flask'],
  'django': ['python'],
  'flask': ['python'],
  'fastapi': ['python'],
  
  // Database matches (75%)
  'postgresql': ['mysql', 'sql'],
  'mysql': ['postgresql', 'sql'],
  'sql': ['postgresql', 'mysql'],
  'mongodb': ['redis'],
  'redis': ['mongodb'],
  
  // DevOps/Cloud matches (75%)
  'docker': ['kubernetes'],
  'kubernetes': ['docker'],
  'aws': ['gcp', 'azure'],
  'gcp': ['aws', 'azure'],
  'azure': ['aws', 'gcp'],
  
  // Frontend partial matches (50%)
  'css': ['scss', 'sass'],
  'html': ['xhtml'],
  
  // Data/ML partial matches (50%)
  'python': ['r'],
  'tensorflow': ['pytorch'],
  'pytorch': ['tensorflow'],
  'machine learning': ['ai'],
  'data science': ['data analysis'],
  
  // Korean market special mappings (25% context-based)
  '백엔드': ['backend', 'node.js'],
  '프론트엔드': ['frontend', 'react'],
  '풀스택': ['fullstack'],
  'DevOps': ['devops'],
  '데이터': ['data'],
};

const ENHANCED_WEIGHTS = {
  skill: 0.50,      // Balanced skill importance
  experience: 0.25, // Enhanced experience weight
  preferred: 0.10,  // Reduced preferred weight
  work_type: 0.10,  // Moderate work type weight
  commute: 0.05     // Lower commute weight
};

function analyzeCareerStage(experienceYears) {
  if (experienceYears < 2) return 'junior';
  if (experienceYears < 5) return 'mid';
  if (experienceYears < 8) return 'senior';
  return 'principal';
}

const CAREER_STAGE_PENALTIES = {
  junior: { under_penalty: 0.3, over_penalty: 0.8 },
  mid: { under_penalty: 0.2, over_penalty: 0.6 },
  senior: { under_penalty: 0.1, over_penalty: 0.4 },
  principal: { under_penalty: 0.05, over_penalty: 0.2 }
};

function getSimilarityScore(jdSkill, resumeSkill) {
  if (jdSkill === resumeSkill) return 1.0;
  
  const similarSkills = ENHANCED_SIMILARITY_MAP[jdSkill];
  if (similarSkills?.includes(resumeSkill)) return 0.75;
  
  const reverseSimilar = ENHANCED_SIMILARITY_MAP[resumeSkill];
  if (reverseSimilar?.includes(jdSkill)) return 0.75;
  
  // Check for domain matches (50%)
  const domainGroups = [
    ['frontend', 'backend', 'fullstack'],
    ['python', 'java', 'javascript', 'typescript'],
    ['aws', 'gcp', 'azure', 'cloud'],
    ['docker', 'kubernetes', 'container']
  ];
  
  for (const domain of domainGroups) {
    if (domain.includes(jdSkill) && domain.includes(resumeSkill)) {
      return 0.5;
    }
  }
  
  return 0.0;
}

function calculateSkillScore(jdRequiredSkills, resumeSkills, jdPreferredSkills) {
  // Calculate required skills score
  let requiredScore = 0;
  const matchedRequired = [];
  const missingRequired = [];
  
  jdRequiredSkills.forEach(jdSkill => {
    let bestMatch = 0;
    let matchedSkill = null;
    
    resumeSkills.forEach(resumeSkill => {
      const similarity = getSimilarityScore(jdSkill, resumeSkill);
      if (similarity > bestMatch) {
        bestMatch = similarity;
        matchedSkill = resumeSkill;
      }
    });
    
    if (bestMatch > 0) {
      matchedRequired.push({ jd: jdSkill, resume: matchedSkill, score: bestMatch });
      requiredScore += bestMatch;
    } else {
      missingRequired.push(jdSkill);
    }
  });
  
  const requiredRatio = requiredScore / jdRequiredSkills.length;
  
  // Calculate preferred skills score
  let preferredScore = 0;
  const matchedPreferred = [];
  
  jdPreferredSkills.forEach(jdSkill => {
    resumeSkills.forEach(resumeSkill => {
      const similarity = getSimilarityScore(jdSkill, resumeSkill);
      if (similarity > 0) {
        matchedPreferred.push({ jd: jdSkill, resume: resumeSkill, score: similarity });
        preferredScore += similarity;
      }
    });
  });
  
  const preferredRatio = preferredScore / Math.max(1, jdPreferredSkills.length);
  
  // Combine required (70%) and preferred (30%)
  const finalSkillScore = requiredRatio * 0.7 + preferredRatio * 0.3;
  
  return {
    score: Math.round(finalSkillScore * 100),
    required: {
      matched: matchedRequired,
      missing: missingRequired,
      ratio: requiredRatio
    },
    preferred: {
      matched: matchedPreferred,
      ratio: preferredRatio
    },
    breakdown: {
      exact: matchedRequired.filter(m => m.score === 1.0).length,
      strong: matchedRequired.filter(m => m.score === 0.75).length,
      moderate: matchedRequired.filter(m => m.score === 0.5).length,
      weak: 0
    }
  };
}

function calculateExperienceScore(jdExperience, resumeExperience) {
  const careerStage = analyzeCareerStage(resumeExperience);
  const stagePenalties = CAREER_STAGE_PENALTIES[careerStage];
  
  const experienceDiff = resumeExperience - jdExperience;
  
  // Perfect match
  if (experienceDiff === 0) return 100;
  
  // Slight overqualification (1-2 years)
  if (experienceDiff > 0 && experienceDiff <= 2) {
    return Math.max(80, 100 - (experienceDiff * 10));
  }
  
  // Overqualified (3+ years)
  if (experienceDiff > 2) {
    return Math.max(60, 100 - (experienceDiff * 15));
  }
  
  // Underqualified (considering career stage)
  if (experienceDiff < 0) {
    const gap = Math.abs(experienceDiff);
    if (careerStage === 'junior' && gap <= 1) return 90; // Flexible for juniors
    if (careerStage === 'mid' && gap <= 1) return 85;
    if (careerStage === 'senior' && gap <= 2) return 75;
    
    // Apply penalties based on gap and stage
    const baseScore = Math.max(20, 100 - (gap * 25));
    return Math.round(baseScore * (1 - stagePenalties.under_penalty));
  }
  
  return 50;
}

function calculateWorkTypeScore(jobWorkType, resumePreferences) {
  const rank = resumePreferences.indexOf(jobWorkType);
  if (rank === 0) return 100;    // #1 preference
  if (rank === 1) return 70;    // #2 preference  
  if (rank === 2) return 40;    // #3 preference
  return 0;                     // Not preferred
}

function calculateCommuteScore(jobLocation, resumeHome, maxCommute = 60) {
  if (!jobLocation || jobLocation === 'remote') return 100;
  if (!resumeHome) return 50; // Unknown location
  
  // Simplified distance lookup
  const distanceMap = {
    '서울시 마포구': {
      '서울시 강남구': 35,
      '서울시 송파구': 30,
      '서울시 용산구': 15,
      '서울시 영등포구': 12,
      '경기도 성남시': 35,
      '부산시 해운대구': 450,
      '대전시 유성구': 180
    },
    '서울시 강남구': {
      '서울시 마포구': 35,
      '서울시 송파구': 25,
      '서울시 용산구': 25,
      '서울시 영등포구': 20,
      '경기도 성남시': 30,
      '부산시 해운대구': 450,
      '대전시 유성구': 200
    },
    '부산시 해운대구': {
      '서울시 마포구': 450,
      '대전시 유성구': 200,
      '서울시 강남구': 450
    }
  };
  
  const distance = distanceMap[resumeHome]?.[jobLocation] || maxCommute * 2;
  
  if (distance <= maxCommute * 0.5) return 100;
  if (distance <= maxCommute * 0.75) return 80;
  if (distance <= maxCommute * 1.0) return 60;
  if (distance <= maxCommute * 1.5) return 30;
  return 0;
}

function calculateJobMatch(job, resume) {
  const careerStage = analyzeCareerStage(resume.experience_years);
  
  // Calculate component scores
  const skillResult = calculateSkillScore(
    job.required_skills,
    resume.skills,
    job.preferred_skills
  );
  
  const experienceScore = calculateExperienceScore(
    job.experience_years,
    resume.experience_years
  );
  
  const workTypeScore = calculateWorkTypeScore(
    job.work_type,
    resume.work_preference
  );
  
  const commuteScore = calculateCommuteScore(
    job.location,
    resume.home
  );
  
  // Calculate weighted total
  const totalScore = Math.round(
    (skillResult.score * ENHANCED_WEIGHTS.skill) +
    (experienceScore * ENHANCED_WEIGHTS.experience) +
    (Math.round(skillResult.preferred.ratio * 100) * ENHANCED_WEIGHTS.preferred) +
    (workTypeScore * ENHANCED_WEIGHTS.work_type) +
    (commuteScore * ENHANCED_WEIGHTS.commute)
  );
  
  return {
    test_case_id: job.title + '@' + job.company,
    overall_score: Math.min(100, Math.max(0, totalScore)),
    components: {
      skill: { 
        score: skillResult.score, 
        weighted: Math.round(skillResult.score * ENHANCED_WEIGHTS.skill),
        breakdown: skillResult.breakdown,
        required_ratio: Math.round(skillResult.required.ratio * 100),
        preferred_ratio: Math.round(skillResult.preferred.ratio * 100)
      },
      experience: { 
        score: experienceScore, 
        weighted: Math.round(experienceScore * ENHANCED_WEIGHTS.experience),
        required: job.experience_years,
        actual: resume.experience_years,
        stage: careerStage,
        difference: resume.experience_years - job.experience_years
      },
      preferred: { 
        score: Math.round(skillResult.preferred.ratio * 100), 
        weighted: Math.round(skillResult.preferred.ratio * 100 * ENHANCED_WEIGHTS.preferred),
        matched: skillResult.preferred.matched.length,
        total: job.preferred_skills.length
      },
      work_type: { 
        score: workTypeScore, 
        weighted: Math.round(workTypeScore * ENHANCED_WEIGHTS.work_type),
        job: job.work_type,
        preference_rank: resume.work_preference.indexOf(job.work_type) + 1 || 'not preferred'
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

// Test cases
const testCases = require('./data/autoresearch/test_cases/matching_cases.json');

console.log('Enhanced Job Matching Algorithm - Discrimination Test');
console.log('=====================================================');

let results = [];
let testCaseResults = [];

testCases.forEach((testCase, index) => {
  const result = calculateJobMatch(testCase.job, testCase.resume);
  results.push(result);
  testCaseResults.push({ ...testCase, result });
  
  console.log(`\nTest Case ${index + 1}: ${testCase.id} (${testCase.label})`);
  console.log(`Company: ${testCase.job.company} | Title: ${testCase.job.title}`);
  console.log(`Overall Score: ${result.overall_score}/100`);
  
  if (testCase.expected.min_score && testCase.expected.max_score) {
    console.log(`Expected: ${testCase.expected.min_score}-${testCase.expected.max_score}`);
  } else if (testCase.expected.min_score) {
    console.log(`Expected: ${testCase.expected.min_score}+`);
  } else if (testCase.expected.max_score) {
    console.log(`Expected: ≤${testCase.expected.max_score}`);
  }
  
  const componentScore = result.components.skill.score;
  console.log(`Skill Score: ${componentScore}/100`);
  console.log(`Experience: ${result.components.experience.score}/100 (${result.components.experience.actual}y vs ${result.components.experience.required}y)`);
  
  // Range check for positive cases (should be high)
  if (testCase.label === 'positive') {
    const passed = result.overall_score >= (testCase.expected.min_score || 70);
    console.log(`✅ Positive Case: ${passed ? 'PASS' : 'FAIL'}`);
  }
  // Range check for negative cases (should be low)
  else if (testCase.label === 'negative') {
    const passed = result.overall_score <= (testCase.expected.max_score || 40);
    console.log(`✅ Negative Case: ${passed ? 'PASS' : 'FAIL'}`);
  }
  // Borderline cases
  else if (testCase.label === 'borderline') {
    const passed = result.overall_score >= testCase.expected.min_score && 
                   result.overall_score <= testCase.expected.max_score;
    console.log(`✅ Borderline: ${passed ? 'PASS' : 'FAIL'}`);
  }
});

// Calculate discrimination metrics
const positiveScores = testCaseResults
  .filter(tc => tc.label === 'positive')
  .map(tc => tc.result.overall_score);

const negativeScores = testCaseResults
  .filter(tc => tc.label === 'negative')
  .map(tc => tc.result.overall_score);

const borderlineScores = testCaseResults
  .filter(tc => tc.label === 'borderline')
  .map(tc => tc.result.overall_score);

const positiveAvg = positiveScores.reduce((a, b) => a + b, 0) / positiveScores.length;
const negativeAvg = negativeScores.reduce((a, b) => a + b, 0) / negativeScores.length;
const borderlineAvg = borderlineScores.reduce((a, b) => a + b, 0) / borderlineScores.length;

const discrimination = positiveAvg - negativeAvg;
const spread = positiveAvg - negativeAvg;

console.log('\n📊 Performance Analysis');
console.log('=====================');
console.log(`Positive Cases (${positiveScores.length}): ${Math.round(positiveAvg)}/100 avg`);
console.log(`Negative Cases (${negativeScores.length}): ${Math.round(negativeAvg)}/100 avg`);
console.log(`Borderline Cases (${borderlineScores.length}): ${Math.round(borderlineAvg)}/100 avg`);
console.log(`Discrimination Metric: ${Math.round(discrimination)}`);
console.log(`Score Spread: ${Math.round(spread)}`);
console.log(`Target: 60+ | Current: ${Math.round(discrimination)}`);

// Calculate success rate
const positivePassCount = positiveScores.filter(score => score >= 70).length;
const negativePassCount = negativeScores.filter(score => score <= 40).length;
const discriminationSuccess = (positiveAvg >= 70 && negativeAvg <= 40) || discrimination >= 60;

console.log(`\n🎯 Discrimination Quality`);
console.log('========================');
console.log(`Positive Cases High Score: ${positivePassCount}/${positiveScores.length} (${Math.round(positivePassCount/positiveScores.length*100)}%)`);
console.log(`Negative Cases Low Score: ${negativePassCount}/${negativeScores.length} (${Math.round(negativePassCount/negativeScores.length*100)}%)`);
console.log(`Discrimination Target: ${discriminationSuccess ? 'ACHIEVED' : 'NOT MET'}`);

if (discrimination >= 60) {
  console.log('🎉 SUCCESS: Enhanced discrimination algorithm meets target!');
  console.log('The algorithm successfully distinguishes between good and bad job matches.');
} else {
  console.log('❌ NEEDS FURTHER OPTIMIZATION');
  console.log(`Gap to target: ${Math.max(0, 60 - Math.round(discrimination))} points`);
  
  // Suggest improvements
  if (positiveAvg < 70) {
    console.log('• Positive cases too low: Consider enhancing skill matching weights');
  }
  if (negativeAvg > 40) {
    console.log('• Negative cases too high: Consider increasing penalties for skill mismatches');
  }
  if (spread < 30) {
    console.log('• Insufficient discrimination: Consider more aggressive scoring differentiation');
  }
}

// Overall statistics
const allScores = results.map(r => r.overall_score);
const scoreVariance = allScores.reduce((acc, score) => acc + Math.pow(score - (allScores.reduce((a, b) => a + b, 0) / allScores.length), 2), 0) / allScores.length;

console.log(`\n📈 Overall Statistics`);
console.log('====================');
console.log(`Average Score: ${Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)}/100`);
console.log(`Score Variance: ${Math.round(scoreVariance)}`);
console.log(`Score Range: ${Math.min(...allScores)}-${Math.max(...allScores)}`);