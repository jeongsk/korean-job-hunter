#!/usr/bin/env node
// Analyze matching score distribution against live scraped data
const { inferSkills } = require('./skill-inference');

const candidate = {
  skills: ['react', 'typescript', 'javascript', 'next.js', 'node.js', 'python', 'docker', 'aws'],
  years: 5,
  preferences: {
    work_type: ['remote', 'hybrid'],
    salary: { min: 5000, max: 8000 },
    culture: { innovative: 0.8, collaborative: 0.7, learning_focused: 0.9, work_life_balance: 0.8, autonomous: 0.6 }
  }
};

function score(job) {
  const jobSkills = (typeof job.skills === 'string' ? job.skills.split(',') : job.skills || []).map(s => s.toLowerCase());
  let skillMatches = 0;
  const matched = [];
  for (const s of jobSkills) {
    if (candidate.skills.includes(s)) { skillMatches++; matched.push(s); }
  }
  const skillScore = jobSkills.length > 0 ? Math.round((skillMatches / jobSkills.length) * 100) : 50;

  const cultureKws = job.culture_keywords || [];
  let cultureMatches = 0;
  for (const kw of cultureKws) {
    if ((candidate.preferences.culture[kw] || 0) >= 0.6) cultureMatches++;
  }
  const cultureScore = cultureKws.length > 0 ? Math.round((cultureMatches / cultureKws.length) * 100) : 50;

  const stages = ['entry', 'junior', 'mid', 'senior', 'lead'];
  const cStage = 'mid';
  const jStage = job.career_stage || 'mid';
  const stageGap = Math.abs(stages.indexOf(jStage) - stages.indexOf(cStage));
  const careerScore = stageGap === 0 ? 95 : stageGap === 1 ? 75 : 40;

  const exp = job.experience || '';
  let expScore = 50;
  if (/신입/.test(exp) && !/경력/.test(exp)) expScore = candidate.years <= 1 ? 95 : candidate.years <= 3 ? 65 : 40;
  else if (/^경력$/.test(exp.trim())) expScore = 90;
  else {
    const minM = exp.match(/(\d+)\s*년?\s*이상/);
    if (minM) { const r = parseInt(minM[1]); expScore = candidate.years >= r ? 90 : Math.max(0, 90 - (r - candidate.years) * 20); }
    else {
      const rangeM = exp.match(/(\d+)\s*[-~]\s*(\d+)/);
      if (rangeM) {
        const lo = parseInt(rangeM[1]), hi = parseInt(rangeM[2]);
        if (candidate.years >= lo && candidate.years <= hi) expScore = 95;
        else if (candidate.years < lo) expScore = Math.max(0, 95 - (lo - candidate.years) * 15);
        else expScore = Math.max(50, 95 - (candidate.years - hi) * 10);
      }
    }
  }

  let locScore = 50;
  if (job.work_type && candidate.preferences.work_type.includes(job.work_type)) locScore += 20;

  const total = Math.round(skillScore * 0.35 + expScore * 0.25 + cultureScore * 0.15 + careerScore * 0.15 + locScore * 0.10);
  return { title: (job.title || '').substring(0, 45), company: job.company, total, skillScore, expScore, cultureScore, careerScore, locScore, matched: matched.slice(0, 6), skills: jobSkills.slice(0, 6) };
}

const raw = require('fs').readFileSync('/dev/stdin', 'utf8');
const s = raw.indexOf('['), e = raw.lastIndexOf(']') + 1;
const data = JSON.parse(raw.slice(s, e));
const results = data.map(score).sort((a, b) => b.total - a.total);

console.log('=== Live Matching: 5yr React/TS Developer vs Frontend Jobs ===\n');
results.forEach((r, i) => {
  console.log(`${i + 1}. ${r.total}pt | ${r.company} - ${r.title}`);
  console.log(`   sk:${r.skillScore} exp:${r.expScore} cul:${r.cultureScore} car:${r.careerScore} loc:${r.locScore} | skills:${r.matched.join(',')}`);
});
console.log(`\nRange: ${results[results.length - 1].total} - ${results[0].total} | Spread: ${results[0].total - results[results.length - 1].total}`);

// Identify discrimination weakness
const scores = results.map(r => r.total);
const components = ['skillScore', 'expScore', 'cultureScore', 'careerScore', 'locScore'];
console.log('\nComponent variance (lower = less discrimination):');
components.forEach(c => {
  const vals = results.map(r => r[c]);
  const min = Math.min(...vals), max = Math.max(...vals);
  console.log(`  ${c}: range ${min}-${max} (spread: ${max - min})`);
});
