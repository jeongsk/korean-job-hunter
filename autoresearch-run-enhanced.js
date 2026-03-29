#!/usr/bin/env node
/**
 * autoresearch-run-enhanced.js
 * 
 * Enhanced version with improved similarity mapping for better discrimination
 */

const fs = require('fs');
const path = require('path');

const BASELINE_PATH = 'data/autoresearch/baseline.json';
const EXPERIMENTS_LOG = 'data/autoresearch/experiments.jsonl';
const TEST_CASES_PATH = 'data/autoresearch/test_cases/matching_cases.json';

// Enhanced similarity mapping with graduated scoring
const ENHANCED_SIMILARITY_MAP = {
  // Tier 1: Exact Equivalents (100% credit)
  'typescript': ['javascript'], 'javascript': ['typescript'],
  'react': ['next.js'], 'next.js': ['react'],
  'vue': ['nuxt.js'], 'nuxt.js': ['vue'],
  'postgresql': ['mysql', 'sql'], 'mysql': ['postgresql', 'sql'], 'sql': ['postgresql', 'mysql'],
  'docker': ['container'], 'container': ['docker'],
  
  // Tier 2: Strong Compatibility (75% credit)
  'spring': ['spring boot'], 'spring boot': ['spring'],
  'express': ['node.js', 'nestjs'], 'node.js': ['express', 'nestjs'], 'nestjs': ['node.js', 'express'],
  'fastapi': ['python', 'django'], 'python': ['fastapi', 'django'], 'django': ['python', 'fastapi'],
  'aws': ['gcp', 'azure', 'cloud'], 'gcp': ['aws', 'azure', 'cloud'], 'azure': ['aws', 'gcp', 'cloud'], 'cloud': ['aws', 'gcp', 'azure'],
  
  // Tier 3: Partial Overlap (25% credit)
  'react': ['vue'], 'vue': ['react'],
  'node.js': ['python'], 'python': ['node.js'],
  'aws': ['docker'], 'docker': ['aws'],
  'kubernetes': ['container'], 'container': ['kubernetes'],
  'sql': ['nosql'], 'nosql': ['sql'],
  'python': ['java'], 'java': ['python'],
  
  // Context Matches (50% credit)
  'frontend': ['react', 'vue'], 'react': ['frontend'], 'vue': ['frontend'],
  'backend': ['node.js', 'python'], 'node.js': ['backend'], 'python': ['backend'],
  'database': ['sql', 'nosql'], 'sql': ['database'], 'nosql': ['database'],
  'devops': ['docker', 'kubernetes'], 'docker': ['devops'], 'kubernetes': ['devops']
};

function calculateEnhancedSkillScore(job, resumeSkills) {
  const resumeLower = (resumeSkills || []).map(s => s.toLowerCase());
  let exact = 0, strong = 0, partial = 0, context = 0;
  const totalRequired = job.required_skills?.length || 0;
  const totalPreferred = job.preferred_skills?.length || 0;

  // Process required skills
  for (const skill of (job.required_skills || [])) {
    const s = skill.toLowerCase();
    if (resumeLower.includes(s)) {
      exact++;
    } else {
      // Check for strong compatibility (75%)
      const similars_tier2 = ENHANCED_SIMILARITY_MAP[s]?.filter(skill => skill in ENHANCED_SIMILARITY_MAP && 
        Object.values(ENHANCED_SIMILARITY_MAP).flat().includes(skill));
      if (similars_tier2?.some(sim => resumeLower.includes(sim))) {
        strong++;
        continue;
      }
      // Check for partial overlap (25%)
      const similars_tier3 = ENHANCED_SIMILARITY_MAP[s]?.filter(skill => 
        Object.keys(ENHANCED_SIMILARITY_MAP).some(key => ENHANCED_SIMILARITY_MAP[key].includes(skill)));
      if (similars_tier3?.some(sim => resumeLower.includes(sim))) {
        partial++;
        continue;
      }
      // Check for context matches (50%)
      const similars_context = ENHANCED_SIMILARITY_MAP[s]?.filter(skill => 
        ['frontend', 'backend', 'database', 'devops'].includes(skill));
      if (similars_context?.some(sim => resumeLower.includes(sim))) {
        context++;
        continue;
      }
    }
  }

  // Process preferred skills with same logic but different weight
  for (const skill of (job.preferred_skills || [])) {
    const s = skill.toLowerCase();
    if (resumeLower.includes(s)) {
      exact++; // Also count preferred matches for breakdown
    }
  }

  const weightedRequired = exact + (strong * 0.75) + (partial * 0.25) + (context * 0.5);
  const requiredScore = totalRequired > 0 ? (weightedRequired / totalRequired) * 70 : 0;
  
  // Simple preferred scoring - exact matches only for now
  const matchedPreferred = (job.preferred_skills || []).filter(skill => 
    resumeLower.includes(skill.toLowerCase())).length;
  const preferredScore = totalPreferred > 0 ? (matchedPreferred / totalPreferred) * 30 : 0;
  
  const totalScore = Math.round(requiredScore + preferredScore);
  
  return {
    score: totalScore,
    exact, strong, partial, context,
    weightedRequired, matchedRequired: exact,
    matchedPreferred, totalRequired, totalPreferred
  };
}

