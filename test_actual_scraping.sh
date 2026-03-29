#!/bin/bash

# Test Enhanced Scraping Workflow
echo "🚀 Testing Enhanced Scraping Workflow with Company Extraction..."
echo "=============================================================="

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

echo "📋 Testing Wanted.co.kr scraping with enhanced company extraction..."

# Test the actual scraping workflow
agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query=백엔드&tab=position" > /tmp/wanted_scraping.log 2>&1
sleep 8
agent-browser wait --load networkidle >> /tmp/wanted_scraping.log 2>&1

# Enhanced extraction with our improved logic
agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,10).map(el => {
  // Helper function to escape regex special characters
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  const allText = (el.textContent || '').trim();
  const link = el.href;
  const wdId = link?.split('/wd/')[1] || '';
  
  let result = { id: wdId, title: '', company: '', experience: '', reward: '', link: link };
  let workingText = allText;
  
  // Step 1: Location removal
  workingText = workingText
    .replace(/\[.*?\]/g, '')  // Remove [location] patterns
    .replace(/\//g, '')         // Remove standalone slashes
    .trim();
  
  // Step 2: Experience extraction
  const expMatch = workingText.match(/경력[\s]*(\d+~\d+년|\d+년 이상|\d+년↑|무관)/);
  if (expMatch) {
    result.experience = '경력 ' + expMatch[1];
    workingText = workingText.replace(expMatch[0], ' ').trim();
  }
  
  // Step 3: Reward extraction
  const rewardMatch = workingText.match(/(보상금|합격금)[\s]*(\d+만원)/);
  if (rewardMatch) {
    result.reward = rewardMatch[0];
    workingText = workingText.replace(rewardMatch[0], ' ').trim();
  }
  
  // Step 4: Enhanced company extraction
  let companyMatch = null;
  
  // Strategy 1: Traditional Korean company indicators
  const koreanIndicators = ['㈜', '주식회사', '유한회사', '법인', '특수법인', '협동조합'];
  for (const indicator of koreanIndicators) {
    const pattern = new RegExp(\`${indicator}[\\s]*([^\\s,]+(?:\\s[^\\s,]+)?)\`);
    const match = workingText.match(pattern);
    if (match && match[1]) {
      companyMatch = match[1].trim();
      break;
    }
  }
  
  // Strategy 2: Comprehensive Korean company name list
  if (!companyMatch) {
    const koreanCompanies = [
      '카카오', '네이버', '삼성', '라인', '우아한형제들', '배달의민족', '토스',
      '우아한', '당근마켓', '크몽', '야놀자', '마이플레이스', '지엠소프트',
      '한컴', '네오위즈', '넥슨', '엔씨소프트', '엘림스', '더존', '원스톱',
      '키움', '미래엔', '웨이브릿지', '트리노드', '페칭', '케이투스코리아',
      '비댁스', '에버온', '코어셀', '키트웍스'
    ];
    
    for (const company of koreanCompanies) {
      const pattern = new RegExp(\`${company}(?=[경능명년]|$)\`);
      const match = workingText.match(pattern);
      if (match) {
        companyMatch = company;
        workingText = workingText.replace(new RegExp(escapeRegExp(company), 'g'), ' ').trim();
        break;
      }
    }
  }
  
  // Apply company extraction result
  if (companyMatch) {
    result.company = companyMatch;
  } else {
    result.company = '회사명 미상';
  }
  
  // Step 5: Title extraction
  const titleText = workingText
    .replace(/[,·\s]+/g, ' ')
    .trim();
  
  if (titleText) {
    result.title = titleText;
  } else {
    result.title = '직무 미상';
  }
  
  return result;
})" --json > /tmp/enhanced_wanted_results.json

# Close browser
agent-browser close >> /tmp/wanted_scraping.log 2>&1

# Analyze results
echo "📊 Enhanced Scraping Results:"
echo "============================="

if [ -f "/tmp/enhanced_wanted_results.json" ]; then
  echo "✅ Successfully extracted $(jq length /tmp/enhanced_wanted_results.json) job listings"
  
  echo ""
  echo "🔍 Sample Results:"
  echo "=================="
  jq -r '.[] | "\(.id): \(.title) | \(.company) | \(.experience) | \(.reward)"' /tmp/enhanced_wanted_results.json | head -5
  
  echo ""
  echo "📈 Field Completeness Analysis:"
  echo "=============================="
  
  total_jobs=$(jq length /tmp/enhanced_wanted_results.json)
  companies_with_names=$(jq '[.[] | select(.company != "회사명 미상")] | length' /tmp/enhanced_wanted_results.json)
  companies_with_experience=$(jq '[.[] | select(.experience != "")] | length' /tmp/enhanced_wanted_results.json)
  companies_with_reward=$(jq '[.[] | select(.reward != "")] | length' /tmp/enhanced_wanted_results.json)
  
  echo "Total jobs: $total_jobs"
  echo "Companies with names: $companies_with_names ($((companies_with_names * 100 / total_jobs))%)"
  echo "Companies with experience: $companies_with_experience ($((companies_with_experience * 100 / total_jobs))%)"
  echo "Companies with rewards: $companies_with_reward ($((companies_with_reward * 100 / total_jobs))%)"
  
  # Check if we achieved our goal of 70%+ field completeness
  completeness=$((companies_with_names * 100 / total_jobs))
  if [ $completeness -ge 70 ]; then
    echo ""
    echo "🎉 SUCCESS: Field completeness of ${completeness}% meets our 70%+ goal!"
  else
    echo ""
    echo "⚠️ INCOMPLETE: Field completeness of ${completeness}% is below our 70% goal"
  fi
  
else
  echo "❌ Failed to extract results"
  if [ -f "/tmp/wanted_scraping.log" ]; then
    echo "📋 Error log:"
    tail -10 /tmp/wanted_scraping.log
  fi
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -f /tmp/wanted_scraping.log /tmp/enhanced_wanted_results.json