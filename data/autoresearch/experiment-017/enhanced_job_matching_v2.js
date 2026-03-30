// Enhanced Job Matching System with Advanced Context-Aware Analysis
// EXP-017: Advanced Context-Aware Job Matching with Predictive Scoring

const fs = require('fs');
const path = require('path');

class AdvancedJobMatcher {
  constructor() {
    this.companyCultureKeywords = {
      'innovative': ['혁신', '새로움', '도전', 'creative', 'innovation', 'disrupt'],
      'collaborative': ['협업', 'team', '협력', 'collaboration', 'teamwork', 'partnership'],
      'fast-paced': ['빠른', 'agile', 'fast', 'quick', '동시대', '실시간'],
      'structured': ['체계', 'process', 'systematic', 'well-organized', '구조화'],
      'customer-focused': ['고객', 'customer', '사용자', 'user', 'client'],
      'quality-driven': ['품질', 'quality', 'excellence', 'precision', '완벽'],
      'learning-focused': ['학습', 'learning', '성장', 'growth', 'development'],
      'result-oriented': ['성과', 'results', 'achievement', 'performance', 'outcome']
    };

    this.jobIntentKeywords = {
      'development': ['개발', 'development', 'engineer', 'developer', '코딩', 'programming'],
      'data': ['데이터', 'data', 'analytics', 'analysis', 'machine learning', 'ai'],
      'management': ['매니저', 'manager', 'management', 'leader', '리더', 'pm'],
      'design': ['디자인', 'design', 'ui', 'ux', 'designer'],
      'sales': ['영업', 'sales', 'business development', 'bd', '기획'],
      'research': ['연구', 'research', 'scientist', 'r&d', '개발']
    };

    this.successFactors = {
      'skill_match_weight': 0.35,
      'experience_fit_weight': 0.25,
      'company_culture_fit': 0.15,
      'career_stage_alignment': 0.15,
      'location_work_fit': 0.10
    };
  }

  // Advanced Semantic Analysis of Job Description
  analyzeJobSemantics(jobDescription) {
    const text = jobDescription.toLowerCase();
    
    // Extract job intent
    const jobIntent = this.extractJobIntent(text);
    
    // Extract company culture indicators
    const cultureIndicators = this.extractCompanyCulture(text);
    
    // Extract skill requirements with depth analysis
    const skillRequirements = this.extractSkillRequirements(text);
    
    // Extract work characteristics
    const workCharacteristics = this.extractWorkCharacteristics(text);
    
    return {
      intent: jobIntent,
      culture: cultureIndicators,
      skills: skillRequirements,
      characteristics: workCharacteristics,
      complexity: this.assessComplexity(text)
    };
  }

