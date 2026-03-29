#!/bin/bash

# Test script for improved Wanted scraping logic v2
# This will validate the field completeness improvement

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome 131.0.0.0 Safari 537.36"

echo "Testing improved Wanted scraping logic v2..."

# Test with a simple backend search query
agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query=백엔드&tab=position"
sleep 5
agent-browser wait --load networkidle

# Test the improved parsing logic
agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,10).map(el => {
  const allText = (el.textContent || '').trim();
  const link = el.href;
  const wdId = link?.split('/wd/')[1] || '';
  
  // Parse fields step by step to avoid scope issues
  let result = { id: wdId, title: '', company: '', experience: '', reward: '', link: link, validation: {
    has_title: false, has_company: false, has_experience: false, has_reward: false, company_correct: false
  }};
  
  // Extract experience (경력 pattern)
  const expMatch = allText.match(/(경력)([\\d+~년↑무관\\s]*년?)/);
  if (expMatch) {
    result.experience = expMatch[0];
    result.validation.has_experience = true;
    // Remove experience from text for further parsing
    allText = allText.replace(expMatch[0], '').trim();
  }
  
  // Extract reward (보상/합격 + 금)
  const rewardMatch = allText.match(/(보상|합격).*금/);
  if (rewardMatch) {
    result.reward = rewardMatch[0];
    result.validation.has_reward = true;
    // Remove reward from text for further parsing
    allText = allText.replace(rewardMatch[0], '').trim();
  }
  
  // Extract company (remaining text that doesn't contain job keywords)
  const companyCandidates = allText.match(/((?:㈜|주식회사)[^\\s,\\d년경력보상합격]*)|([^\\s,\\d년경력보상합격]{2,}(?:사|주식회사|corp|Corp|\\.com|\\.kr))/);
  if (companyCandidates) {
    // Take the longer match that's more likely to be a company name
    result.company = companyCandidates[0] || companyCandidates[1] || '';
    result.validation.has_company = true;
    result.validation.company_correct = !result.company.match(/경력|보상|합격|\\d+년/);
    // Remove company from text for title extraction
    allText = allText.replace(result.company, '').trim();
  }
  
  // Title is the remaining text (or what's left after removing company)
  result.title = allText.trim() || '';
  result.validation.has_title = !!result.title;
  
  // Clean up title by removing location info like [부산/경력 5년 이상]
  result.title = result.title.replace(/^\\[.*?\\]\\s*/, '').trim();
  
  return {
    id: result.id,
    title: result.title,
    company: result.company,
    experience: result.experience,
    reward: result.reward,
    link: result.link,
    validation: result.validation
  };
})" --json > data/autoresearch/experiment-009/improved_scraping_test_v2.json

agent-browser close

echo "Test completed. Results saved to data/autoresearch/experiment-009/improved_scraping_test_v2.json"

# Calculate field completeness
echo "Analyzing results..."
if [ -f "data/autoresearch/experiment-009/improved_scraping_test_v2.json" ]; then
    total_jobs=$(jq length data/autoresearch/experiment-009/improved_scraping_test_v2.json)
    complete_fields=$(jq '[.[] | select(.validation.has_title and .validation.has_company and .validation.has_experience)] | length' data/autoresearch/experiment-009/improved_scraping_test_v2.json)
    correct_companies=$(jq '[.[] | select(.validation.company_correct)] | length' data/autoresearch/experiment-009/improved_scraping_test_v2.json)
    
    echo "=== RESULTS ==="
    echo "Total jobs scraped: $total_jobs"
    echo "Fields complete (title+company+experience): $complete_fields"
    echo "Correct company names: $correct_companies"
    
    if [ "$total_jobs" -gt 0 ]; then
        completeness_rate=$(echo "scale=2; $complete_fields * 100 / $total_jobs" | bc)
        company_accuracy=$(echo "scale=2; $correct_companies * 100 / $total_jobs" | bc)
        echo "Field completeness rate: ${completeness_rate}%"
        echo "Company accuracy: ${company_accuracy}%"
        
        # Show sample results
        echo -e "\n=== SAMPLE RESULTS ==="
        jq -r '.[] | "\(.title[:50])... | \(.company) | \(.experience) | \(.reward)"' data/autoresearch/experiment-009/improved_scraping_test_v2.json | head -3
    fi
fi