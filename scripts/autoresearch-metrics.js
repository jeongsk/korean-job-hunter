#!/usr/bin/env node
/**
 * autoresearch-metrics.js
 * 
 * job-matching 스킬의 baseline을 측정하는 스크립트.
 * 테스트 케이스를 기반으로 매칭 점수를 산출하고 discrimination 메트릭을 계산한다.
 * 
 * Usage:
 *   node scripts/autoresearch-metrics.js [--skill job-matching] [--output data/autoresearch/baseline.json]
 */

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const SKILL = getArg('--skill', 'job-matching');
const OUTPUT = getArg('--output', 'data/autoresearch/baseline.json');

let weights = {
  skill: 0.50,
  experience: 0.15,
  preferred: 0.10,
  work_type: 0.15,
  commute: 0.10
};

const SIMILARITY_MAP = {
  'typescript': ['javascript'],
  'javascript': ['typescript'],
  'react': ['next.js'],
  'next.js': ['react'],
  'spring': ['spring boot'],
  'spring boot': ['spring'],
  'express': ['node.js', 'nestjs'],
  'node.js': ['express', 'nestjs'],
  'nestjs': ['node.js', 'express'],
  'fastapi': ['python', 'django'],
  'python': ['fastapi', 'django'],
  'django': ['python', 'fastapi'],
  'postgresql': ['mysql', 'sql'],
  'mysql': ['postgresql', 'sql'],
  'sql': ['postgresql', 'mysql'],
  'docker': ['kubernetes', 'container'],
  'kubernetes': ['docker', 'container'],
  'container': ['docker', 'kubernetes'],
  'aws': ['gcp', 'azure', 'cloud'],
  'gcp': ['aws', 'azure', 'cloud'],
  'azure': ['aws', 'gcp', 'cloud'],
  'cloud': ['aws', 'gcp', 'azure'],
};

function matchSkillScore(job, resumeSkills) {
  const resumeLower = (resumeSkills || []).map(s => s.toLowerCase());
  let matchedRequired = 0;
  let matchedPreferred = 0;
  const totalRequired = job.required_skills?.length || 0;
  const totalPreferred = job.preferred_skills?.length || 0;

  const matched = [];
  const missing = [];

  for (const skill of (job.required_skills || [])) {
    const s = skill.toLowerCase();
    if (resumeLower.includes(s)) {
      matchedRequired++;
      matched.push(skill);
    } else {
      const similars = SIMILARITY_MAP[s] || [];
      if (similars.some(sim => resumeLower.includes(sim))) {
        matchedRequired += 0.5;
        matched.push(skill + ' (similar)');
      } else {
        missing.push(skill);
      }
    }
  }

  for (const skill of (job.preferred_skills || [])) {
    const s = skill.toLowerCase();
    if (resumeLower.includes(s)) {
      matchedPreferred++;
      matched.push(skill);
    } else {
      const similars = SIMILARITY_MAP[s] || [];
      if (similars.some(sim => resumeLower.includes(sim))) {
        matchedPreferred += 0.5;
        matched.push(skill + ' (similar)');
      } else {
        missing.push(skill);
      }
    }
  }

  const requiredScore = totalRequired > 0 ? (matchedRequired / totalRequired) * 70 : 0;
  const preferredScore = totalPreferred > 0 ? (matchedPreferred / totalPreferred) * 30 : 0;
  const score = Math.round(requiredScore + preferredScore);

  return { score, matched, missing, matchedRequired, totalRequired, matchedPreferred, totalPreferred };
}

function matchExperienceScore(requiredYears, actualYears) {
  if (!requiredYears) return 100;
  if (!actualYears) return 10;
  const diff = actualYears - requiredYears;
  if (diff >= 0) return diff > 3 ? 80 : 100;
  if (diff === -1) return 70;
  if (diff === -2) return 40;
  return 10;
}

function matchWorkTypeScore(jobType, preferences) {
  const prefs = (preferences || []).map(p => p.toLowerCase());
  const jt = (jobType || '').toLowerCase();
  const idx = prefs.indexOf(jt);
  if (idx === 0) return 100;
  if (idx === 1) return 70;
  if (idx >= 2) return 40;
  if (jt === 'remote') return 100;
  return 50;
}

function matchCommuteScore(job, resume) {
  if (job.work_type === 'remote') return 100;
  if (!job.location) return 50;
  const jobCity = job.location.split(' ')[0];
  const homeCity = (resume.home || '').split(' ')[0];
  if (jobCity === homeCity) return 80;
  return 30;
}

