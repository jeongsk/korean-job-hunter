#!/usr/bin/env node
/**
 * autoresearch-metrics.js
 * 
 * job-matching 스킬의 baseline을 측정하는 스크립트.
 * 테스트 케이스를 기반으로 매칭 점수를 산출하고 discrimination 메트릭을 계산한다.
 * 
 * Synced with validated algorithm v3.16 (EXP-173):
 *   - Weights: skill 35%, experience 25%, culture 15%, career_stage 15%, location/work/salary 10%
 *   - Skill gate: quadratic (EXP-165)
 *   - Domain alignment penalty: 40% (EXP-024)
 *   - Coverage gate: 0.75 (EXP-168)
 *   - Location proximity clusters (EXP-173)
 * 
 * Usage:
 *   node scripts/autoresearch-metrics.js [--skill job-matching] [--output data/autoresearch/baseline.json]
 */

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const SKILL = getArg('--skill', 'job-matching');
const OUTPUT = getArg('--output', 'data/autoresearch/baseline.json');

// Validated weights (EXP-017, EXP-028)
const weights = {
  skill: 0.35,
  experience: 0.25,
  culture: 0.15,
  career_stage: 0.15,
  location_work: 0.10
};

// Expanded similarity map (EXP-064, EXP-074, EXP-087, EXP-088, EXP-096, EXP-100)
const SIMILARITY_MAP = {
  // Tier 1: exact equivalents (100%)
  'typescript': ['javascript'], 'javascript': ['typescript'],
  'react': ['next.js'], 'next.js': ['react'],
  'vue': ['nuxt', 'nuxt.js'], 'nuxt': ['vue'], 'nuxt.js': ['vue'],
  'postgresql': ['mysql', 'sql'], 'mysql': ['postgresql', 'sql'], 'sql': ['postgresql', 'mysql'],
  'docker': ['kubernetes', 'container'], 'kubernetes': ['docker', 'container'],
  'container': ['docker', 'kubernetes'],
  'k8s': ['kubernetes'], 'spring_boot': ['spring boot'], 'spring boot': ['spring'],
  // Tier 2: strong (75%)
  'spring': ['spring boot', 'java'],
  'express': ['node.js', 'nestjs', 'koa', 'fastify', 'hono'],
  'node.js': ['express', 'nestjs', 'deno', 'bun'],
  'nestjs': ['node.js', 'express'],
  'fastapi': ['python', 'django', 'flask'],
  'python': ['fastapi', 'django', 'flask'],
  'django': ['python', 'fastapi', 'flask'],
  'flask': ['python', 'fastapi', 'django'],
  'aws': ['gcp', 'azure'], 'gcp': ['aws', 'azure'], 'azure': ['aws', 'gcp'],
  'kafka': ['rabbitmq'], 'rabbitmq': ['kafka'],
  'tensorflow': ['pytorch'], 'pytorch': ['tensorflow'],
  'elasticsearch': ['redis', 'opensearch'], 'redis': ['elasticsearch'],
  'oracle': ['mssql'],
  'graphql': ['rest api', 'grpc'],
  'rest api': ['graphql'],
  'jenkins': ['github actions', 'ci/cd'], 'github actions': ['jenkins', 'ci/cd'],
  'terraform': ['ansible'],
  'spark': ['hadoop'],
  'angular': ['typescript'],
  'dart': ['flutter'], 'flutter': ['dart'],
  'swift': ['swiftui'], 'swiftui': ['swift'],
  'kotlin': ['java'],
  'react native': ['react'],
  // Tier 3: partial (25%)
  'docker': ['terraform', 'nginx'],
  'nginx': ['docker'],
  'spark': ['pandas'],
  'pandas': ['spark'],
  'graphql': ['grpc'],
  'mongodb': ['redis'],
  'redux': ['react', 'zustand', 'recoil', 'mobx'],
  'zustand': ['redux', 'recoil', 'mobx'],
  'recoil': ['redux', 'zustand', 'mobx'],
  'mobx': ['redux', 'zustand', 'recoil'],
  'vuex': ['vue', 'pinia'], 'pinia': ['vue', 'vuex'],
  'jest': ['cypress'],
  'electron': ['tauri'], 'tauri': ['electron'],
  'grafana': ['prometheus', 'datadog'], 'prometheus': ['grafana', 'datadog'],
  'drizzle': ['prisma', 'typeorm', 'sequelize', 'mongoose'],
  'prisma': ['drizzle'],
  'deno': ['node.js', 'bun'], 'bun': ['node.js', 'deno'],
  'remix': ['next.js', 'astro'],
  'bigquery': ['snowflake'], 'snowflake': ['bigquery'],
  'airflow': ['dbt'], 'dbt': ['airflow'],
  'unity': ['unreal'], 'unreal': ['unity'],
  'solidity': ['ethereum', 'blockchain', 'smart contract'],
  'go': ['rust'], 'rust': ['go'],
  'svelte': ['react', 'vue', 'angular'],
  'angular': ['react', 'vue', 'svelte'],
  'react': ['vue', 'svelte', 'angular'],
  'vue': ['react', 'svelte', 'angular'],
};

