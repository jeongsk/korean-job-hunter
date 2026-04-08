#!/usr/bin/env node
/**
 * autoresearch-scrape.js v2
 * 
 * job-scraping 스킬의 성능을 측정하는 스크립트.
 * Wanted API scraper + post-processor를 사용하여 실제 파이프라인 품질을 평가한다.
 * v1은 agent-browser 기반이었으나 셀렉터가 구식이 되어 0 results를 반환함.
 * 
 * Usage:
 *   node scripts/autoresearch-scrape.js --keyword "백엔드"
 *   node scripts/autoresearch-scrape.js --keyword "프론트엔드" --limit 20
 *   node scripts/autoresearch-scrape.js --keyword "Node.js" --details
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { inferSkills, deriveCareerStage, deriveCareerStageFromTitle } = require('./skill-inference');

const ARGS = process.argv.slice(2);
const KEYWORD = getArg('--keyword', '백엔드');
const LIMIT = parseInt(getArg('--limit', '20'), 10);
const DETAILS = ARGS.includes('--details');
const OUTPUT_DIR = 'data/autoresearch/scraping';
const RESULTS_PATH = path.join(OUTPUT_DIR, 'scrape_results.json');

// ── Wanted API 스크래핑 ──────────────────────────────

function scrapeWantedAPI(keyword, limit) {
  const cmd = `node scripts/scrape-wanted-api.js --keyword "${keyword}" --limit ${limit} ${DETAILS ? '--details' : ''} 2>/dev/null`;
  try {
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 60000, cwd: path.resolve(__dirname, '..') });
    // Find JSON array in output (may have log lines before it)
    const jsonStart = output.indexOf('[');
    if (jsonStart === -1) return null;
    const jsonStr = output.substring(jsonStart);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('  ❌ API scrape failed:', e.message);
    return null;
  }
}

// ── 메트릭 계산 ───────────────────────────────────────

function calculatePipelineMetrics(jobs) {
  if (!jobs || jobs.length === 0) {
    return { total: 0, success_rate: 0, fields_completeness: 0 };
  }

  const total = jobs.length;
  const FIELDS = ['title', 'company', 'location', 'experience', 'work_type', 'skills', 'career_stage', 'salary_min', 'salary_max', 'source'];
  
  let filledFields = 0;
  let totalFields = total * FIELDS.length;
  
  for (const job of jobs) {
    for (const field of FIELDS) {
      const val = job[field];
      if (val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
        filledFields++;
      }
    }
  }

  const completeness = Math.round(filledFields / totalFields * 100);
  
  // Per-field rates
  const fieldRates = {};
  for (const field of FIELDS) {
    const filled = jobs.filter(j => {
      const val = j[field];
      return val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
    }).length;
    fieldRates[field] = Math.round(filled / total * 100);
  }

  // Skills analysis
  const jobsWithSkills = jobs.filter(j => j.skills && j.skills.length > 0).length;
  const avgSkillCount = jobsWithSkills > 0 
    ? (jobs.reduce((sum, j) => sum + (j.skills?.length || 0), 0) / total).toFixed(1) 
    : 0;
  
  // Career stage distribution
  const careerDist = {};
  for (const job of jobs) {
    const stage = job.career_stage != null ? job.career_stage : 'null';
    careerDist[stage] = (careerDist[stage] || 0) + 1;
  }

  // Work type distribution
  const workTypeDist = {};
  for (const job of jobs) {
    const wt = job.work_type != null ? job.work_type : 'null';
    workTypeDist[wt] = (workTypeDist[wt] || 0) + 1;
  }

  return {
    total,
    fields_completeness: completeness,
    field_rates: fieldRates,
    jobs_with_skills: jobsWithSkills,
    skills_rate: Math.round(jobsWithSkills / total * 100),
    avg_skill_count: parseFloat(avgSkillCount),
    career_stage_distribution: careerDist,
    work_type_distribution: workTypeDist,
    // Company extraction quality
    company_clean: jobs.filter(j => j.company && !j.company.match(/^(주식회사|㈜|\(주\))/)).length,
    company_rate: fieldRates.company,
  };
}

// ── 메인 ──────────────────────────────────────────────

function main() {
  console.log(`\n🔬 Job Scraping Pipeline Performance Test (v2 - API-based)\n`);
  console.log(`Keyword: "${KEYWORD}"`);
  console.log(`Limit: ${LIMIT}`);
  console.log(`Details: ${DETAILS ? 'Yes' : 'No (search-time only)'}\n`);

  const startTime = Date.now();
  
  console.log(`📡 Scraping Wanted API...`);
  const jobs = scrapeWantedAPI(KEYWORD, LIMIT);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (!jobs) {
    console.log(`❌ Scraping failed\n`);
    process.exit(1);
  }

  console.log(`  ✅ Got ${jobs.length} jobs in ${elapsed}s\n`);

  const metrics = calculatePipelineMetrics(jobs);

  console.log(`📊 Pipeline Metrics:`);
  console.log(`   Total jobs:           ${metrics.total}`);
  console.log(`   Overall completeness: ${metrics.fields_completeness}%`);
  console.log(`   Time:                 ${elapsed}s`);
  
  console.log(`\n📋 Per-Field Rates:`);
  for (const [field, rate] of Object.entries(metrics.field_rates)) {
    const bar = '█'.repeat(Math.floor(rate / 5)) + '░'.repeat(20 - Math.floor(rate / 5));
    console.log(`   ${field.padEnd(15)} ${bar} ${rate}%`);
  }

  console.log(`\n🧠 Skills Analysis:`);
  console.log(`   Jobs with skills: ${metrics.jobs_with_skills}/${metrics.total} (${metrics.skills_rate}%)`);
  console.log(`   Avg skills/job:   ${metrics.avg_skill_count}`);

  console.log(`\n📈 Career Stage Distribution:`);
  for (const [stage, count] of Object.entries(metrics.career_stage_distribution || {}).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${stage.padEnd(10)} ${count}`);
  }

  console.log(`\n🏢 Work Type Distribution:`);
  for (const [wt, count] of Object.entries(metrics.work_type_distribution).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${wt.padEnd(10)} ${count}`);
  }

  // Save results
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const output = {
    timestamp: new Date().toISOString(),
    keyword: KEYWORD,
    limit: LIMIT,
    details: DETAILS,
    elapsed_seconds: parseFloat(elapsed),
    metrics,
    sample_jobs: jobs.slice(0, 5)
  };

  fs.writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2));
  console.log(`\n💾 Results saved to ${RESULTS_PATH}`);

  // Quality assessment
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Quality Assessment`);
  
  const issues = [];
  if (metrics.field_rates.title < 95) issues.push(`Title extraction: ${metrics.field_rates.title}%`);
  if (metrics.field_rates.company < 90) issues.push(`Company extraction: ${metrics.field_rates.company}%`);
  if (metrics.field_rates.skills < 70) issues.push(`Skills extraction: ${metrics.field_rates.skills}%`);
  if (metrics.field_rates.career_stage < 70) issues.push(`Career stage: ${metrics.field_rates.career_stage}%`);
  if (metrics.skills_rate < 80) issues.push(`Skills coverage: ${metrics.skills_rate}%`);
  
  if (issues.length === 0) {
    console.log(`  ✅ All quality checks passed`);
  } else {
    console.log(`  ⚠️ Issues found:`);
    for (const issue of issues) {
      console.log(`     - ${issue}`);
    }
  }
}

function getArg(name, defaultVal) {
  const idx = ARGS.indexOf(name);
  return idx >= 0 && idx + 1 < ARGS.length ? ARGS[idx + 1] : defaultVal;
}

main();
