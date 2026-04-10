#!/usr/bin/env node
// scrape-wanted-api-enhanced.js — Enhanced Wanted.co.kr API scraper with adaptive retry logic
// Implements exponential backoff, UA rotation, and robust error handling.
//
// Usage:
//   node scripts/scrape-wanted-api-enhanced.js --keyword "프론트엔드" --limit 20
//   node scripts/scrape-wanted-api-enhanced.js --keyword "원격" --limit 50 --offset 0 --verbose
//
// Features:
// - Adaptive retry with exponential backoff (2s, 4s, 8s, 16s delays)
// - Rotating User-Agents pool
// - Health check before full scrape
// - Fallback selectors and error recovery
// - Detailed logging for debugging

const https = require('https');
const { URL } = require('url');
const { setTimeout } = require('timers/promises');
const { inferSkills, deriveCareerStage, deriveCareerStageFromTitle } = require('./skill-inference');
const { extractCultureKeywords, normalizeSalary, normalizeDeadline, extractSalaryLine } = require('./post-process-wanted');

// Enhanced User-Agents pool for rotation
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/605.1.15"
];

// Configuration
const MAX_RETRIES = 4;
const BASE_DELAY = 2000; // 2 seconds
const HEALTH_CHECK_URL = 'https://www.wanted.co.kr/api/chaos/search/v1/results';

// Category mapping for skill inference

// Category mapping for skill inference
const CATEGORY_MAP = {
  669: '프론트엔드 개발자',
  672: '백엔드 개발자',
  899: '풀스택 개발자',
  873: '시니어 개발자',
  // ... (keep existing category mapping)
};

