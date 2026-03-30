const ENHANCED_SIMILARITY_MAP = {
  // Core exact equivalents (100%)
  'typescript': ['javascript'],
  'javascript': ['typescript'],
  'react': ['next.js', 'react-dom'],
  'next.js': ['react'],
  'vue': ['vue.js'],
  'angular': ['angular.js'],
  'node.js': ['node'], 'node': ['node.js'],
  
  // Backend strong matches (85% - increased for better matching)
  'node.js': ['express', 'nestjs', 'fastapi', 'backend'],
  'express': ['node.js', 'nestjs', 'backend'],
  'nestjs': ['node.js', 'express', 'backend'],
  'spring': ['spring boot', 'backend'],
  'spring boot': ['spring', 'backend'],
  'python': ['django', 'flask', 'fastapi', 'backend'],
  'django': ['python', 'backend'],
  'flask': ['python', 'backend'],
  'fastapi': ['python', 'backend'],
  'java': ['spring', 'spring boot', 'backend'],
  'backend': ['node.js', 'python', 'java', 'spring', 'django', 'express'],
  
  // Database matches (80%)
  'postgresql': ['mysql', 'sql', 'database'],
  'mysql': ['postgresql', 'sql', 'database'],
  'sql': ['postgresql', 'mysql', 'database'],
  'mongodb': ['redis', 'database'],
  'redis': ['mongodb', 'database'],
  'database': ['postgresql', 'mysql', 'mongodb'],
  
  // DevOps/Cloud matches (85%)
  'docker': ['kubernetes', 'container', 'devops'],
  'kubernetes': ['docker', 'container', 'devops'],
  'container': ['docker', 'kubernetes'],
  'aws': ['gcp', 'azure', 'cloud', 'devops'],
  'gcp': ['aws', 'azure', 'cloud', 'devops'],
  'azure': ['aws', 'gcp', 'cloud', 'devops'],
  'cloud': ['aws', 'gcp', 'azure'],
  'devops': ['docker', 'kubernetes', 'aws', 'gcp', 'azure'],
  
  // Frontend enhanced matches (80%)
  'css': ['scss', 'sass'],
  'html': ['xhtml', 'html5'],
  'react': ['frontend', 'ui'],
  'vue': ['frontend', 'ui'],
  'angular': ['frontend', 'ui'],
  'frontend': ['react', 'vue', 'angular', 'ui'],
  
  // Enhanced Korean mappings (80%)
  '백엔드': ['backend', 'node.js', 'python', 'java', 'spring', 'express'],
  '프론트엔드': ['frontend', 'react', 'vue', 'angular', 'ui'],
  '풀스택': ['fullstack', 'full-stack', 'frontend+backend'],
  'DevOps': ['devops', 'docker', 'kubernetes', 'aws'],
  '데이터': ['data', 'database', 'big data', 'data analysis'],
  '개발자': ['developer', 'engineer'],
  '엔지니어': ['engineer', 'developer']
};

const OPTIMIZED_WEIGHTS = {
  skill: 0.55,      // Increased skill weight for better discrimination
  experience: 0.25, // Same experience weight
  preferred: 0.10,  // Same preferred weight
  work_type: 0.07,  // Reduced work type weight
  commute: 0.03     // Reduced commute weight
};

function analyzeCareerStage(experienceYears) {
  if (experienceYears < 2) return 'junior';
  if (experienceYears < 5) return 'mid';
  if (experienceYears < 8) return 'senior';
  return 'principal';
}

const CAREER_STAGE_BOOSTS = {
  junior: { perfect_match: 1.0, good_match: 1.0, acceptable_match: 1.0 },
  mid: { perfect_match: 1.0, good_match: 1.1, acceptable_match: 1.2 },
  senior: { perfect_match: 1.0, good_match: 1.2, acceptable_match: 1.3 },
  principal: { perfect_match: 1.0, good_match: 1.3, acceptable_match: 1.4 }
};

