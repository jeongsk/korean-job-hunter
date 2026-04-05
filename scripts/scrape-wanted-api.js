#!/usr/bin/env node
// scrape-wanted-api.js — Wanted.co.kr API-based scraper (bypasses 403 bot detection)
// Uses Wanted's public search API endpoint instead of browser automation.
//
// Usage:
//   node scripts/scrape-wanted-api.js --keyword "프론트엔드" --limit 20
//   node scripts/scrape-wanted-api.js --keyword "원격" --limit 50 --offset 0
//
// Output: JSON array of structured job objects to stdout

const https = require('https');
const { URL } = require('url');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'x-wanted-language': 'ko',
        'Referer': 'https://www.wanted.co.kr/',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${e.message}\nData: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function parsePosition(pos) {
  const company = pos.company?.name || '회사명 미상';
  const title = pos.position || '직무 미상';
  const id = String(pos.id || '');
  const link = id ? `https://www.wanted.co.kr/wd/${id}` : '';
  const location = pos.address?.location || '';
  const country = pos.address?.country || '';
  const employmentType = pos.employment_type || 'regular';
  const dueTime = pos.due_time || null;
  const reward = pos.reward?.formatted_total || '';
  const isNewbie = pos.is_newbie || false;

  // Derive experience from newbie flag (API doesn't give exact years)
  let experience = isNewbie ? '신입가능' : '경력';

  return {
    id,
    title,
    company,
    experience,
    location,
    country,
    employment_type: employmentType,
    deadline: dueTime,
    reward,
    link,
    source: 'wanted-api',
    work_type: 'onsite', // API doesn't include work type; enriched via detail page
    salary: null,         // API doesn't include salary; enriched via detail page
  };
}

async function fetchDetail(wdId) {
  try {
    const data = await fetchJSON(`https://www.wanted.co.kr/api/v1/jobs/${wdId}?lang=ko`);
    // Wanted detail API returns flat structure with 'jd' as full description text
    const description = data?.jd || '';
    const fullLocation = data?.address?.full_location || data?.address?.location || '';
    const geoLocation = data?.address?.geo_location?.location || null;

    // Extract skills from JD text using simple pattern matching
    const SKILL_PATTERNS = [
      /React(?:\.js|\.Native)?/gi, /Next\.?js/gi, /TypeScript/gi, /JavaScript/gi,
      /Vue(?:\.js)?/gi, /Angular/gi, /Svelte/gi, /Node\.?js/gi, /Python/gi, /Java\b/gi,
      /Spring(?:\s*Boot)?/gi, /Django/gi, /Flask/gi, /Go(?:lang)?/gi, /Rust/gi,
      /Kotlin/gi, /Swift/gi, /Flutter/gi, /React\s*Native/gi,
      /AWS/gi, /GCP/gi, /Azure/gi, /Docker/gi, /Kubernetes/gi, /k8s/gi,
      /Terraform/gi, /GraphQL/gi, /PostgreSQL/gi, /MySQL/gi, /MongoDB/gi, /Redis/gi,
      /Elasticsearch/gi, /Kafka/gi, /RabbitMQ/gi, /Nginx/gi,
    ];
    const foundSkills = new Set();
    for (const pat of SKILL_PATTERNS) {
      const m = description.match(pat);
      if (m) foundSkills.add(m[0]);
    }

    return {
      description,
      full_location: fullLocation,
      geo_location: geoLocation,
      skills: [...foundSkills],
      salary: null,
      work_type: null,
    };
  } catch {
    return { description: '', full_location: '', geo_location: null, skills: [], salary: null, work_type: null };
  }
}

async function main() {
  const args = process.argv.slice(2);
  let keyword = '', limit = 20, offset = 0, withDetails = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keyword' || args[i] === '-k') keyword = args[++i];
    else if (args[i] === '--limit' || args[i] === '-l') limit = parseInt(args[++i]) || 20;
    else if (args[i] === '--offset' || args[i] === '-o') offset = parseInt(args[++i]) || 0;
    else if (args[i] === '--details' || args[i] === '-d') withDetails = true;
    else if (!keyword) keyword = args[i]; // positional keyword
  }

  if (!keyword) {
    console.error('Usage: node scrape-wanted-api.js --keyword "프론트엔드" [--limit 20] [--offset 0] [--details]');
    process.exit(1);
  }

  const encoded = encodeURIComponent(keyword);
  const url = `https://www.wanted.co.kr/api/chaos/search/v1/results?keyword=${encoded}&limit=${limit}&offset=${offset}&tab=position&query=${encoded}`;

  console.error(`[scrape-wanted-api] Searching: "${keyword}" (limit=${limit}, offset=${offset})`);

  let result;
  try {
    result = await fetchJSON(url);
  } catch (e) {
    console.error(`[scrape-wanted-api] API error: ${e.message}`);
    process.exit(1);
  }

  const positions = result?.positions?.data || [];
  console.error(`[scrape-wanted-api] Found ${positions.length} positions (total: ${result?.positions?.total_count || '?'})`);

  const jobs = positions.map(parsePosition);

  if (withDetails) {
    console.error(`[scrape-wanted-api] Fetching details for ${jobs.length} jobs...`);
    for (const job of jobs) {
      if (!job.id) continue;
      const detail = await fetchDetail(job.id);
      if (detail.skills?.length) job.skills = detail.skills.join(', ');
      if (detail.full_location) job.full_location = detail.full_location;
      if (detail.geo_location) job.geo_location = detail.geo_location;
      if (detail.description) job.description = detail.description;
      // Small delay to be respectful
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(JSON.stringify(jobs, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