  extractJobIntent(text) {
    let maxScore = 0;
    let primaryIntent = 'unknown';
    
    for (const [intent, keywords] of Object.entries(this.jobIntentKeywords)) {
      const score = keywords.reduce((sum, keyword) => {
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        return sum + (matches ? matches.length : 0);
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        primaryIntent = intent;
      }
    }
    
    return {
      primary: primaryIntent,
      confidence: maxScore / 10, // Normalize to 0-1
      allIntents: Object.entries(this.jobIntentKeywords)
        .map(([intent, keywords]) => ({
          intent,
          score: keywords.reduce((sum, keyword) => {
            const regex = new RegExp(keyword, 'gi');
            const matches = text.match(regex);
            return sum + (matches ? matches.length : 0);
          }, 0)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
    };
  }

  extractCompanyCulture(text) {
    const cultureProfile = {};
    
    for (const [culture, keywords] of Object.entries(this.companyCultureKeywords)) {
      const matches = text.match(new RegExp(keywords.join('|'), 'gi'));
      cultureProfile[culture] = {
        score: matches ? matches.length : 0,
        keywords: matches || [],
        presence: matches && matches.length > 0
      };
    }
    
    // Sort by score and identify dominant culture
    const sortedCultures = Object.entries(cultureProfile)
      .sort((a, b) => b[1].score - a[1].score);
    
    return {
      dominant: sortedCultures[0][0] || 'unknown',
      profile: cultureProfile,
      topCultures: sortedCultures.slice(0, 3).map(([name, data]) => ({
        name,
        score: data.score,
        keywords: data.keywords.slice(0, 3)
      }))
    };
  }

  extractSkillRequirements(text) {
    // Enhanced skill extraction with tiered classification
    const skillCategories = {
      'core': [],
      'preferred': [],
      'bonus': [],
      'tools': [],
      'methodologies': []
    };

    // Core skills (must-have)
    const coreSkills = this.extractSkillsByPattern(text, [
      /필수|required|must-have|necessary/gi,
      /(\w+)\s*(years?|년)\s*experience/gi,
      /(\w+)\s*skills?/gi
    ], 'core');

    // Preferred skills (nice-to-have)
    const preferredSkills = this.extractSkillsByPattern(text, [
      /우대|preferred|nice-to-have|bonus/gi,
      /플러스|plus/gi,
      /경험|experience/gi
    ], 'preferred');

    // Tools and methodologies
    const toolSkills = this.extractSpecificTools(text);
    const methodologySkills = this.extractMethodologies(text);

    return {
      ...skillCategories,
      core: [...new Set(coreSkills)],
      preferred: [...new Set(preferredSkills)],
      tools: [...new Set(toolSkills)],
      methodologies: [...new Set(methodologySkills)]
    };
  }

  extractSkillsByPattern(text, patterns, category) {
    const skills = [];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        // Extract skill names from matched patterns
        for (const match of matches) {
          const skillNames = match.match(/\b\w+\b/g) || [];
          skills.push(...skillNames.filter(skill => 
            skill.length > 2 && !['years', 'year', '경력', '경험'].includes(skill)
          ));
        }
      }
    }
    
    return skills;
  }

  extractSpecificTools(text) {
    const toolPatterns = [
      /docker|kubernetes|aws|gcp|azure/i,
      /react|vue|angular|next\.js/i,
      /node\.js|python|java|javascript|typescript/i,
      /mysql|postgresql|mongodb|redis/i,
      /git|github|jenkins|ci\/cd/i
    ];

    const tools = [];
    for (const pattern of toolPatterns) {
      const matches = text.match(pattern);
      if (matches) tools.push(...matches);
    }

    return tools;
  }

  extractMethodologies(text) {
    const methodologies = [];
    const methodPatterns = [
      /agile|scrum|kanban|waterfall/i,
      /tdd|bdd|test-driven|behavior-driven/i,
      /ci\/cd|continuous|devops/i,
      /microservices|monolith|serverless/i
    ];

    for (const pattern of methodPatterns) {
      const matches = text.match(pattern);
      if (matches) methodologies.push(...matches);
    }

    return methodologies;
  }

  extractWorkCharacteristics(text) {
    const characteristics = {
      remote: this.checkRemoteWork(text),
      teamSize: this.extractTeamSize(text),
      seniority: this.extractSeniority(text),
      travel: this.extractTravelRequirement(text)
    };

    return characteristics;
  }

  checkRemoteWork(text) {
    const remoteKeywords = [
      /재택|원격|remote|work from home/i,
      /하이브리드|hybrid/i,
      /비대면|contactless/i
    ];

    for (const pattern of remoteKeywords) {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        if (match) {
          if (match[0].includes('재택') || match[0].includes('원격') || match[0].includes('remote')) {
            return { type: 'remote', confidence: 0.9 };
          } else if (match[0].includes('하이브리드') || match[0].includes('hybrid')) {
            return { type: 'hybrid', confidence: 0.8 };
          }
        }
      }
    }

    return { type: 'onsite', confidence: 0.6 };
  }

  extractTeamSize(text) {
    const teamMatches = text.match(/(\d+)\s*명\s*팀|팀\s*(\d+)\s*명|team\s*(\d+)/i);
    if (teamMatches) {
      const size = parseInt(teamMatches[1] || teamMatches[2] || teamMatches[3]);
      if (size <= 5) return 'small';
      if (size <= 20) return 'medium';
      return 'large';
    }
    return 'unknown';
  }

  extractSeniority(text) {
    const seniorityPatterns = [
      { level: 'junior', patterns: [/신입|fresher|entry|junior/i] },
      { level: 'mid', patterns: [/중급|mid-level|mid/i] },
      { level: 'senior', patterns: [/시니어|senior|high/i] },
      { level: 'lead', patterns: [/리드|lead|principal|staff/i] }
    ];

    for (const { level, patterns } of seniorityPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return level;
        }
      }
    }