function getEnhancedSimilarityScore(jdSkill, resumeSkill) {
  if (jdSkill === resumeSkill) return 1.0;
  
  // Check direct matches
  const directMatches = ENHANCED_SIMILARITY_MAP[jdSkill];
  if (directMatches?.includes(resumeSkill)) return 0.85;
  
  // Check reverse matches
  const reverseMatches = ENHANCED_SIMILARITY_MAP[resumeSkill];
  if (reverseMatches?.includes(jdSkill)) return 0.85;
  
  // Enhanced domain matching with context
  const techDomains = {
    'frontend': ['react', 'vue', 'angular', 'html', 'css', 'javascript', 'typescript'],
    'backend': ['node.js', 'python', 'java', 'spring', 'express', 'django', 'flask'],
    'fullstack': ['frontend', 'backend', 'react', 'node.js', 'python'],
    'devops': ['docker', 'kubernetes', 'aws', 'gcp', 'azure'],
    'database': ['postgresql', 'mysql', 'mongodb', 'redis', 'sql'],
    'mobile': ['swift', 'kotlin', 'react native', 'flutter']
  };
  
  // Check if skills belong to same domain
  for (const [domain, skills] of Object.entries(techDomains)) {
    if (skills.includes(jdSkill) && skills.includes(resumeSkill)) {
      return 0.65; // Domain match
    }
  }
  
  // Korean-English hybrid matching
  const koreanEnglishMap = {
    '백엔드': ['backend', 'node.js', 'python', 'java'],
    '프론트엔드': ['frontend', 'react', 'vue', 'angular'],
    '풀스택': ['fullstack', 'full-stack'],
    'DevOps': ['devops', 'docker', 'kubernetes']
  };
  
  for (const [korean, english] of Object.entries(koreanEnglishMap)) {
    if ((jdSkill === korean && english.includes(resumeSkill)) ||
        (resumeSkill === korean && english.includes(jdSkill))) {
      return 0.75; // Korean-English match
    }
  }
  
  return 0.0;
}

function calculateOptimizedSkillScore(jdRequiredSkills, resumeSkills, jdPreferredSkills) {
  let totalScore = 0;
  let maxPossibleScore = 0;
  
  // Calculate required skills with enhanced scoring
  jdRequiredSkills.forEach(jdSkill => {
    let bestMatch = 0;
    
    resumeSkills.forEach(resumeSkill => {
      const similarity = getEnhancedSimilarityScore(jdSkill, resumeSkill);
      if (similarity > bestMatch) {
        bestMatch = similarity;
      }
    });
    
    totalScore += bestMatch;
    maxPossibleScore += 1.0;
  });
  
  const requiredRatio = totalScore / maxPossibleScore;
  
  // Calculate preferred skills (30% weight)
  let preferredScore = 0;
  jdPreferredSkills.forEach(jdSkill => {
    resumeSkills.forEach(resumeSkill => {
      const similarity = getEnhancedSimilarityScore(jdSkill, resumeSkill);
      if (similarity > 0) {
        preferredScore += similarity;
      }
    });
  });
  
  const preferredRatio = preferredScore / Math.max(1, jdPreferredSkills.length);
  
  // Combine with optimized weights (required 70%, preferred 30%)
  const skillScore = requiredRatio * 0.7 + preferredRatio * 0.3;
  
  return {
    score: Math.round(skillScore * 100),
    required_ratio: Math.round(requiredRatio * 100),
    preferred_ratio: Math.round(preferredRatio * 100),
    total_required_matches: totalScore,
    max_possible_score: maxPossibleScore
  };
}

function calculateExperienceScore(jdExperience, resumeExperience) {
  const careerStage = analyzeCareerStage(resumeExperience);
  
  const experienceDiff = resumeExperience - jdExperience;
  
  // Perfect match with career stage boost
  if (experienceDiff === 0) {
    return 100;
  }
  
  // Slight overqualification (beneficial)
  if (experienceDiff > 0 && experienceDiff <= 2) {
    const baseScore = 100 - (experienceDiff * 5);
    return Math.max(85, baseScore);
  }
  
  // Good overqualification (very beneficial)
  if (experienceDiff > 2 && experienceDiff <= 4) {
    const baseScore = 95 - (experienceDiff * 8);
    return Math.max(75, baseScore);
  }
  
  // Excellent overqualification (senior roles)
  if (experienceDiff > 4) {
    return Math.max(80, 100 - (experienceDiff * 10));
  }
  
  // Underqualified - more flexible for junior/mid roles
  if (experienceDiff < 0) {
    const gap = Math.abs(experienceDiff);
    
    if (careerStage === 'junior' && gap <= 1) return 95; // Very flexible for juniors
    if (careerStage === 'mid' && gap <= 1) return 90;
    if (careerStage === 'senior' && gap <= 2) return 80;
    
    // Progressive penalty for larger gaps
    const baseScore = Math.max(30, 100 - (gap * 20));
    return baseScore;
  }
  
  return 60;
}

