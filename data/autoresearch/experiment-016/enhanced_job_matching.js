// Enhanced Job Matching with Dynamic Weight Optimization
// Experiment to improve discrimination metric from 52.53 to 60+

const fs = require('fs');
const path = require('path');

// Enhanced weight optimization based on resume patterns and market analysis
const ENHANCED_WEIGHTS = {
  // Current baseline weights
  current: {
    skill: 0.50,
    experience: 0.15,
    preferred: 0.10,
    work_type: 0.15,
    commute: 0.10
  },
  
  // Optimized weights based on market analysis
  optimized: {
    skill: 0.60,      // Increased - most important factor
    experience: 0.20, // Increased - more important for Korean market
    preferred: 0.10,  // Keep same
    work_type: 0.05,  // Reduced - less critical for matching quality
    commute: 0.05     // Reduced - less critical for matching quality
  }
};

// Enhanced technology similarity map with domain-specific matching
const ENHANCED_SIMILARITY_MAP = {
  // Core technical skills (higher weight)
  'typescript': ['javascript', 'flow'],
  'javascript': ['typescript', 'flow', 'coffeescript'],
  'react': ['next.js', 'vue.js', 'angular'],
  'vue.js': ['react', 'angular', 'svelte'],
  'angular': ['react', 'vue.js'],
  'node.js': ['express', 'nestjs', 'fastapi'],
  'python': ['django', 'fastapi', 'flask', 'pyramid'],
  'java': ['spring', 'spring boot', 'quarkus'],
  'spring': ['spring boot', 'java'],
  'spring boot': ['spring', 'java'],
  'express': ['node.js', 'koa', 'hapi'],
  'nestjs': ['node.js', 'express'],
  'fastapi': ['python', 'django', 'flask'],
  
  // Domain-specific matches (moderate weight)
  'aws': ['gcp', 'azure', 'docker', 'kubernetes'],
  'gcp': ['aws', 'azure'],
  'azure': ['aws', 'gcp'],
  'docker': ['kubernetes', 'podman'],
  'kubernetes': ['docker', 'openshift'],
  
  // Emerging technologies (lower weight but valuable)
  'tensorflow': ['pytorch', 'keras', 'jax'],
  'pytorch': ['tensorflow', 'keras'],
  'machine learning': ['ai', 'deep learning', 'nlp'],
  'ai': ['machine learning', 'deep learning', 'nlp'],
  
  // Korean market specific patterns
  '백엔드': ['backend', 'node.js', 'java', 'python'],
  '프론트엔드': ['frontend', 'react', 'vue.js', 'angular'],
  '풀스택': ['fullstack', 'mern', 'mean'],
  '데이터사이언티스트': ['data scientist', 'machine learning', 'ai'],
  '데브옵스': ['devops', 'sre', 'platform engineer']
};

// Career stage analysis based on experience years
function analyzeCareerStage(experienceYears) {
  if (experienceYears < 2) return 'junior';
  if (experienceYears < 5) return 'mid';
  if (experienceYears < 8) return 'senior';
  return 'principal';
}

// Enhanced skill matching with domain context
function calculateEnhancedSkillMatch(jdSkills, resumeSkills, careerStage) {
  let exact = 0, strong = 0, moderate = 0, weak = 0;
  
  jdSkills.forEach(jdSkill => {
    resumeSkills.forEach(resumeSkill => {
      if (jdSkill === resumeSkill) {
        exact++;
      } else if (ENHANCED_SIMILARITY_MAP[jdSkill]?.includes(resumeSkill)) {
        const similarityScore = getSimilarityScore(jdSkill, resumeSkill);
        if (similarityScore >= 0.8) strong++;
        else if (similarityScore >= 0.5) moderate++;
        else weak++;
      }
    });
  });
  
  // Dynamic scoring based on career stage
  const stageMultipliers = {
    junior: { exact: 1.0, strong: 0.8, moderate: 0.4, weak: 0.1 },
    mid: { exact: 1.0, strong: 0.9, moderate: 0.6, weak: 0.2 },
    senior: { exact: 1.0, strong: 1.0, moderate: 0.7, weak: 0.3 },
    principal: { exact: 1.0, strong: 1.0, moderate: 0.8, weak: 0.4 }
  };
  
  const stage = stageMultipliers[careerStage];
  const weightedScore = (exact * stage.exact) + (strong * stage.strong) + 
                       (moderate * stage.moderate) + (weak * stage.weak);
  
  return Math.min(100, (weightedScore / jdSkills.length) * 100);
}

function getSimilarityScore(jdSkill, resumeSkill) {
  // Implement tier-based scoring
  if (jdSkill === resumeSkill) return 1.0;
  
  const directMatches = ENHANCED_SIMILARITY_MAP[jdSkill];
  if (directMatches?.includes(resumeSkill)) {
    return 0.8; // Strong compatibility
  }
  
  // Check for broader domain matches
  const jdDomain = getTechnologyDomain(jdSkill);
  const resumeDomain = getTechnologyDomain(resumeSkill);
  
  if (jdDomain === resumeDomain) {
    return 0.6; // Same domain
  }
  
  return 0.3; // Weak match
}