    return 'unknown';
  }

  extractTravelRequirement(text) {
    const travelKeywords = [/출장|business trip|travel/i];
    for (const pattern of travelKeywords) {
      if (pattern.test(text)) {
        return { required: true, frequency: 'occasional' };
      }
    }
    return { required: false, frequency: 'none' };
  }

  assessComplexity(text) {
    const complexityFactors = {
      technicalTerms: (text.match(/\bAPI|SDK|Framework|Architecture|Microservices\b/gi) || []).length,
      responsibilities: (text.match(/(\w+)\s*하다|(\w+)\s*업무/gi) || []).length,
      requirements: (text.match(/요구|requirement|skill|experience/gi) || []).length,
      length: text.length / 1000 // Normalize by length
    };

    const complexityScore = Object.values(complexityFactors).reduce((sum, val) => sum + val, 0);
    
    if (complexityScore > 5) return 'high';
    if (complexityScore > 2.5) return 'medium';
    return 'low';
  }

  // Enhanced Candidate Profile Analysis
  analyzeCandidateProfile(resumeData) {
    const profile = {
      skills: this.normalizeSkills(resumeData.skills || []),
      experience: this.calculateTotalExperience(resumeData.experience || []),
      careerStage: this.determineCareerStage(resumeData.experience || []),
      preferences: this.extractPreferences(resumeData.preferences || {}),
      culturalFit: this.assessCulturalPreferences(resumeData.personality || {})
    };

    return profile;
  }

  normalizeSkills(skills) {
    // Normalize skill names for matching
    const skillMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'node': 'node.js',
      'react': 'react',
      'vue': 'vue.js',
      'aws': 'aws',
      'gcp': 'gcp',
      'azure': 'azure',
      'docker': 'docker',
      'k8s': 'kubernetes',
      'kubernetes': 'kubernetes'
    };

    return skills.map(skill => skillMap[skill.toLowerCase()] || skill.toLowerCase());
  }

  calculateTotalExperience(experience) {
    let totalYears = 0;
    for (const exp of experience) {
      const years = exp.years || 0;
      totalYears += years;
    }
    return totalYears;
  }

  determineCareerStage(experience) {
    const totalYears = this.calculateTotalExperience(experience);
    
    if (totalYears < 2) return 'entry';
    if (totalYears < 5) return 'junior';
    if (totalYears < 10) return 'mid';
    return 'senior';
  }

  extractPreferences(preferences) {
    return {
      workType: preferences.workType || ['onsite'],
      location: preferences.location || [],
      companySize: preferences.companySize || [],
      salary: preferences.salary || []
    };
  }

  assessCulturalPreferences(personality) {
    // Simple cultural preference mapping based on personality traits
    const culturalPreferences = {};
    
    if (personality.innovative) culturalPreferences.innovative = 0.8;
    if (personality.collaborative) culturalPreferences.collaborative = 0.9;
    if (personality.autonomous) culturalPreferences.structured = 0.6;
    if (personality.detailOriented) culturalPreferences.qualityDriven = 0.8;
    
    return culturalPreferences;
  }

  // Advanced Matching Algorithm
  calculateAdvancedMatch(job, candidate) {
    const jobAnalysis = this.analyzeJobSemantics(job.description || '');
    const candidateProfile = this.analyzeCandidateProfile(candidate);
    
    // Calculate component scores
    const skillScore = this.calculateSkillMatch(jobAnalysis.skills, candidateProfile.skills);
    const experienceScore = this.calculateExperienceFit(jobAnalysis, candidateProfile);
    const cultureScore = this.calculateCultureFit(jobAnalysis.culture, candidateProfile.culturalFit);
    const careerStageScore = this.calculateCareerStageFit(jobAnalysis, candidateProfile);
    const locationScore = this.calculateLocationFit(job, candidateProfile.preferences);
    
    // Weighted total score
    const totalScore = (
      skillScore * this.successFactors.skill_match_weight +
      experienceScore * this.successFactors.experience_fit_weight +
      cultureScore * this.successFactors.company_culture_fit +
      careerStageScore * this.successFactors.career_stage_alignment +
      locationScore * this.successFactors.location_work_fit
    ) * 100; // Convert to percentage

    // Calculate prediction confidence
    const confidence = this.calculatePredictionConfidence({
      skillScore, experienceScore, cultureScore, careerStageScore, locationScore
    });

    // Generate detailed insights
    const insights = this.generateMatchInsights(jobAnalysis, candidateProfile, {
      skillScore, experienceScore, cultureScore, careerStageScore, locationScore
    });

    return {
      totalScore: Math.round(totalScore),
      confidence: Math.round(confidence * 100),
      components: {
        skills: Math.round(skillScore * 100),
        experience: Math.round(experienceScore * 100),
        culture: Math.round(cultureScore * 100),
        careerStage: Math.round(careerStageScore * 100),
        location: Math.round(locationScore * 100)
      },
      insights,
      jobAnalysis,
      candidateProfile
    };
  }

  calculateSkillMatch(jobSkills, candidateSkills) {
    if (!jobSkills.core || jobSkills.core.length === 0) return 0.5; // Default score
    
    let exactMatches = 0;
    let partialMatches = 0;
    
    for (const jobSkill of jobSkills.core) {
      const skillMatch = candidateSkills.some(candidateSkill => 
        candidateSkill.toLowerCase() === jobSkill.toLowerCase() ||
        this.isSkillEquivalent(candidateSkill, jobSkill)
      );
      
      if (skillMatch) {
        exactMatches++;
      } else if (this.isRelatedSkill(candidateSkill, jobSkill)) {
        partialMatches++;
      }
    }
    
    const exactScore = exactMatches / jobSkills.core.length;
    const partialScore = partialMatches / jobSkills.core.length * 0.5; // Partial matches worth 50%
    
    return Math.min(1, exactScore + partialScore);
  }

  isSkillEquivalent(skill1, skill2) {
    const equivalents = {
      'js': ['javascript'],
      'ts': ['typescript'],
      'py': ['python'],
      'node': ['node.js'],
      'react': ['react.js'],
      'vue': ['vue.js'],
      'k8s': ['kubernetes']
    };
    
    const norm1 = equivalents[skill1.toLowerCase()] || skill1.toLowerCase();
    const norm2 = equivalents[skill2.toLowerCase()] || skill2.toLowerCase();
    
    return norm1 === norm2;
  }

  isRelatedSkill(skill1, skill2) {
    const skillFamilies = {
      'frontend': ['react', 'vue', 'angular', 'js', 'ts'],
      'backend': ['node', 'python', 'java', 'spring', 'django'],
      'database': ['mysql', 'postgresql', 'mongodb', 'redis'],
      'cloud': ['aws', 'gcp', 'azure', 'docker', 'kubernetes']
    };
    
    for (const [family, skills] of Object.entries(skillFamilies)) {
      if (skills.includes(skill1.toLowerCase()) && skills.includes(skill2.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  calculateExperienceFit(jobAnalysis, candidateProfile) {
    const jobSeniority = jobAnalysis.seniority || 'unknown';
    const candidateStage = candidateProfile.careerStage;
    
    const seniorityMap = {
      'junior': ['entry', 'junior'],
      'mid': ['junior', 'mid'],
      'senior': ['mid', 'senior'],
      'lead': ['senior', 'lead']
    };
    
    if (jobSeniority === 'unknown' || candidateStage === 'unknown') {
      return 0.7; // Default moderate score
    }
    
    const validStages = seniorityMap[jobSeniority] || [];
    if (validStages.includes(candidateStage)) {
      return 1.0;
    }
    
    // If candidate is overqualified for junior role
    if (candidateStage === 'senior' && jobSeniority === 'junior') {
      return 0.8;
    }
    
    // If candidate is underqualified
    if (candidateStage === 'junior' && jobSeniority === 'senior') {
      return 0.3;
    }
    
    return 0.5;
  }

  calculateCultureFit(jobCulture, candidateCulture) {
    if (!candidateCulture || Object.keys(candidateCulture).length === 0) {
      return 0.7; // Default moderate score
    }
    
    let totalFit = 0;
    let cultureCount = 0;
    
    for (const [culture, preference] of Object.entries(candidateCulture)) {
      if (jobCulture.profile[culture]) {
        const jobScore = jobCulture.profile[culture].score;
        const fitScore = Math.min(1, (jobScore / 5) * preference); // Normalize job score
        totalFit += fitScore;
        cultureCount++;
      }
    }
    
    return cultureCount > 0 ? totalFit / cultureCount : 0.5;
  }

  calculateCareerStageFit(jobAnalysis, candidateProfile) {
    const jobComplexity = jobAnalysis.complexity || 'medium';
    const candidateStage = candidateProfile.careerStage;
    
    const complexityMap = {
      'entry': ['low'],
      'junior': ['low', 'medium'],
      'mid': ['medium', 'high'],
      'senior': ['high']
    };
    
    const suitableComplexities = complexityMap[candidateStage] || ['medium'];
    if (suitableComplexities.includes(jobComplexity)) {
      return 1.0;
    }
    
    return 0.6; // Moderate fit for mismatched complexity
  }

  calculateLocationFit(job, preferences) {
    if (!preferences.location || preferences.location.length === 0) {
      return 0.8; // High score if no location preference
    }
    
    if (job.workType === 'remote') {
      return 1.0; // Perfect match for remote work
    }
    
    // Check if job location matches preferences
    if (preferences.location.includes(job.location)) {
      return 1.0;
    }
    
    return 0.3; // Low score for location mismatch
  }

  calculatePredictionConfidence(scores) {
    const { skillScore, experienceScore, cultureScore, careerStageScore, locationScore } = scores;
    
    // Confidence based on consistency across scores
    const avgScore = (skillScore + experienceScore + cultureScore + careerStageScore + locationScore) / 5;
    const variance = Math.sqrt(
      Math.pow(skillScore - avgScore, 2) +
      Math.pow(experienceScore - avgScore, 2) +
      Math.pow(cultureScore - avgScore, 2) +
      Math.pow(careerStageScore - avgScore, 2) +
      Math.pow(locationScore - avgScore, 2)
    ) / 5;
    
    // Lower variance = higher confidence
    const consistencyScore = Math.max(0, 1 - variance);
    
    return Math.min(1, avgScore * 0.7 + consistencyScore * 0.3);
  }

  generateMatchInsights(jobAnalysis, candidateProfile, scores) {
    const insights = {
      strengths: [],
      weaknesses: [],
      recommendations: []
    };

    // Analyze strengths
    if (scores.skillScore > 0.8) {
      insights.strengths.push("기술 스킬이 매우 잘 부합합니다");
    }
    if (scores.experienceScore > 0.8) {
      insights.strengths.push("경력 수준이 적합합니다");
    }
    if (scores.cultureScore > 0.8) {
      insights.strengths.push("회사 문화와 잘 맞을 것으로 예상됩니다");
    }

    // Analyze weaknesses
    if (scores.skillScore < 0.5) {
      insights.weaknesses.push("필수 기술 스킬 부족");
      insights.recommendations.push("관련 기술 스킬을 추가로 학습하세요");
    }
    if (scores.experienceScore < 0.5) {
      insights.weaknesses.push("경력 수준이 낮음");
      insights.recommendations.push("선입직 경력을 추가로 쌓거나 관련 프로젝트 경험을 쌓으세요");
    }
    if (scores.cultureScore < 0.5) {
      insights.weaknesses.push("회사 문화와의 부적합성");
      insights.recommendations.push("회사의 문화적 가치를 더 알아보세요");
    }

    // Generate specific recommendations
    if (jobAnalysis.skills.preferred && jobAnalysis.skills.preferred.length > 0) {
      const missingPreferred = jobAnalysis.skills.preferred.filter(skill =>
        !candidateProfile.skills.some(candidateSkill =>
          this.isSkillEquivalent(candidateSkill, skill)
        )
      );
      
      if (missingPreferred.length > 0) {
        insights.recommendations.push(
          `${missingPreferred.slice(0, 2).join(', ')} 등 우대 스킬을 추가하면 더 높은 점수를 받을 수 있습니다`
        );
      }
    }

    return insights;
  }
}

// Test the enhanced matching system
function testEnhancedMatching() {
  const matcher = new AdvancedJobMatcher();
  
  // Test job descriptions
  const testJobs = [
    {
      id: "TEST-001",
      title: "Senior Backend Developer",
      company: "토스",
      description: "토스의 핵심 시스템을 개발할 주니어 백엔드 개발자를 모집합니다. Node.js, TypeScript, AWS 환경에서의 개발 경험이 필요합니다. 혁신적인 금융 서비스를 만들어가는 팀에서 일할 수 있습니다.",
      location: "서울 강남구",
      workType: "hybrid"
    },
    {
      id: "TEST-002", 
      title: "Frontend Developer",
      company: "카카오",
      description: "대규모 웹 서비스의 프론트엔드 개발자를 모집합니다. React, Next.js 경험이 필수이며, 성능 최적화와 사용자 경험 개선에 관심이 있어야 합니다. 협업을 통한 품질 개선을 중요시합니다.",
      location: "서울",
      workType: "onsite"
    }
  ];

  // Test candidate profiles
  const testCandidates = [
    {
      id: "CAND-001",
      name: "테스트 지원자 1",
      skills: ["javascript", "typescript", "node.js", "react", "aws"],
      experience: [
        { company: "A회사", position: "백엔드 개발자", years: 3 },
        { company: "B회사", position: "프론트엔드 개발자", years: 2 }
      ],
      preferences: {
        workType: ["hybrid"],
        location: ["서울"]
      },
      personality: {
        innovative: true,
        collaborative: true,
        autonomous: false
      }
    },
    {
      id: "CAND-002",
      name: "테스트 지원자 2", 
      skills: ["python", "django", "postgresql"],
      experience: [
        { company: "C회사", position: "백엔드 개발자", years: 4 }
      ],
      preferences: {
        workType: ["remote"],
        location: ["부산"]
      },
      personality: {
        innovative: false,
        collaborative: true,
        detailOriented: true
      }
    }
  ];

  console.log("=== Enhanced Job Matching Test Results ===\n");

  testJobs.forEach(job => {
    console.log(`🎯 Job: ${job.title} at ${job.company}`);
    console.log(`📍 Location: ${job.location}, Type: ${job.workType}`);
    console.log(`📝 Description: ${job.description}\n`);

    testCandidates.forEach(candidate => {
      console.log(`👤 Candidate: ${candidate.name}`);
      
      const result = matcher.calculateAdvancedMatch(job, candidate);
      
      console.log(`📊 Match Score: ${result.totalScore}/100 (${result.confidence}% confidence)`);
      console.log(`🎯 Components:`);
      console.log(`   Skills: ${result.components.skills}%`);
      console.log(`   Experience: ${result.components.experience}%`);
      console.log(`   Culture: ${result.components.culture}%`);
      console.log(`   Career Stage: ${result.components.careerStage}%`);
      console.log(`   Location: ${result.components.location}%`);
      
      console.log(`💡 Strengths: ${result.insights.strengths.join(', ') || 'None'}`);
      console.log(`⚠️  Weaknesses: ${result.insights.weaknesses.join(', ') || 'None'}`);
      console.log(`📋 Recommendations: ${result.insights.recommendations.join(', ') || 'None'}`);
      
      console.log(`---\n`);
    });
    console.log("=".repeat(50) + "\n");
  });

  return { testJobs, testCandidates, results: [] };
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedJobMatcher, testEnhancedMatching };
}

// Run test if executed directly
if (require.main === module) {
  testEnhancedMatching();
}