function calculateWorkTypeScore(jobWorkType, resumePreferences) {
  const rank = resumePreferences.indexOf(jobWorkType);
  if (rank === 0) return 100;    // #1 preference
  if (rank === 1) return 80;    // #2 preference (improved)
  if (rank === 2) return 50;    // #3 preference (improved)
  return 30;                     // Not preferred but acceptable
}

function calculateCommuteScore(jobLocation, resumeHome, maxCommute = 60) {
  if (!jobLocation || jobLocation === 'remote') return 100;
  if (!resumeHome) return 60; // Better default for unknown
  
  const distanceMap = {
    '서울시 마포구': {
      '서울시 강남구': 35, '서울시 송파구': 30, '서울시 용산구': 15,
      '서울시 영등포구': 12, '경기도 성남시': 35, '부산시 해운대구': 450, '대전시 유성구': 180
    },
    '서울시 강남구': {
      '서울시 마포구': 35, '서울시 송파구': 25, '서울시 용산구': 25,
      '서울시 영등포구': 20, '경기도 성남시': 30, '부산시 해운대구': 450, '대전시 유성구': 200
    },
    '부산시 해운대구': {
      '서울시 마포구': 450, '대전시 유성구': 200, '서울시 강남구': 450
    }
  };
  
  const distance = distanceMap[resumeHome]?.[jobLocation] || maxCommute * 2;
  
  if (distance <= maxCommute * 0.5) return 100;
  if (distance <= maxCommute * 0.75) return 90;
  if (distance <= maxCommute * 1.0) return 70;
  if (distance <= maxCommute * 1.5) return 40;
  return 10;
}