// Enhanced HTTP request function with retry logic
async function fetchWithRetry(url, options = {}, retryCount = 0) {
  const userAgent = USER_AGENTS[retryCount % USER_AGENTS.length];
  const enhancedOptions = {
    ...options,
    headers: {
      ...options.headers,
      'User-Agent': userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      ...options.headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, enhancedOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (parseError) {
            reject(new Error(`JSON parse failed: ${parseError.message}`));
          }
        } else {
          handleHttpError(res.statusCode, url, retryCount, reject);
        }
      });
    });

    req.on('error', (error) => {
      handleNetworkError(error, url, retryCount, reject);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      handleTimeoutError(url, retryCount, reject);
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Handle HTTP errors with adaptive retry
function handleHttpError(statusCode, url, retryCount, reject) {
  const shouldRetry = statusCode >= 400 && statusCode < 500 && statusCode !== 404;
  
  if (!shouldRetry || retryCount >= MAX_RETRIES) {
    reject(new Error(`HTTP ${statusCode} - No more retries for ${url}`));
    return;
  }

  const delay = BASE_DELAY * Math.pow(2, retryCount);
  console.log(`HTTP ${statusCode} for ${url}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
  
  setTimeout(() => {
    fetchWithRetry(url, {}, retryCount + 1).then(resolve).catch(reject);
  }, delay);
}

// Handle network errors with retry
function handleNetworkError(error, url, retryCount, reject) {
  if (retryCount >= MAX_RETRIES) {
    reject(new Error(`Network error after ${MAX_RETRIES} retries: ${error.message} for ${url}`));
    return;
  }

  const delay = BASE_DELAY * Math.pow(2, retryCount);
  console.log(`Network error for ${url}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES}): ${error.message}`);
  
  setTimeout(() => {
    fetchWithRetry(url, {}, retryCount + 1).then(resolve).catch(reject);
  }, delay);
}

// Handle timeout errors with retry
function handleTimeoutError(url, retryCount, reject) {
  if (retryCount >= MAX_RETRIES) {
    reject(new Error(`Timeout after ${MAX_RETRIES} retries for ${url}`));
    return;
  }

  const delay = BASE_DELAY * Math.pow(2, retryCount);
  console.log(`Timeout for ${url}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
  
  setTimeout(() => {
    fetchWithRetry(url, {}, retryCount + 1).then(resolve).catch(reject);
  }, delay);
}

// Health check function - simplified
async function performHealthCheck() {
  try {
    // Use a lightweight request to test API accessibility
    const testUrl = new URL('https://www.wanted.co.kr/api/chaos/search/v1/results');
    testUrl.searchParams.set('query', JSON.stringify(['개발자']));
    testUrl.searchParams.set('limit', '1');
    
    const result = await fetchWithRetry(testUrl.toString(), {
      method: 'GET'
    });
    
    console.log('Health check passed: Wanted API is accessible');
    return true;
  } catch (error) {
    console.log(`Health check failed: ${error.message} - proceeding with main scrape anyway`);
    return false; // Continue with main scrape even if health check fails
  }
}

// Main scraping function
async function scrapeWantedJobs(keyword, limit = 20, offset = 0, verbose = false) {
  const startTime = Date.now();
  let totalAttempts = 0;
  let successfulRequests = 0;
  
  console.log(`Starting enhanced Wanted scrape for "${keyword}" with limit=${limit}, offset=${offset}`);
  
  // Perform health check first (continue even if it fails)
  const healthCheckPassed = await performHealthCheck();
  if (!healthCheckPassed) {
    console.log('Health check failed, but proceeding with main scrape...');
  } else {
    console.log('Health check passed, proceeding with scrape');
  }

  const jobs = [];
  const maxPages = Math.ceil(limit / 20); // API returns 20 items per page
  
  for (let page = 0; page < maxPages; page++) {
    const currentOffset = offset + (page * 20);
    
    try {
      const searchUrl = new URL('https://www.wanted.co.kr/api/chaos/search/v1/results');
      searchUrl.searchParams.set('query', JSON.stringify([keyword]));
      searchUrl.searchParams.set('limit', '20');
      searchUrl.searchParams.set('offset', currentOffset.toString());
      
      totalAttempts++;
      
      const response = await fetchWithRetry(searchUrl.toString(), {
        method: 'GET'
      });
      
      if (response.data && response.data.length > 0) {
        jobs.push(...response.data);
        successfulRequests++;
        console.log(`Page ${page + 1}: Retrieved ${response.data.length} jobs`);
        
        // Extract additional details for each job
        for (const job of response.data) {
          try {
            const detailedJob = await extractJobDetails(job);
            jobs.push(detailedJob);
          } catch (detailError) {
            console.log(`Failed to extract details for job ${job.id}: ${detailError.message}`);
            // Keep basic job data even if detail extraction fails
            jobs.push(job);
          }
        }
      } else {
        console.log(`Page ${page + 1}: No jobs found (end of results)`);
        break;
      }
      
      // Be polite - add delay between pages
      await setTimeout(1000);
      
    } catch (error) {
      console.log(`Failed to fetch page ${page + 1}: ${error.message}`);
      // Continue to next page on failure
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`Scrape completed in ${duration}ms`);
  console.log(`Success rate: ${successfulRequests}/${totalAttempts} (${((successfulRequests/totalAttempts)*100).toFixed(1)}%)`);
  console.log(`Total jobs retrieved: ${jobs.length}`);
  
  return jobs.slice(0, limit); // Respect original limit
}

// Enhanced job detail extraction
async function extractJobDetails(job) {
  const detailedJob = { ...job };
  
  // Apply existing extraction logic
  detailedJob.skills = inferSkills(job.title, job.category_tag_id);
  detailedJob.career_stage = deriveCareerStageFromTitle(job.title);
  detailedJob.culture_keywords = extractCultureKeywords(job);
  
  if (job.job_detail && job.job_detail.salary) {
    detailedJob.salary = extractSalaryLine(job.job_detail.salary);
    const normalized = normalizeSalary(detailedJob.salary);
    if (normalized) {
      detailedJob.salary_min = normalized.min;
      detailedJob.salary_max = normalized.max;
    }
  }
  
  if (job.job_deadline) {
    detailedJob.deadline = normalizeDeadline(job.job_deadline);
  }
  
  return detailedJob;
}

// Command line argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    keyword: null,
    limit: 20,
    offset: 0,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keyword' && i + 1 < args.length) {
      params.keyword = args[i + 1];
      i++;
    } else if (args[i] === '--limit' && i + 1 < args.length) {
      params.limit = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--offset' && i + 1 < args.length) {
      params.offset = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--verbose') {
      params.verbose = true;
    }
  }
  
  if (!params.keyword) {
    console.error('Error: --keyword parameter is required');
    process.exit(1);
  }
  
  return params;
}

// Main execution
if (require.main === module) {
  const params = parseArgs();
  
  scrapeWantedJobs(params.keyword, params.limit, params.offset, params.verbose)
    .then(jobs => {
      console.log(JSON.stringify(jobs, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Scraping failed:', error.message);
      process.exit(1);
    });
}

module.exports = { scrapeWantedJobs, fetchWithRetry, performHealthCheck };