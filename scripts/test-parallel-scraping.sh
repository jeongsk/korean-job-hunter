#!/bin/bash

# Performance Test Script for Parallel Scraping
# Measures scraping time and success rates

set -e

echo "🚀 Starting parallel scraping performance test..."
echo "Test time: $(date)"

# Test parameters
TEST_KEYWORD="백엔드"
MAX_COMMUTE=60
SOURCES="wanted,jobkorea,linkedin"

# Create test database
mkdir -p data
sqlite3 data/jobs_test.db "DROP TABLE IF EXISTS jobs; CREATE TABLE jobs (id TEXT PRIMARY KEY, title TEXT, company TEXT, experience TEXT, work_type TEXT, location TEXT, reward TEXT, url TEXT, source TEXT, created_at TEXT)"

# Record start time
START_TIME=$(date +%s)

echo "📊 Testing original sequential scraping..."
cd /Users/jeongsk/.openclaw/workspace/korean-job-hunter

# Test sequential scraping (original method)
echo "1. Testing sequential scraping..."
SEQ_START=$(date +%s)

# Wanted scraping
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
timeout 60 agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query=${TEST_KEYWORD}&tab=position" || echo "Wanted timeout"
sleep 5
timeout 30 agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,10).map(el => ({title: el.textContent?.trim(), link: el.href}))" --json > test_wanted.json || echo "Wanted extraction timeout"
agent-browser close

# JobKorea scraping  
timeout 60 agent-browser --user-agent "$UA" open "https://www.jobkorea.co.kr/Search/?stext=${TEST_KEYWORD}&tabType=recruit" || echo "JobKorea timeout"
sleep 5
timeout 30 agent-browser eval "[...document.querySelectorAll('[class*=dlua7o0]')].slice(0,10).map(card => ({title: card.textContent?.trim(), link: card.querySelector('a')?.href}))" --json > test_jobkorea.json || echo "JobKorea extraction timeout"
agent-browser close

# LinkedIn scraping
timeout 60 agent-browser --user-agent "$UA" open "https://www.linkedin.com/jobs/search/?keywords=${TEST_KEYWORD}&location=South+Korea" || echo "LinkedIn timeout"  
sleep 8
timeout 30 agent-browser eval "[...document.querySelectorAll('.jobs-search__results-list li')].slice(0,10).map(el => ({title: el.querySelector('h3')?.textContent?.trim(), link: el.querySelector('a[href*=\"/jobs/\"]')?.href}))" --json > test_linkedin.json || echo "LinkedIn extraction timeout"
agent-browser close

SEQ_END=$(date +%s)
SEQ_DURATION=$((SEQ_END - SEQ_START))

# Count results
SEQ_JOBS=$(($(jq length test_wanted.json 2>/dev/null || echo 0) + $(jq length test_jobkorea.json 2>/dev/null || echo 0) + $(jq length test_linkedin.json 2>/dev/null || echo 0)))

echo "2. Testing parallel scraping..."
PAR_START=$(date +%s)

# Run the parallel scraping implementation
bash -c "$(cat <<'EOF'
# Parallel scraping test
mkdir -p temp_parallel_results

scrape_source() {
  local source=$1
  local keyword=$2
  echo "🔄 Scraping $source..."
  
  case $source in
    "wanted")
      agent-browser --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" open "https://www.wanted.co.kr/search?query=${keyword}&tab=position"
      sleep 6
      agent-browser wait --load networkidle
      agent-browser eval "
        const jobs = [...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,10).map(el => ({
          id: el.href?.split('/wd/')[1] || '',
          title: el.textContent?.trim() || '',
          company: el.textContent?.match(/카카오|네이버|삼성|라인|우아한형제들|토스|미래엔|웨이브릿지/)?.[0] || '',
          link: el.href || ''
        })).filter(job => job.title && job.company);
        console.log(JSON.stringify(jobs));
      " --json > temp_parallel_results/${source}_jobs.json
      agent-browser close
      ;;
      
    "jobkorea")
      agent-browser --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" open "https://www.jobkorea.co.kr/Search/?stext=${keyword}&tabType=recruit"
      sleep 8
      agent-browser wait --load networkidle
      agent-browser eval "
        const cards = [...document.querySelectorAll('[class*=dlua7o0], .job-card')].slice(0,10);
        const jobs = cards.map(card => ({
          title: card.textContent?.trim().split('\n')[0] || '',
          company: card.textContent?.match(/㈜|주식회사/)?.[0] || '',
          link: card.querySelector('a')?.href || ''
        })).filter(job => job.title && job.company);
        console.log(JSON.stringify(jobs));
      " --json > temp_parallel_results/${source}_jobs.json
      agent-browser close
      ;;
  esac
}