// Primary domain detection (EXP-104: full coverage)
const PRIMARY_DOMAINS = {
  'js/ts': ['react', 'next.js', 'vue', 'nuxt', 'svelte', 'angular', 'node.js', 'express', 'nestjs',
    'react native', 'deno', 'bun', 'remix', 'astro', 'fastify', 'koa', 'hono', 'vite', 'tailwind',
    'graphql', 'rest api', 'grpc', 'electron', 'capacitor', 'ionic', 'redux', 'zustand', 'recoil',
    'mobx', 'vuex', 'pinia', 'jest', 'cypress', 'prisma', 'drizzle', 'typeorm', 'sequelize', 'mongoose',
    'sentry', 'firebase', 'supabase', 'vercel', 'trpc', 'storybook'],
  'python': ['python', 'django', 'flask', 'fastapi', 'tensorflow', 'pytorch', 'celery', 'airflow', 'dbt',
    'langchain', 'mlops', 'jupyter'],
  'java': ['java', 'spring', 'spring boot', 'jpa', 'kotlin', 'jetpack compose', 'msa', 'webflux', 'mybatis'],
  'cloud': ['aws', 'gcp', 'azure', 'aws lambda', 'aws s3', 'aws sqs', 'dynamodb', 'cloudwatch'],
  'devops': ['docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github actions', 'linux', 'nginx',
    'ci/cd', 'datadog', 'grafana', 'prometheus', 'argocd', 'istio', 'sre'],
  'data': ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'mssql', 'kafka', 'rabbitmq',
    'spark', 'hadoop', 'bigquery', 'snowflake', 'opensearch'],
  'rust': ['rust', 'tauri'],
  'go': ['go'],
  'swift': ['swift', 'swiftui'],
  'c#': ['c#', '.net', 'asp.net'],
  'c++': ['c++'],
  'dart': ['dart', 'flutter'],
  'ruby': ['ruby', 'rails'],
  'php': ['php', 'laravel'],
  'game': ['unity', 'unreal'],
  'design': ['figma'],
  'blockchain': ['solidity', 'blockchain', 'web3', 'ethereum', 'smart contract'],
  'security': ['devsecops', 'owasp', 'cybersecurity', 'penetration testing'],
};

function getSkillDomain(skill) {
  const s = skill.toLowerCase();
  for (const [domain, skills] of Object.entries(PRIMARY_DOMAINS)) {
    if (skills.includes(s)) return domain;
  }
  return null;
}

function getJobPrimaryDomain(jobSkills) {
  const domainCounts = {};
  for (const skill of jobSkills) {
    const d = getSkillDomain(skill);
    if (d) domainCounts[d] = (domainCounts[d] || 0) + 1;
  }
  if (Object.keys(domainCounts).length === 0) return null;
  return Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0][0];
}

// Location proximity clusters (EXP-173)
const LOCATION_CLUSTERS = {
  gangnam: ['강남구', '서초구', '송파구', '역삼', '삼성', '선릉', '잠실', '신사', '논현', '양재'],
  pangyo: ['판교', '분당', '성남', '동탄', '수지', '구미'],
  yeouido: ['영등포구', '여의도', '마포구', '용산구', '광화문', '을지로', '종로'],
  hongdae: ['홍대', '신촌', '건대', '성수', '왕십리'],
  guro: ['구로구', '금천구', '가산', '독산'],
  seoul_other: ['강서구', '양천구', '은평구', '노원구', '중랑구', '관악구', '동작구', '방배', '삼성'],
};

