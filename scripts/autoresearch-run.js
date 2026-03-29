#!/usr/bin/env node
/**
 * autoresearch-run.js
 * 
 * 여러 실험을 자동으로 실행하고 결과를 비교하는 스크립트.
 * 
 * Usage:
 *   node scripts/autoresearch-run.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASELINE_PATH = 'data/autoresearch/baseline.json';
const EXPERIMENTS_LOG = 'data/autoresearch/experiments.jsonl';
const TEST_CASES_PATH = 'data/autoresearch/test_cases/matching_cases.json';

// 현재 가중치 (baseline)
const BASELINE_WEIGHTS = { skill: 0.40, experience: 0.20, preferred: 0.10, work_type: 0.15, commute: 0.15 };

// 실험 후보들
const EXPERIMENTS = [
  {
    id: 'EXP-001',
    name: 'skill↑ commute↓',
    weights: { skill: 0.45, experience: 0.20, preferred: 0.10, work_type: 0.15, commute: 0.10 },
    hypothesis: '통근 가중치를 낮추고 기술 스킬 가중치를 올리면 discrimination 개선'
  },
  {
    id: 'EXP-002',
    name: 'skill↑↑ commute↓',
    weights: { skill: 0.50, experience: 0.15, preferred: 0.10, work_type: 0.15, commute: 0.10 },
    hypothesis: '기술 스킬 50%, 경력 15%로 조정하면 더 큰 discrimination'
  },
  {
    id: 'EXP-003',
    name: 'experience↑ preferred↓',
    weights: { skill: 0.40, experience: 0.25, preferred: 0.05, work_type: 0.15, commute: 0.15 },
    hypothesis: '경력 가중치를 올리고 우대사항을 줄이면 negative 케이스 점수 하락'
  },
  {
    id: 'EXP-004',
    name: 'work_type↑ commute↓',
    weights: { skill: 0.40, experience: 0.20, preferred: 0.10, work_type: 0.20, commute: 0.10 },
    hypothesis: '근무형태 가중치를 올리면 onsite negative 케이스 점수 하락'
  },
  {
    id: 'EXP-005',
    name: 'balanced high-skill',
    weights: { skill: 0.50, experience: 0.20, preferred: 0.10, work_type: 0.10, commute: 0.10 },
    hypothesis: '스킬 50%로 극대화, 나머지 균등 분배'
  },
  {
    id: 'EXP-006',
    name: 'exp+worktype focus',
    weights: { skill: 0.35, experience: 0.25, preferred: 0.05, work_type: 0.20, commute: 0.15 },
    hypothesis: '경력+근무형태 강조로 negative 필터링 강화'
  },
];

// ── 매칭 로직 (autoresearch-metrics.js와 동일) ─────────

const SIMILARITY_MAP = {
  'typescript': ['javascript'], 'javascript': ['typescript'],
  'react': ['next.js'], 'next.js': ['react'],
  'spring': ['spring boot'], 'spring boot': ['spring'],
  'express': ['node.js', 'nestjs'], 'node.js': ['express', 'nestjs'], 'nestjs': ['node.js', 'express'],
  'fastapi': ['python', 'django'], 'python': ['fastapi', 'django'], 'django': ['python', 'fastapi'],
  'postgresql': ['mysql', 'sql'], 'mysql': ['postgresql', 'sql'], 'sql': ['postgresql', 'mysql'],
  'docker': ['kubernetes', 'container'], 'kubernetes': ['docker', 'container'], 'container': ['docker', 'kubernetes'],
  'aws': ['gcp', 'azure', 'cloud'], 'gcp': ['aws', 'azure', 'cloud'], 'azure': ['aws', 'gcp', 'cloud'], 'cloud': ['aws', 'gcp', 'azure'],
};

function matchSkillScore(job, resumeSkills) {
  const resumeLower = (resumeSkills || []).map(s => s.toLowerCase());
  let matchedRequired = 0, matchedPreferred = 0;
  const totalRequired = job.required_skills?.length || 0;
  const totalPreferred = job.preferred_skills?.length || 0;

  for (const skill of (job.required_skills || [])) {
    const s = skill.toLowerCase();
    if (resumeLower.includes(s)) { matchedRequired++; continue; }
    const similars = SIMILARITY_MAP[s] || [];
    if (similars.some(sim => resumeLower.includes(sim))) { matchedRequired += 0.5; }
  }
  for (const skill of (job.preferred_skills || [])) {
    const s = skill.toLowerCase();
    if (resumeLower.includes(s)) { matchedPreferred++; continue; }
    const similars = SIMILARITY_MAP[s] || [];
    if (similars.some(sim => resumeLower.includes(sim))) { matchedPreferred += 0.5; }
  }

  const requiredScore = totalRequired > 0 ? (matchedRequired / totalRequired) * 70 : 0;
  const preferredScore = totalPreferred > 0 ? (matchedPreferred / totalPreferred) * 30 : 0;
  return { score: Math.round(requiredScore + preferredScore), matchedRequired, totalRequired, matchedPreferred, totalPreferred };
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
  const skill = matchSkillScore(job, resume.skills);
  const exp = matchExperienceScore(job.experience_years, resume.experience_years);
  const pref = skill.totalPreferred > 0 ? Math.round((skill.matchedPreferred / skill.totalPreferred) * 100) : 50;
  const wt = matchWorkTypeScore(job.work_type, resume.work_preference);
  const comm = matchCommuteScore(job, resume);
  return Math.min(100, Math.max(0, Math.round(
    skill.score * weights.skill + exp * weights.experience + pref * weights.preferred + wt * weights.work_type + comm * weights.commute
  )));
}

function avg(arr) { return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

// ── 실험 실행 ─────────────────────────────────────────

function runExperiment(experiment) {
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
  console.log('🔬 Autoresearch Experiment Runner\n');
  console.log('=' .repeat(70));

  // Load baseline
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
  const baselineDisc = baseline.metrics.discrimination;
  console.log(`\n📌 Baseline discrimination: ${baselineDisc}\n`);

  let bestExperiment = null;
  let bestDiscrimination = baselineDisc;
  const allResults = [];

  for (const exp of EXPERIMENTS) {
    const result = runExperiment(exp);
    const delta = result.metrics.discrimination - baselineDisc;
    const verdict = delta > 0 ? '✅ KEEP' : '❌ REVERT';

    console.log(`${result.id} [${result.name}]`);
    console.log(`   Weights: skill=${exp.weights.skill} exp=${exp.weights.experience} pref=${exp.weights.preferred} wt=${exp.weights.work_type} comm=${exp.weights.commute}`);
    console.log(`   Discrimination: ${result.metrics.discrimination} (${delta > 0 ? '+' : ''}${delta.toFixed(2)}) | Pos: ${result.metrics.positive_avg} | Neg: ${result.metrics.negative_avg} | Bord: ${result.metrics.borderline_avg} | Acc: ${result.metrics.accuracy}%`);
    console.log(`   ${verdict}`);
    console.log();

    result.delta = Math.round(delta * 100) / 100;
    result.verdict = delta > 0 ? 'keep' : 'revert';

    allResults.push(result);

    if (delta > 0 && result.metrics.discrimination > bestDiscrimination) {
      bestDiscrimination = result.metrics.discrimination;
      bestExperiment = result;
    }

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
  }

  console.log('=' .repeat(70));
  console.log(`\n🏆 Best Experiment: ${bestExperiment ? bestExperiment.id + ' [' + bestExperiment.name + '] discrimination=' + bestExperiment.metrics.discrimination : 'None (baseline is best)'}\n`);

  // Save best result
  if (bestExperiment) {
    const bestPath = 'data/autoresearch/best_experiment.json';
    fs.writeFileSync(bestPath, JSON.stringify(bestExperiment, null, 2));
    console.log(`💾 Best experiment saved to ${bestPath}`);
    console.log(`\n📋 Recommended weights:`);
    console.log(JSON.stringify(bestExperiment.weights, null, 2));
  }
}

main();
