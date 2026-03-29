#!/usr/bin/env node
/**
 * autoresearch-similarity.js
 * 
 * Technology Similarity Map 확장 실험.
 * 새로운 유사도 매핑을 추가했을 때 discrimination이 개선되는지 테스트.
 */

const fs = require('fs');

const TEST_CASES_PATH = 'data/autoresearch/test_cases/matching_cases.json';
const BASELINE_PATH = 'data/autoresearch/best_experiment.json';

const EXTRA_SIMILARITY = {
  // 기존 맵에 추가할 새로운 매핑
  'redis': ['memcached', 'caching'],
  'memcached': ['redis', 'caching'],
  'caching': ['redis', 'memcached'],
  'graphql': ['rest api', 'api'],
  'rest api': ['graphql', 'api'],
  'grpc': ['rest api', 'api'],
  'kotlin': ['java', 'android'],
  'java': ['kotlin', 'spring'],
  'swift': ['ios', 'objective-c'],
  'terraform': ['infrastructure as code', 'cloudformation'],
  'jenkins': ['ci/cd', 'github actions'],
  'github actions': ['ci/cd', 'jenkins'],
  'ci/cd': ['jenkins', 'github actions'],
  'elasticsearch': ['opensearch', 'search'],
  'kafka': ['rabbitmq', 'messaging'],
  'rabbitmq': ['kafka', 'messaging'],
  'messaging': ['kafka', 'rabbitmq'],
  'mongodb': ['nosql', 'database'],
  'nosql': ['mongodb', 'dynamodb'],
  'android sdk': ['kotlin', 'mobile'],
  'jetpack compose': ['android', 'ui toolkit'],
  'unity': ['game engine', 'c#'],
};

const ALL_MAPS = {
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
  ...EXTRA_SIMILARITY
};

const WEIGHTS = { skill: 0.5, experience: 0.15, preferred: 0.1, work_type: 0.15, commute: 0.1 };

function matchSkillScore(job, resumeSkills) {
  const resumeLower = (resumeSkills || []).map(s => s.toLowerCase());
  let matchedRequired = 0, matchedPreferred = 0;
  const totalRequired = job.required_skills?.length || 0;
  const totalPreferred = job.preferred_skills?.length || 0;

  for (const skill of (job.required_skills || [])) {
    const s = skill.toLowerCase();
    if (resumeLower.includes(s)) { matchedRequired++; }
    else {
      const similars = ALL_MAPS[s] || [];
      if (similars.some(sim => resumeLower.includes(sim))) matchedRequired += 0.5;
    }
  }

  for (const skill of (job.preferred_skills || [])) {
    const s = skill.toLowerCase();
    if (resumeLower.includes(s)) { matchedPreferred++; }
    else {
      const similars = ALL_MAPS[s] || [];
      if (similars.some(sim => resumeLower.includes(sim))) matchedPreferred += 0.5;
    }
  }

  return {
    score: Math.round((totalRequired > 0 ? matchedRequired / totalRequired * 70 : 0) + (totalPreferred > 0 ? matchedPreferred / totalPreferred * 30 : 0)),
    matchedRequired, totalRequired, matchedPreferred, totalPreferred
  };
}

function calcScore(job, resume) {
  const sk = matchSkillScore(job, resume.skills);
  const req = job.experience_years || 0;
  const act = resume.experience_years || 0;
  const diff = act - req;
  const expScore = !req ? 100 : diff >= 0 ? (diff > 3 ? 80 : 100) : diff === -1 ? 70 : diff === -2 ? 40 : 10;
  const prefScore = sk.totalPreferred > 0 ? Math.round(sk.matchedPreferred / sk.totalPreferred * 100) : 50;
  
  const jt = (job.work_type || '').toLowerCase();
  const prefs = (resume.work_preference || []).map(p => p.toLowerCase());
  const idx = prefs.indexOf(jt);
  const wtScore = idx === 0 ? 100 : idx === 1 ? 70 : idx >= 2 ? 40 : jt === 'remote' ? 100 : 50;
  
  let commScore = 50;
  if (job.work_type === 'remote') commScore = 100;
  else if (job.location) {
    const jc = job.location.split(' ')[0];
    const hc = (resume.home || '').split(' ')[0];
    commScore = jc === hc ? 80 : 30;
  }

  return Math.min(100, Math.max(0, Math.round(
    sk.score * WEIGHTS.skill + expScore * WEIGHTS.experience +
    prefScore * WEIGHTS.preferred + wtScore * WEIGHTS.work_type + commScore * WEIGHTS.commute
  )));
}

const testCases = JSON.parse(fs.readFileSync(TEST_CASES_PATH, 'utf-8'));
const best = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));

console.log('🔬 Similarity Map Expansion Experiment\n');

const posCases = testCases.filter(t => t.label === 'positive');
const negCases = testCases.filter(t => t.label === 'negative');

const posAvg = posCases.reduce((s, t) => s + calcScore(t.job, t.resume), 0) / posCases.length;
const negAvg = negCases.reduce((s, t) => s + calcScore(t.job, t.resume), 0) / negCases.length;
const discrimination = Math.round((posAvg - negAvg) * 100) / 100;
const delta = Math.round((discrimination - best.metrics.discrimination) * 100) / 100;

console.log(`With EXP-002 weights + Expanded SIMILARITY_MAP:`);
console.log(`  Discrimination: ${discrimination} (best was ${best.metrics.discrimination}, delta: ${delta > 0 ? '+' : ''}${delta})`);

const results = testCases.map(t => {
  const score = calcScore(t.job, t.resume);
  let verdict = '✅';
  if (t.expected.min_score && score < t.expected.min_score) verdict = '❌';
  if (t.expected.max_score && score > t.expected.max_score) verdict = '⚠️';
  console.log(`  ${verdict} ${t.id} [${t.label}] score=${score} (expected: ${t.expected.min_score || 0}~${t.expected.max_score || 100})`);
  return { id: t.id, label: t.label, score, verdict };
});

const improved = delta > 0;
console.log(`\n${improved ? '✅ KEEP' : '❌ REVERT'} (delta: ${delta > 0 ? '+' : ''}${delta})`);

// Output JSON for next step
fs.writeFileSync('data/autoresearch/experiment_similarity.json', JSON.stringify({
  id: 'EXP-007',
  name: 'Expanded Similarity Map',
  weights: WEIGHTS,
  expanded_similarity: true,
  metrics: { discrimination, positive_avg: Math.round(posAvg * 100) / 100, negative_avg: Math.round(negAvg * 100) / 100 },
  delta,
  verdict: improved ? 'keep' : 'revert',
  results
}, null, 2));