const LOCATION_TO_CLUSTER = {};
for (const [cluster, locs] of Object.entries(LOCATION_CLUSTERS)) {
  for (const loc of locs) LOCATION_TO_CLUSTER[loc] = cluster;
}

const ADJACENT_CLUSTERS = [
  ['gangnam', 'pangyo'], ['gangnam', 'yeouido'], ['gangnam', 'hongdae'],
  ['yeouido', 'hongdae'], ['yeouido', 'guro'],
];

function locationProximity(jobLoc, resumeLoc) {
  if (!jobLoc || !resumeLoc) return 50;
  if (jobLoc === resumeLoc) return 100;
  // Extract district
  const jobDistrict = extractDistrict(jobLoc);
  const homeDistrict = extractDistrict(resumeLoc);
  if (jobDistrict === homeDistrict) return 100;
  const jobCluster = LOCATION_TO_CLUSTER[jobDistrict];
  const homeCluster = LOCATION_TO_CLUSTER[homeDistrict];
  if (!jobCluster || !homeCluster) {
    // Fallback to city match
    const jobCity = jobLoc.split(' ')[0];
    const homeCity = resumeLoc.split(' ')[0];
    return jobCity === homeCity ? 80 : 30;
  }
  if (jobCluster === homeCluster) return 75;
  if (ADJACENT_CLUSTERS.some(([a, b]) => (a === jobCluster && b === homeCluster) || (b === jobCluster && a === homeCluster))) return 55;
  return 30;
}

function extractDistrict(loc) {
  const parts = loc.replace(/시|도/g, '').trim().split(/\s+/);
  // Look for district (ends in 구, 동, 로)
  for (const p of parts) {
    if (/[구동로]$/.test(p) || LOCATION_TO_CLUSTER[p]) return p;
  }
  // Try matching against known locations
  for (const [name] of Object.entries(LOCATION_TO_CLUSTER)) {
    if (loc.includes(name)) return name;
  }
  return parts[parts.length - 1] || loc;
}

function matchSkillScore(job, resumeSkills) {
  const resumeLower = (resumeSkills || []).map(s => s.toLowerCase());
  const allJobSkills = [...(job.required_skills || []), ...(job.preferred_skills || [])];
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
        matchedRequired += 0.75;
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
        matchedPreferred += 0.75;
        matched.push(skill + ' (similar)');
      } else {
        missing.push(skill);
      }
    }
  }

  const totalSkillPoints = totalRequired + totalPreferred;
  const totalMatched = matchedRequired + matchedPreferred;
  const coverage = totalSkillPoints > 0 ? totalMatched / totalSkillPoints : 0;

  const requiredScore = totalRequired > 0 ? (matchedRequired / totalRequired) * 70 : 0;
  const preferredScore = totalPreferred > 0 ? (matchedPreferred / totalPreferred) * 30 : 0;
  let score = Math.round(requiredScore + preferredScore);

  // Domain alignment penalty (EXP-024, EXP-037: 40% penalty)
  const jobDomain = getJobPrimaryDomain(allJobSkills);
  const resumeDomain = getJobPrimaryDomain(resumeSkills);
  if (jobDomain && resumeDomain && jobDomain !== resumeDomain) {
    score = Math.round(score * 0.60);
  }

  return { score, matched, missing, matchedRequired, totalRequired, matchedPreferred, totalPreferred, coverage, domainPenalty: jobDomain !== resumeDomain };
}

function matchExperienceScore(requiredYears, actualYears) {
  if (!requiredYears) return 100;
  if (!actualYears && actualYears !== 0) return 10;
  const diff = actualYears - requiredYears;
  if (diff >= 0) return diff > 3 ? 80 : 100;
  if (diff === -1) return 70;
  if (diff === -2) return 40;
  return 10;
}