function getTechnologyDomain(tech) {
  const domainMap = {
    // Frontend
    'react': 'frontend', 'vue.js': 'frontend', 'angular': 'frontend',
    'javascript': 'frontend', 'typescript': 'frontend',
    'html': 'frontend', 'css': 'frontend',
    
    // Backend  
    'node.js': 'backend', 'python': 'backend', 'java': 'backend',
    'spring': 'backend', 'django': 'backend', 'fastapi': 'backend',
    'express': 'backend', 'nestjs': 'backend',
    
    // Database
    'postgresql': 'database', 'mysql': 'database', 'mongodb': 'database',
    'redis': 'database', 'elasticsearch': 'database',
    
    // DevOps
    'docker': 'devops', 'kubernetes': 'devops', 'aws': 'devops',
    'gcp': 'devops', 'azure': 'devops', 'terraform': 'devops',
    
    // Mobile
    'react native': 'mobile', 'flutter': 'mobile', 'swift': 'mobile',
    'kotlin': 'mobile', 'ios': 'mobile', 'android': 'mobile'
  };
  
  return domainMap[tech] || 'general';
}

// Enhanced experience evaluation with career stage alignment
function calculateExperienceScore(jdExperience, resumeExperience) {
  const careerStage = analyzeCareerStage(resumeExperience);
  
  // Stage-specific scoring
  const stageRequirements = {
    junior: { min: 0, max: 3, ideal: 1 },
    mid: { min: 2, max: 6, ideal: 4 },
    senior: { min: 5, max: 10, ideal: 7 },
    principal: { min: 8, max: 15, ideal: 12 }
  };
  
  const req = stageRequirements[careerStage];
  
  // Enhanced scoring based on alignment with career stage
  if (resumeExperience >= req.ideal) return 100;
  if (resumeExperience >= req.min && resumeExperience <= req.max) {
    const alignment = Math.abs(resumeExperience - req.ideal) / (req.max - req.ideal);
    return Math.round(100 - (alignment * 50));
  }
  
  // Experience gap penalties
  const gap = Math.abs(jdExperience - resumeExperience);
  if (gap <= 1) return 80;
  if (gap <= 2) return 60;
  if (gap <= 3) return 40;
  return 20;
}

// Domain expertise matching
function calculateDomainMatch(jdDomain, resumeDomains) {
  const domainWeight = 0.05; // 5% of total score
  
  if (resumeDomains.includes(jdDomain)) {
    return Math.round(domainWeight * 100);
  }
  
  // Check for related domains
  const relatedDomains = getRelatedDomains(jdDomain);
  const matchCount = resumeDomains.filter(domain => relatedDomains.includes(domain)).length;
  
  if (matchCount > 0) {
    return Math.round(domainWeight * (matchCount / relatedDomains.length) * 80);
  }
  
  return 0;
}

function getRelatedDomains(domain) {
  const relatedMap = {
    'frontend': ['fullstack', 'mobile'],
    'backend': ['fullstack', 'devops'],
    'mobile': ['frontend', 'fullstack'],
    'devops': ['backend', 'database'],
    'database': ['backend', 'devops'],
    'ai': ['data', 'machine learning'],
    'data': ['ai', 'machine learning']
  };
  
  return relatedMap[domain] || [];
}

// Main enhanced matching function - simplified version
function calculateEnhancedMatchScore(jdData, resumeData) {
  const careerStage = analyzeCareerStage(resumeData.experience);
  
  // Calculate enhanced skill score with career stage adjustment
  const skillScore = calculateEnhancedSkillMatch(
    jdData.skills, 
    resumeData.skills, 
    careerStage
  );
  
  // Enhanced experience score with career stage alignment
  const experienceScore = calculateExperienceScore(
    jdData.experience, 
    resumeData.experience
  );
  
  // Simple preferred skills bonus
  const preferredSkills = jdData.skills.filter(skill => skill.includes('우대') || skill.includes('preferred') || skill.includes('nice-to-have'));
  const preferredMatches = preferredSkills.filter(skill => resumeData.skills.includes(skill.replace(/우대|preferred|nice-to-have/g, '').trim()));
  const preferredScore = preferredSkills.length > 0 ? (preferredMatches.length / preferredSkills.length) * 100 : 100;
  
  // Apply enhanced weights
  const weights = ENHANCED_WEIGHTS.optimized;
  const totalScore = 
    (skillScore * weights.skill) +
    (experienceScore * weights.experience) +
    (preferredScore * weights.preferred);
  
  return {
    total_score: Math.round(Math.min(100, totalScore)),
    components: {
      skill: skillScore,
      experience: experienceScore,
      preferred: preferredScore,
    },
    career_stage: careerStage,
    weight_used: weights
  };
}

// Export for testing
module.exports = {
  calculateEnhancedMatchScore,
  ENHANCED_WEIGHTS,
  ENHANCED_SIMILARITY_MAP,
  analyzeCareerStage,
  getTechnologyDomain
};