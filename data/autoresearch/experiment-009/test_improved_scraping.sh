#!/bin/bash

# Test script for improved Wanted scraping logic
# This will validate the field completeness improvement

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

echo "Testing improved Wanted scraping logic..."

# Test with a simple backend search query
agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query=백엔드&tab=position"
sleep 5
agent-browser wait --load networkidle

# Test the improved parsing logic
agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,10).map(el => {
  const allText = (el.textContent || '').trim();
  const parts = allText.split(/\\n/).map(s => s.trim()).filter(Boolean);
  const link = el.href;
  const wdId = link?.split('/wd/')[1] || '';
  
  // Extract title (usually first part)
  const title = parts[0] || '';
  
  // Find company name (exclude 경력, 보상, year patterns)
  const company = parts.find(p => {
    return p && !p.match(/경력|보상|합격|\\d+년|\\d+~\\d+년|무관/) && p.length > 1;
  }) || '';
  
  // Extract experience and reward
  const experience = parts.find(p=>p.match(/경력(무관|\\d+년↑|\\d+~\\d+년)/)) || '';
  const reward = parts.find(p=>p.match(/(보상|합격).*금/)) || '';
  
  return {
    id: wdId,
    title: title,
    company: company,
    experience: experience,
    reward: reward,
    link: link,
    all_texts: parts,
    validation: {
      has_title: !!title,
      has_company: !!company,
      has_experience: !!experience,
      has_reward: !!reward,
      company_correct: !company.match(/경력|보상|합격|\\d+년/)
    }
  };
})" --json > data/autoresearch/experiment-009/improved_scraping_test.json

agent-browser close

echo "Test completed. Results saved to data/autoresearch/experiment-009/improved_scraping_test.json"

# Calculate field completeness
echo "Analyzing results..."
if [ -f "data/autoresearch/experiment-009/improved_scraping_test.json" ]; then
    total_jobs=$(jq length data/autoresearch/experiment-009/improved_scraping_test.json)
    complete_fields=$(jq '[.[] | select(.validation.has_title and .validation.has_company and .validation.has_experience)] | length' data/autoresearch/experiment-009/improved_scraping_test.json)
    correct_companies=$(jq '[.[] | select(.validation.company_correct)] | length' data/autoresearch/experiment-009/improved_scraping_test.json)
    
    echo "=== RESULTS ==="
    echo "Total jobs scraped: $total_jobs"
    echo "Fields complete (title+company+experience): $complete_fields"
    echo "Correct company names: $correct_companies"
    
    if [ "$total_jobs" -gt 0 ]; then
        completeness_rate=$(echo "scale=2; $complete_fields * 100 / $total_jobs" | bc)
        company_accuracy=$(echo "scale=2; $correct_companies * 100 / $total_jobs" | bc)
        echo "Field completeness rate: ${completeness_rate}%"
        echo "Company accuracy: ${company_accuracy}%"
    fi
fi