function matchCareerStageScore(jobCareerStage, resumeYears) {
  if (!jobCareerStage) return 50;
  if (resumeYears === undefined || resumeYears === null) return 50;
  const stageThresholds = { entry: 0, junior: 1, mid: 3, senior: 7, lead: 10 };
  const required = stageThresholds[jobCareerStage] ?? 3;
  const diff = resumeYears - required;
  if (diff >= 0) return diff > 3 ? 85 : 100;
  if (diff === -1) return 70;
  if (diff === -2) return 45;
  return 20;
}

function matchCultureScore(jobCulture, resumeCulture) {
  if (!jobCulture || jobCulture.length === 0) return 50;
  if (!resumeCulture || resumeCulture.length === 0) return 50;
  const jobSet = new Set(jobCulture.map(c => c.toLowerCase()));
  const resumeSet = new Set(resumeCulture.map(c => c.toLowerCase()));
  let matches = 0;
  for (const c of jobSet) { if (resumeSet.has(c)) matches++; }
  return Math.round((matches / Math.max(jobSet.size, 1)) * 100);
}

function matchLocationWorkScore(job, resume) {
  let score = 50;
  // Work type (0-15)
  const prefs = (resume.work_preference || []).map(p => p.toLowerCase());
  const wt = (job.work_type || '').toLowerCase();
  let wtScore = 50;
  if (wt === 'remote') wtScore = 100;
  else if (prefs.includes(wt)) wtScore = prefs.indexOf(wt) === 0 ? 100 : 70;
  else if (wt === 'onsite') wtScore = 30;

  // Location proximity (0-15)
  let locScore = locationProximity(job.location, resume.home);
  if (wt === 'remote') locScore = 100;

  // Salary alignment (-20 to +20) if data available
  let salBonus = 0;
  if (job.salary_min && resume.salary_min) {
    const overlap = Math.min(job.salary_max || 99999, resume.salary_max || 99999) -
                    Math.max(job.salary_min, resume.salary_min);
    if (overlap > 0) salBonus = 20;
    else if (job.salary_min > (resume.salary_max || 0)) salBonus = -20;
  }

  score = Math.round(wtScore * 0.4 + locScore * 0.4 + Math.max(0, Math.min(100, 50 + salBonus * 2.5)) * 0.2);
  return Math.min(100, Math.max(0, score));
}

function calculateOverallScore(job, resume) {
  const skillResult = matchSkillScore(job, resume.skills);
  const expScore = matchExperienceScore(job.experience_years, resume.experience_years);
  const cultureScore = matchCultureScore(job.culture_keywords, resume.culture_preferences);
  const careerScore = matchCareerStageScore(job.career_stage, resume.experience_years);
  const locWorkScore = matchLocationWorkScore(job, resume);

  // Quadratic skill gate (EXP-165)
  const skillRaw = skillResult.score;
  let gate = skillRaw >= 40 ? 1.0 : 0.12 + 0.88 * Math.pow(skillRaw / 40, 2);

  // Coverage gate (EXP-168): dampen when skill >= 40 but coverage < 60%
  let coverageGate = 1.0;
  if (skillRaw >= 40 && skillResult.coverage < 0.6) {
    coverageGate = 0.75;
  }
  const effectiveGate = gate * coverageGate;

  const gatedExp = Math.round(expScore * effectiveGate);
  const gatedCulture = Math.round(cultureScore * effectiveGate);
  const gatedCareer = Math.round(careerScore * effectiveGate);
  const gatedLocWork = Math.round(locWorkScore * effectiveGate);

  const overall = Math.round(
    skillRaw * weights.skill +
    gatedExp * weights.experience +
    gatedCulture * weights.culture +
    gatedCareer * weights.career_stage +
    gatedLocWork * weights.location_work
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    components: {
      skill: { score: skillRaw, weighted: Math.round(skillRaw * weights.skill), domain_penalty: skillResult.domainPenalty },
      experience: { score: expScore, weighted: Math.round(gatedExp * weights.experience), gated: gatedExp },
      culture: { score: cultureScore, weighted: Math.round(gatedCulture * weights.culture), gated: gatedCulture },
      career_stage: { score: careerScore, weighted: Math.round(gatedCareer * weights.career_stage), gated: gatedCareer },
      location_work: { score: locWorkScore, weighted: Math.round(gatedLocWork * weights.location_work), gated: gatedLocWork }
    },
    gate: effectiveGate
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