function calculateOverallScore(job, resume) {
  const skillResult = matchSkillScore(job, resume.skills);
  const expScore = matchExperienceScore(job.experience_years, resume.experience_years);
  const prefScore = skillResult.totalPreferred > 0 
    ? Math.round((skillResult.matchedPreferred / skillResult.totalPreferred) * 100) 
    : 50;
  const wtScore = matchWorkTypeScore(job.work_type, resume.work_preference);
  const commScore = matchCommuteScore(job, resume);

  // Quadratic skill gate (EXP-165): dampen non-skill components when skill score is low
  // gate = 0.12 + 0.88 × (skill/40)² for skill < 40; gate = 1.0 for skill ≥ 40
  const skillRaw = skillResult.score;
  const gate = skillRaw >= 40 ? 1.0 : 0.12 + 0.88 * Math.pow(skillRaw / 40, 2);

  const gatedExp = Math.round(expScore * gate);
  const gatedPref = Math.round(prefScore * gate);
  const gatedWt = Math.round(wtScore * gate);
  const gatedComm = Math.round(commScore * gate);

  const overall = Math.round(
    skillRaw * weights.skill +
    gatedExp * weights.experience +
    gatedPref * weights.preferred +
    gatedWt * weights.work_type +
    gatedComm * weights.commute
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    components: {
      skill: { score: skillRaw, weighted: Math.round(skillRaw * weights.skill) },
      experience: { score: expScore, weighted: Math.round(gatedExp * weights.experience), gated: gatedExp },
      preferred: { score: prefScore, weighted: Math.round(gatedPref * weights.preferred), gated: gatedPref },
      work_type: { score: wtScore, weighted: Math.round(gatedWt * weights.work_type), gated: gatedWt },
      commute: { score: commScore, weighted: Math.round(gatedComm * weights.commute), gated: gatedComm }
    },
    gate
  };
}

function avg(arr) { return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function stddev(arr) {
  if (arr.length === 0) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.map(x => (x - m) ** 2).reduce((a, b) => a + b, 0) / arr.length);
}

function calculateMetrics(results) {
  const positives = results.filter(r => r.label === 'positive');
  const negatives = results.filter(r => r.label === 'negative');
  const borderlines = results.filter(r => r.label === 'borderline');

  const posScores = positives.map(r => r.score.overall);
  const negScores = negatives.map(r => r.score.overall);
  const allScores = results.map(r => r.score.overall);

  const discrimination = avg(posScores) - avg(negScores);
  const spread = stddev(allScores);
  const falsePositiveRate = negScores.filter(s => s >= 60).length / Math.max(negScores.length, 1);
  const coverage = results.filter(r => r.score.overall > 0).length / results.length;

  return {
    discrimination: Math.round(discrimination * 100) / 100,
    spread: Math.round(spread * 100) / 100,
    false_positive_rate: Math.round(falsePositiveRate * 100),
    coverage: Math.round(coverage * 100),
    positive_avg: Math.round(avg(posScores) * 100) / 100,
    negative_avg: Math.round(avg(negScores) * 100) / 100,
    borderline_avg: Math.round(avg(borderlines.map(r => r.score.overall)) * 100) / 100
  };
}

function main() {
  const testCasesPath = 'data/autoresearch/test_cases/matching_cases.json';
  
  if (!fs.existsSync(testCasesPath)) {
    console.error(`Test cases not found: ${testCasesPath}`);
    process.exit(1);
  }

  const testCases = JSON.parse(fs.readFileSync(testCasesPath, 'utf-8'));
  console.log(`\n🧪 Running ${testCases.length} test cases for ${SKILL}...\n`);

  const results = testCases.map(tc => {
    const score = calculateOverallScore(tc.job, tc.resume);
    let verdict = '✅';
    if (tc.expected.min_score && score.overall < tc.expected.min_score) verdict = '❌';
    if (tc.expected.max_score && score.overall > tc.expected.max_score) verdict = '⚠️';
    console.log(`${verdict} ${tc.id} [${tc.label}] score=${score.overall} (expected: ${tc.expected.min_score || 0}~${tc.expected.max_score || 100})`);
    return { ...tc, score };
  });

  const metrics = calculateMetrics(results);

  console.log(`\n📊 Metrics:`);
  console.log(`   Discrimination: ${metrics.discrimination} (positive_avg - negative_avg)`);
  console.log(`   Score Spread:   ${metrics.spread}`);
  console.log(`   False Positive: ${metrics.false_positive_rate}%`);
  console.log(`   Coverage:       ${metrics.coverage}%`);
  console.log(`   Positive Avg:   ${metrics.positive_avg}`);
  console.log(`   Negative Avg:   ${metrics.negative_avg}`);
  console.log(`   Borderline Avg: ${metrics.borderline_avg}`);

  const output = {
    timestamp: new Date().toISOString(),
    skill: SKILL,
    weights,
    metrics,
    results: results.map(r => ({
      id: r.id,
      label: r.label,
      score: r.score.overall,
      components: r.score.components,
      expected: r.expected
    }))
  };

  const outputDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`\n💾 Baseline saved to ${OUTPUT}`);
}

function getArg(name, defaultVal) {
  const idx = ARGS.indexOf(name);
  return idx >= 0 && idx + 1 < ARGS.length ? ARGS[idx + 1] : defaultVal;
}

main();