function matchExperienceScore(req, actual) {
  if (!req) return 100; if (!actual) return 10;
  const diff = actual - req;
  if (diff >= 0) return diff > 3 ? 80 : 100;
  if (diff === -1) return 70; if (diff === -2) return 40; return 10;
}

function matchWorkTypeScore(jobType, preferences) {
  const prefs = (preferences || []).map(p => p.toLowerCase());
  const jt = (jobType || '').toLowerCase();
  const idx = prefs.indexOf(jt);
  if (idx === 0) return 100; if (idx === 1) return 70; if (idx >= 2) return 40;
  if (jt === 'remote') return 100; return 50;
}

function matchCommuteScore(job, resume) {
  if (job.work_type === 'remote') return 100;
  if (!job.location) return 50;
  return job.location.split(' ')[0] === (resume.home || '').split(' ')[0] ? 80 : 30;
}

function calculateOverallScore(job, resume, weights) {
  const skill = calculateEnhancedSkillScore(job, resume.skills);
  const exp = matchExperienceScore(job.experience_years, resume.experience_years);
  const pref = skill.totalPreferred > 0 ? Math.round((skill.matchedPreferred / skill.totalPreferred) * 100) : 50;
  const wt = matchWorkTypeScore(job.work_type, resume.work_preference);
  const comm = matchCommuteScore(job, resume);
  return Math.min(100, Math.max(0, Math.round(
    skill.score * weights.skill + exp * weights.experience + pref * weights.preferred + wt * weights.work_type + comm * weights.commute
  )));
}

