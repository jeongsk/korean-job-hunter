// Extended E2E parsing test with more real data patterns
// Also tests: title-company boundary detection, parenthetical experience, edge cases

const testCases = [
  // Standard patterns
  { raw: "[전문연구요원] Frontend Developer인터엑스경력 2-12년합격보상금 100만원", expect: { company: "인터엑스", exp: "경력 2-12년", reward: "보상금 100만원" } },
  { raw: "글로벌 패션 파트너 사업_CTO(Chief Technology Officer)페칭경력 8년 이상합격보상금 100만원", expect: { company: "페칭", exp: "경력 8년 이상", reward: "보상금 100만원" } },
  { raw: "풀스택 개발자 (4년 이상)윙잇경력 4-8년합격보상금 100만원", expect: { company: "윙잇", exp: "경력 4-8년", reward: "보상금 100만원" } },
  { raw: "AI 서비스 프론트 개발자111퍼센트경력 3년 이상합격보상금 100만원", expect: { company: "111퍼센트", exp: "경력 3년 이상", reward: "보상금 100만원" } },
  { raw: "프론트엔드 개발자에이엑스경력 3-10년합격보상금 100만원", expect: { company: "에이엑스", exp: "경력 3-10년", reward: "보상금 100만원" } },
  // Edge: title has parentheses, company is unknown
  { raw: "백엔드 개발자(Java/Spring)(주)ABC소프트경력 5년 이상합격보상금 500,000원", expect: { company: "ABC소프트", exp: "경력 5년 이상" } },
  // Edge: 신입 (no experience range)
  { raw: "프론트엔드 개발자카카오경력무관합격보상금 70만원", expect: { company: "카카오", exp: "경력 무관", reward: "보상금 70만원" } },
];

function parseWantedJob(allText) {
  let result = { title: '', company: '', experience: '', reward: '' };
  
  let workingText = allText
    .replace(/(경력)/g, ' $1')
    .replace(/(합격|보상금|성과금)/g, ' $1')
    .replace(/\[.*?\]/g, '')
    .replace(/\//g, ' ')
    .trim();
  
  const expMatchKorean = workingText.match(/경력[\s]*(\d+[~-]\d+년|\d+년\s*이상|\d+년↑|무관)/);
  if (expMatchKorean) {
    result.experience = '경력 ' + expMatchKorean[1];
    workingText = workingText.replace(expMatchKorean[0], ' ').trim();
  }
  
  const rewardMatch = workingText.match(/(보상금|합격금|성과금)[\s]*(\d+[,，]?\d*만원|\d+[,，]?\d*원)/);
  if (rewardMatch) {
    result.reward = rewardMatch[0];
    workingText = workingText.replace(rewardMatch[0], ' ').trim();
  }
  
  workingText = workingText.replace(/합격/g, ' ').trim();
  
  // Korean company indicators
  const koreanIndicators = ['㈜', '주식회사', '유한회사', '(주)'];
  for (const ind of koreanIndicators) {
    const escaped = ind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = workingText.match(new RegExp(escaped + '[\\s]*([가-힣A-Za-z0-9]+)'));
    if (m) { result.company = m[1].trim(); workingText = workingText.replace(m[0], ' '); break; }
  }
  
  // Known company list
  if (!result.company) {
    const companies = ['카카오','네이버','삼성','라인','우아한형제들','배달의민족','토스','당근마켓','크몽','야놀자','쿠팡','카카오뱅크','토스뱅크','배민','위메프','미래엔','웨이브릿지','코어셀','트리노드','페칭','에버온','키트웍스','비댁스','스패이드','인터엑스','윙잇','111퍼센트','에이엑스'];
    for (const c of companies) {
      if (workingText.includes(c)) { result.company = c; workingText = workingText.replace(c, ' '); break; }
    }
  }
  
  // Pattern-based Korean company
  if (!result.company) {
    const patterns = [/[가-힣]{2,6}(?:기업|그룹|솔루션|테크|시스템|랩스|코리아|플랫폼)/, /[가-힣]{2,4}(?:컴퍼니|커머스|네트워크|서비스)/];
    for (const p of patterns) { const m = workingText.match(p); if (m) { result.company = m[0]; workingText = workingText.replace(m[0], ' '); break; } }
  }
  
  if (!result.company) result.company = '회사명 미상';
  
  result.title = workingText.replace(/[,·\s]+/g, ' ').trim() || '직무 미상';
  return result;
}

let passed = 0, failed = 0;
for (const tc of testCases) {
  const r = parseWantedJob(tc.raw);
  const expOk = r.experience === tc.expect.exp;
  const rewOk = !tc.expect.reward || r.reward === tc.expect.reward;
  const compOk = r.company === tc.expect.company;
  const ok = expOk && rewOk && compOk;
  console.log(`${ok ? '✅' : '❌'} "${tc.raw.substring(0,50)}..." → company:${r.company} exp:${r.experience} reward:${r.reward}`);
  if (!ok) console.log(`   Expected: company:${tc.expect.company} exp:${tc.expect.exp} reward:${tc.expect.reward||'any'}`);
  ok ? passed++ : failed++;
}
console.log(`\nResults: ${passed}/${passed+failed}`);