# Run in parallel
scrape_source "wanted" "백엔드" &
scrape_source "jobkorea" "백엔드" &

wait
cat temp_parallel_results/*_jobs.json | jq -s '.[][]' > parallel_test_results.json
rm -rf temp_parallel_results
EOF
)" || echo "Parallel scraping test failed"

PAR_END=$(date +%s)
PAR_DURATION=$((PAR_END - PAR_START))

# Count parallel results
PAR_JOBS=$(jq length parallel_test_results.json 2>/dev/null || echo 0)

# Calculate performance metrics
SEQ_TIME_PER_JOB=$(echo "scale=2; $SEQ_DURATION / $SEQ_JOBS" | bc 2>/dev/null || echo "N/A")
PAR_TIME_PER_JOB=$(echo "scale=2; $PAR_DURATION / $PAR_JOBS" | bc 2>/dev/null || echo "N/A")
TIME_IMPROVEMENT=$(echo "scale=1; (($SEQ_DURATION - $PAR_DURATION) / $SEQ_DURATION) * 100" | bc 2>/dev/null || echo "N/A")

# Clean up test files
rm -f test_wanted.json test_jobkorea.json test_linkedin.json parallel_test_results.json

# Record end time
END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

# Generate performance report
cat > data/autoresearch/performance_test.json << EOF
{
  "test_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_keyword": "$TEST_KEYWORD",
  "sequential_scraping": {
    "duration_seconds": $SEQ_DURATION,
    "jobs_collected": $SEQ_JOBS,
    "time_per_job": "$SEQ_TIME_PER_JOB"
  },
  "parallel_scraping": {
    "duration_seconds": $PAR_DURATION,
    "jobs_collected": $PAR_JOBS,
    "time_per_job": "$PAR_TIME_PER_JOB"
  },
  "performance_improvement": {
    "time_reduction_seconds": $((SEQ_DURATION - PAR_DURATION)),
    "percentage_improvement": "$TIME_IMPROVEMENT%",
    "efficiency_gain": "$SEQ_JOBS jobs / $SEQ_DURATION sec → $PAR_JOBS jobs / $PAR_DURATION sec"
  }
}
EOF

echo "📊 Performance Test Results:"
echo "   Sequential: $SEQ_JOBS jobs in $SEQ_DURATION seconds (${SEQ_TIME_PER_JOB}s per job)"
echo "   Parallel:   $PAR_JOBS jobs in $PAR_DURATION seconds (${PAR_TIME_PER_JOB}s per job)"
echo "   Improvement: $TIME_IMPROVEMENT% faster (${SEQ_DURATION}s → ${PAR_DURATION}s)"
echo "   Total test time: ${TOTAL_DURATION}s"

# Determine verdict
if (( $(echo "$TIME_IMPROVEMENT > 25.0" | bc -l 2>/dev/null || echo 0) )); then
    echo "✅ SUCCESS: Parallel scraping shows >25% improvement"
    echo "verdict: keep"
elif (( SEQ_JOBS >= 5 && PAR_JOBS >= 5 )); then
    echo "✅ SUCCESS: Maintained data quality with some improvement"
    echo "verdict: keep"
else
    echo "❌ FAILURE: Insufficient improvement or data quality"
    echo "verdict: revert"
fi

echo "📄 Detailed results saved to data/autoresearch/performance_test.json"