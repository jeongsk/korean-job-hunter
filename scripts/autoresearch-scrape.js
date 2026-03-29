#!/usr/bin/env node
/**
 * autoresearch-scrape.js
 * 
 * job-scraping 스킬의 성능을 측정하는 스크립트.
 * agent-browser를 사용하여 실제 사이트에서 스크래핑 후 메트릭을 계산한다.
 * 
 * Usage:
 *   node scripts/autoresearch-scrape.js --source wanted --keyword "백엔드"
 *   node scripts/autoresearch-scrape.js --source all --keyword "Node.js"
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const ARGS = process.argv.slice(2);
const SOURCE = getArg('--source', 'wanted');
const KEYWORD = getArg('--keyword', '백엔드');
const OUTPUT_DIR = 'data/autoresearch/scraping';
const RESULTS_PATH = path.join(OUTPUT_DIR, 'scrape_results.json');

// ── 소스별 설정 ───────────────────────────────────────

const SOURCES = {
  wanted: {
    name: 'Wanted',
    url: (kw) => `https://www.wanted.co.kr/search?query=${encodeURIComponent(kw)}&tab=position`,
    selectors: {
      primary: '.JobCard_container',
      fallback: ['[data-testid="job-card"]', '.job-card', '[class*="JobCard"]'],
      title: ['.JobCard_title', '[data-testid="job-title"]', 'h2', '[class*="title"]'],
      company: ['.JobCard_company', '[data-testid="company-name"]', '.company', '[class*="company"]', '[class*="Company"]'],
      location: ['.JobCard_location', '[data-testid="location"]', '.location', '[class*="location"]'],
      link: ['a']
    }
  },
  jobkorea: {
    name: 'JobKorea',
    url: (kw) => `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(kw)}&tabType=recruit`,
    selectors: {
      primary: '.list-item',
      fallback: ['.recruit-item', '[data-recruit-id]', '[class*="list"]'],
      title: ['.title', '.link', 'h2', '[class*="title"]'],
      company: ['.name', '.company', '.corp', '[class*="name"]', '[class*="company"]'],
      location: ['.location', '.loc', '[class*="location"]'],
      link: ['a']
    }
  },
  linkedin: {
    name: 'LinkedIn',
    url: (kw) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(kw)}&location=South+Korea`,
    selectors: {
      primary: '.jobs-search__results-list li',
      fallback: ['.job-search-card', '[class*="job-card"]', '[class*="JobCard"]'],
      title: ['.base-search-card__title', 'h3', '[class*="title"]'],
      company: ['.base-search-card__subtitle', 'h4', '[class*="company"]', '[class*="subtitle"]'],
      location: ['.job-search-card__location', '[class*="location"]'],
      link: ['a']
    }
  }
};

// ── 스크래핑 함수 ─────────────────────────────────────

function runAgentBrowser(cmd) {
  try {
    return execSync(`agent-browser ${cmd}`, { encoding: 'utf-8', timeout: 30000 }).trim();
  } catch (e) {
    return null;
  }
}

function scrapeWithFallback(sourceConfig) {
  const results = [];
  
  // 1. 브라우저 열기
  console.log(`  🌐 Opening ${sourceConfig.name}...`);
  const openResult = runAgentBrowser(`open "${sourceConfig.url(KEYWORD)}"`);
  if (!openResult) {
    console.log(`  ❌ Failed to open ${sourceConfig.name}`);
    return null;
  }

  // 2. 페이지 로드 대기
  runAgentBrowser('wait 3000');

  // 3. 스냅샷
  runAgentBrowser('snapshot -i --json > /dev/null 2>&1');

  // 4. 셀렉터 순회하며 데이터 추출
  const allSelectors = [sourceConfig.selectors.primary, ...sourceConfig.selectors.fallback];
  
  let jsCode = '';
  for (const selector of allSelectors) {
    const titleSel = sourceConfig.selectors.title.join(', ');
    const companySel = sourceConfig.selectors.company.join(', ');
    const locationSel = sourceConfig.selectors.location.join(', ');
    
    jsCode = `[...document.querySelectorAll('${selector}')].map(card => ({
      title: card.querySelector('${titleSel}')?.textContent?.trim() || null,
      company: card.querySelector('${companySel}')?.textContent?.trim() || null,
      location: card.querySelector('${locationSel}')?.textContent?.trim() || null,
      link: card.querySelector('a')?.href || null,
      selector: '${selector}',
      scraped_at: new Date().toISOString()
    })).filter(item => item.title || item.company)`;
    
    const evalResult = runAgentBrowser(`eval "${jsCode.replace(/"/g, '\\"')}" --json 2>/dev/null`);
    if (evalResult) {
      try {
        const parsed = JSON.parse(evalResult);
        if (Array.isArray(parsed) && parsed.length > 0) {
          results.push(...parsed);
          console.log(`  ✅ Selector "${selector}": ${parsed.length} jobs found`);
          break;
        }
      } catch (e) {}
    }
    console.log(`  ⚠️ Selector "${selector}": no results, trying fallback...`);
  }

  // 5. 브라우저 종료
  runAgentBrowser('close');

  return results;
}

// ── 메트릭 계산 ───────────────────────────────────────

function calculateScrapeMetrics(jobs) {
  if (!jobs || jobs.length === 0) {
    return {
      total: 0,
      success_rate: 0,
      fields_completeness: 0,
      unique_jobs: 0,
      duplicate_rate: 0
    };
  }

  const total = jobs.length;
  
  // Fields completeness
  let filledFields = 0;
  const totalFields = total * 4; // title, company, location, link
  
  for (const job of jobs) {
    if (job.title) filledFields++;
    if (job.company) filledFields++;
    if (job.location) filledFields++;
    if (job.link) filledFields++;
  }

  const completeness = Math.round(filledFields / totalFields * 100);
  
  // Unique jobs (by link)
  const links = jobs.map(j => j.link).filter(Boolean);
  const unique = [...new Set(links)].length;
  const duplicateRate = links.length > 0 ? Math.round((links.length - unique) / links.length * 100) : 0;

  // Jobs with title (most important)
  const withTitle = jobs.filter(j => j.title).length;
  const withCompany = jobs.filter(j => j.company).length;
  const withLocation = jobs.filter(j => j.location).length;

  return {
    total,
    with_title: withTitle,
    with_company: withCompany,
    with_location: withLocation,
    success_rate: Math.round(withTitle / total * 100),
    fields_completeness: completeness,
    unique_jobs: unique,
    duplicate_rate: duplicateRate
  };
}

// ── 메인 ──────────────────────────────────────────────

function main() {
  console.log(`\n🔬 Job Scraping Performance Test\n`);
  console.log(`Keyword: "${KEYWORD}"`);
  console.log(`Source: ${SOURCE}\n`);

  const sources = SOURCE === 'all' ? Object.keys(SOURCES) : [SOURCE];
  const allResults = {};

  for (const sourceName of sources) {
    const config = SOURCES[sourceName];
    if (!config) {
      console.log(`❌ Unknown source: ${sourceName}`);
      continue;
    }

    console.log(`\n📡 Scraping ${config.name}...`);
    const startTime = Date.now();
    
    const jobs = scrapeWithFallback(config);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (!jobs) {
      console.log(`  ❌ Scraping failed for ${config.name}\n`);
      allResults[sourceName] = { error: true, elapsed };
      continue;
    }

    const metrics = calculateScrapeMetrics(jobs);
    metrics.elapsed_seconds = parseFloat(elapsed);

    console.log(`\n  📊 ${config.name} Results:`);
    console.log(`     Total jobs:      ${metrics.total}`);
    console.log(`     With title:      ${metrics.with_title} (${metrics.success_rate}%)`);
    console.log(`     With company:    ${metrics.with_company}`);
    console.log(`     With location:   ${metrics.with_location}`);
    console.log(`     Fields complete: ${metrics.fields_completeness}%`);
    console.log(`     Unique:          ${metrics.unique_jobs}`);
    console.log(`     Duplicates:      ${metrics.duplicate_rate}%`);
    console.log(`     Time:            ${elapsed}s`);

    allResults[sourceName] = { metrics, jobs: jobs.slice(0, 20) }; // 최대 20개만 저장
  }

  // Save results
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const output = {
    timestamp: new Date().toISOString(),
    keyword: KEYWORD,
    sources: allResults
  };

  fs.writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2));
  console.log(`\n💾 Results saved to ${RESULTS_PATH}`);

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Summary`);
  for (const [name, data] of Object.entries(allResults)) {
    if (data.error) {
      console.log(`  ${SOURCES[name]?.name || name}: ❌ Failed`);
    } else {
      console.log(`  ${SOURCES[name]?.name || name}: ${data.metrics.total} jobs, ${data.metrics.fields_completeness}% complete, ${data.metrics.elapsed_seconds}s`);
    }
  }
}

function getArg(name, defaultVal) {
  const idx = ARGS.indexOf(name);
  return idx >= 0 && idx + 1 < ARGS.length ? ARGS[idx + 1] : defaultVal;
}

main();