function avg(arr) { return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function runEnhancedExperiment(experiment) {
  const testCases = JSON.parse(fs.readFileSync(TEST_CASES_PATH, 'utf-8'));
  
  const results = testCases.map(tc => ({
    id: tc.id, label: tc.label,
    score: calculateOverallScore(tc.job, tc.resume, experiment.weights),
    expected: tc.expected
  }));

  const positives = results.filter(r => r.label === 'positive');
  const negatives = results.filter(r => r.label === 'negative');
  const borderlines = results.filter(r => r.label === 'borderline');

  const posAvg = avg(positives.map(r => r.score));
  const negAvg = avg(negatives.map(r => r.score));
  const discrimination = posAvg - negAvg;
  const bordAvg = avg(borderlines.map(r => r.score));

  // Accuracy check
  let accurate = 0;
  for (const r of results) {
    const inRange = (
      (r.expected.min_score === undefined || r.score >= r.expected.min_score) &&
      (r.expected.max_score === undefined || r.score <= r.expected.max_score)
    );
    if (inRange) accurate++;
  }

  return {
    id: experiment.id,
    name: experiment.name,
    hypothesis: experiment.hypothesis,
    weights: experiment.weights,
    metrics: {
      discrimination: Math.round(discrimination * 100) / 100,
      positive_avg: Math.round(posAvg * 100) / 100,
      negative_avg: Math.round(negAvg * 100) / 100,
      borderline_avg: Math.round(bordAvg * 100) / 100,
      accuracy: Math.round(accurate / results.length * 100)
    },
    results
  };
}

function main() {
  console.log('🔬 Enhanced Autoresearch Experiment Runner\n');
  console.log('=' .repeat(70));

  // Load baseline
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
  const baselineDisc = baseline.metrics.discrimination;
  console.log(`\n📌 Baseline discrimination: ${baselineDisc}`);
  console.log('🎯 Enhanced similarity mapping with graduated scoring\n');

  // Current weights from baseline
  const currentWeights = baseline.weights;
  console.log(`📊 Current weights: ${JSON.stringify(currentWeights)}\n`);

  // Test enhanced mapping with current weights first
  const baselineExp = {
    id: 'BASELINE-ENHANCED',
    name: 'baseline with enhanced similarity',
    weights: currentWeights,
    hypothesis: 'Enhanced similarity mapping improves discrimination without weight changes'
  };

  const baselineResult = runEnhancedExperiment(baselineExp);
  const baselineDelta = baselineResult.metrics.discrimination - baselineDisc;
  
  console.log(`${baselineExp.id} [${baselineExp.name}]`);
  console.log(`   Discrimination: ${baselineResult.metrics.discrimination} (${baselineDelta > 0 ? '+' : ''}${baselineDelta.toFixed(2)}) | Pos: ${baselineResult.metrics.positive_avg} | Neg: ${baselineResult.metrics.negative_avg} | Bord: ${baselineResult.metrics.borderline_avg} | Acc: ${baselineResult.metrics.accuracy}%`);
  console.log(`   Verdict: ${baselineDelta > 0 ? '✅ IMPROVED' : '❌ NO IMPROVEMENT'}\n`);

  if (baselineDelta > 0) {
    // If enhanced mapping improves baseline, test some weight variations
    const EXPERIMENTS = [
      {
        id: 'EXP-ENH-001',
        name: 'enhanced-skill↑ commute↓',
        weights: { skill: 0.55, experience: 0.15, preferred: 0.1, work_type: 0.1, commute: 0.1 },
        hypothesis: 'Enhanced similarity + higher skill weight'
      },
      {
        id: 'EXP-ENH-002', 
        name: 'enhanced-balanced',
        weights: { skill: 0.5, experience: 0.2, preferred: 0.1, work_type: 0.1, commute: 0.1 },
        hypothesis: 'Enhanced similarity with balanced weights'
      },
      {
        id: 'EXP-ENH-003',
        name: 'enhanced-skill-focused',
        weights: { skill: 0.6, experience: 0.15, preferred: 0.1, work_type: 0.1, commute: 0.05 },
        hypothesis: 'Enhanced similarity with maximum skill focus'
      }
    ];

    let bestExperiment = baselineResult;
    let bestDiscrimination = baselineResult.metrics.discrimination;

    for (const exp of EXPERIMENTS) {
      const result = runEnhancedExperiment(exp);
      const delta = result.metrics.discrimination - baselineDisc;
      const verdict = delta > 0 ? '✅ KEEP' : '❌ REVERT';

      console.log(`${exp.id} [${exp.name}]`);
      console.log(`   Weights: ${JSON.stringify(exp.weights)}`);
      console.log(`   Discrimination: ${result.metrics.discrimination} (${delta > 0 ? '+' : ''}${delta.toFixed(2)}) | Pos: ${result.metrics.positive_avg} | Neg: ${result.metrics.negative_avg} | Bord: ${result.metrics.borderline_avg} | Acc: ${result.metrics.accuracy}%`);
      console.log(`   ${verdict}`);
      console.log();

      result.delta = Math.round(delta * 100) / 100;
      result.verdict = delta > 0 ? 'keep' : 'revert';

      // Append to experiment log
      const logEntry = {
        id: result.id,
        name: result.name,
        timestamp: new Date().toISOString(),
        metrics: result.metrics,
        delta: result.delta,
        verdict: result.verdict
      };
      fs.appendFileSync(EXPERIMENTS_LOG, JSON.stringify(logEntry) + '\n');

      if (delta > 0 && result.metrics.discrimination > bestDiscrimination) {
        bestDiscrimination = result.metrics.discrimination;
        bestExperiment = result;
      }
    }

    console.log('=' .repeat(70));
    console.log(`\n🏆 Best Enhanced Result: ${bestExperiment.id} discrimination=${bestExperiment.metrics.discrimination}\n`);

    if (bestExperiment.id !== 'BASELINE-ENHANCED') {
      console.log('📋 Recommended weights:');
      console.log(JSON.stringify(bestExperiment.weights, null, 2));
    }

    return bestExperiment.metrics.discrimination > baselineDisc;
  } else {
    console.log('💡 Enhanced similarity mapping did not improve discrimination with current weights.');
    return false;
  }
}

// Run the enhanced experiment
const improved = main();
process.exit(improved ? 0 : 1);