function calculateOptimizedJobMatch(job, resume) {
  // Calculate enhanced skill score
  const skillResult = calculateOptimizedSkillScore(
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
  
  // Apply optimized weights
  const totalScore = Math.round(
    (skillResult.score * OPTIMIZED_WEIGHTS.skill) +
    (experienceScore * OPTIMIZED_WEIGHTS.experience) +
    (skillResult.preferred_ratio * OPTIMIZED_WEIGHTS.preferred) +
    (workTypeScore * OPTIMIZED_WEIGHTS.work_type) +
    (commuteScore * OPTIMIZED_WEIGHTS.commute)
  );
  
  return {
    test_case_id: job.title + '@' + job.company,
    overall_score: Math.min(100, Math.max(0, totalScore)),
    components: {
      skill: { 
        score: skillResult.score, 
        weighted: Math.round(skillResult.score * OPTIMIZED_WEIGHTS.skill),
        required_ratio: skillResult.required_ratio,
        preferred_ratio: skillResult.preferred_ratio,
        efficiency: Math.round((skillResult.total_required_matches / skillResult.max_possible_score) * 100)
      },
      experience: { 
        score: experienceScore, 
        weighted: Math.round(experienceScore * OPTIMIZED_WEIGHTS.experience),
        required: job.experience_years,
        actual: resume.experience_years,
        difference: resume.experience_years - job.experience_years
      },
      work_type: { 
        score: workTypeScore, 
        weighted: Math.round(workTypeScore * OPTIMIZED_WEIGHTS.work_type)
      },
      commute: { 
        score: commuteScore, 
        weighted: Math.round(commuteScore * OPTIMIZED_WEIGHTS.commute)
      }
    }
  };
}

// Test cases
const testCases = require('./data/autoresearch/test_cases/matching_cases.json');

console.log('Optimized Job Matching Algorithm - Target: 60+ Discrimination');
console.log('===============================================================');

let results = [];
let testCaseResults = [];

testCases.forEach((testCase, index) => {
  const result = calculateOptimizedJobMatch(testCase.job, testCase.resume);
  results.push(result);
  testCaseResults.push({ ...testCase, result });
  
  console.log(`\nTest Case ${index + 1}: ${testCase.id} (${testCase.label})`);
  console.log(`Company: ${testCase.job.company} | Title: ${testCase.job.title}`);
  console.log(`Overall Score: ${result.overall_score}/100`);
  console.log(`Skill: ${result.components.skill.score}/100 (${result.components.skill.required_ratio}% required, ${result.components.skill.preferred_ratio}% preferred)`);
  console.log(`Experience: ${result.components.experience.score}/100 (${result.components.experience.actual}y vs ${result.components.experience.required}y)`);
  
  // Range check
  if (testCase.label === 'positive') {
    const passed = result.overall_score >= (testCase.expected.min_score || 70);
    console.log(`✅ Positive Case: ${passed ? 'PASS' : 'FAIL'} (target: ${testCase.expected.min_score || 70}+)`);
  } else if (testCase.label === 'negative') {
    const passed = result.overall_score <= (testCase.expected.max_score || 40);
    console.log(`✅ Negative Case: ${passed ? 'PASS' : 'FAIL'} (target: ≤${testCase.expected.max_score || 40})`);
  } else if (testCase.label === 'borderline') {
    const passed = result.overall_score >= testCase.expected.min_score && 
                   result.overall_score <= testCase.expected.max_score;
    console.log(`✅ Borderline: ${passed ? 'PASS' : 'FAIL'} (target: ${testCase.expected.min_score}-${testCase.expected.max_score})`);
  }
});

// Calculate performance metrics
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

console.log('\n📊 Enhanced Performance Analysis');
console.log('===============================');
console.log(`Positive Cases (${positiveScores.length}): ${Math.round(positiveAvg)}/100 avg`);
console.log(`Negative Cases (${negativeScores.length}): ${Math.round(negativeAvg)}/100 avg`);
console.log(`Borderline Cases (${borderlineScores.length}): ${Math.round(borderlineAvg)}/100 avg`);
console.log(`Discrimination Metric: ${Math.round(discrimination)}`);
console.log(`Score Spread: ${Math.round(spread)}`);
console.log(`Target: 60+ | Current: ${Math.round(discrimination)}`);
console.log(`Status: ${discrimination >= 60 ? 'TARGET ACHIEVED!' : 'NEEDS OPTIMIZATION'}`);

// Success analysis
const positiveHighCount = positiveScores.filter(score => score >= 80).length;
const negativeLowCount = negativeScores.filter(score => score <= 30).length;
const borderlineInRange = borderlineScores.filter(score => score >= 40 && score <= 60).length;

console.log(`\n🎯 Quality Indicators`);
console.log('====================');
console.log(`Strong Positive Matches (80+): ${positiveHighCount}/${positiveScores.length}`);
console.log(`Clear Negative Matches (≤30): ${negativeLowCount}/${negativeScores.length}`);
console.log(`Balanced Borderline (40-60): ${borderlineInRange}/${borderlineScores.length}`);

// Final assessment
if (discrimination >= 60) {
  console.log('\n🎉 SUCCESS: Discrimination target achieved!');
  console.log('The optimized algorithm successfully distinguishes between job matches with high quality.');
} else {
  console.log(`\n⚠️  PARTIAL SUCCESS: ${Math.round(discrimination)}/60 discrimination`);
  console.log('Good separation but needs further refinement for target achievement.');
  
  if (positiveAvg < 75) {
    console.log('• Boost positive case skill matching further');
  }
  if (negativeAvg > 35) {
    console.log('• Strengthen negative case penalty system');
  }
}

// Overall statistics
const allScores = results.map(r => r.overall_score);
console.log(`\n📈 Overall Statistics`);
console.log('====================');
console.log(`Average Score: ${Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)}/100`);
console.log(`Score Range: ${Math.min(...allScores)}-${Math.max(...allScores)}`);
console.log(`Variance: ${Math.round(allScores.reduce((acc, score) => acc + Math.pow(score - 51, 2), 0) / allScores.length)}`);