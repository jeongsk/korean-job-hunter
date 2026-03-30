#!/bin/bash

# Test Enhanced Scraping Agents
# Tests the enhanced scraping patterns against real Korean job sites

echo "🚀 Testing Enhanced Scraping Agents"
echo "Testing improved LinkedIn and JobKorea scraping patterns..."

# Test 1: Enhanced LinkedIn scraping
echo -e "\n=== Test 1: Enhanced LinkedIn Scraping ==="
timeout 30 bash -c '
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

echo "Testing LinkedIn with enhanced selectors..."
curl -s -A "$UA" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8" \
  "https://www.linkedin.com/jobs/search/?keywords=backend%20developer&location=South+Korea" | \
  grep -c "base-card\|job-search-card\|job-card"

if [ $? -eq 0 ]; then
  echo "✅ LinkedIn enhanced selectors found job cards"
else
  echo "❌ LinkedIn enhanced selectors failed"
fi
'

# Test 2: Enhanced JobKorea scraping
echo -e "\n=== Test 2: Enhanced JobKorea Scraping ==="
timeout 30 bash -c '
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

echo "Testing JobKorea with enhanced selectors..."
curl -s -m 15 -A "$UA" \
  "https://www.jobkorea.co.kr/Search/?stext=React%EA%B0%9C%EB%B0%9C%EC%9E%90&tabType=recruit" | \
  grep -c "dlua7o0\|job-card\|recruit-card"

if [ $? -eq 0 ]; then
  echo "✅ JobKorea enhanced selectors found job cards"
else
  echo "❌ JobKorea enhanced selectors failed"
fi
'

# Test 3: Performance comparison
echo -e "\n=== Test 3: Performance Comparison ==="
echo "Testing response times for both sites..."

# LinkedIn performance
linkedin_time=$(timeout 20 curl -o /dev/null -s -w "%{time_total}" \
  -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
  "https://www.linkedin.com/jobs/search/?keywords=developer&location=South+Korea")

# JobKorea performance  
jobkorea_time=$(timeout 20 curl -o /dev/null -s -w "%{time_total}" \
  -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
  "https://www.jobkorea.co.kr/Search/?stext=개발자&tabType=recruit")

echo "LinkedIn response time: ${linkedin_time}s"
echo "JobKorea response time: ${jobkorea_time}s"

# Test 4: Content quality check
echo -e "\n=== Test 4: Content Quality Check ==="
echo "Checking for job-related content in responses..."

# LinkedIn content check
linkedin_content=$(timeout 20 curl -s \
  -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome 131.0.0.0 Safari/537.36" \
  "https://www.linkedin.com/jobs/search/?keywords=developer&location=South+Korea")

if echo "$linkedin_content" | grep -qE "(job|position|career|title|company)"; then
  echo "✅ LinkedIn contains job-related content"
else
  echo "❌ LinkedIn missing job-related content"
fi

# JobKorea content check
jobkorea_content=$(timeout 20 curl -s \
  -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome 131.0.0.0 Safari/537.36" \
  "https://www.jobkorea.co.kr/Search/?stext=개발자&tabType=recruit")

if echo "$jobkorea_content" | grep -qE "(job|recruit|position|career|title|company)"; then
  echo "✅ JobKorea contains job-related content"
else
  echo "❌ JobKorea missing job-related content"
fi

echo -e "\n🎯 Enhanced scraping agents test completed!"
echo "Check results above for performance and quality improvements."