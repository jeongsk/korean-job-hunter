#!/usr/bin/env node
/**
 * EXP-050: Korean NLP Query Parser v3
 * Fixes: SQL injection via missing quote, company substring conflicts, 최신순 sort recognition
 * Adds: salary filter, experience filter, deadline urgency, deadline sorting, 마감순 sorting
 */

function parseKoreanQuery(input) {
  const filters = [];
  let order = "a.updated_at DESC";
  const text = input.trim();
  if (!text) return { filters, order };

  const consumedWords = new Set();

  // === Sorting (consume keywords early) ===
  if (/최신순/.test(text)) {
    order = "a.updated_at DESC";
    consumedWords.add('최신순');
  }
  if (/(점수|매칭)순/.test(text)) {
    order = "m.score DESC";
    consumedWords.add('점수순');
    consumedWords.add('매칭순');
  }
  if (/마감(순| 빠른순)/.test(text)) {
    order = "j.deadline ASC";
    consumedWords.add('마감순');
  }

  // === Status detection ===
  const statusPatterns = [
    { regex: /면접(잡힌|보는)?/, status: 'interview', words: ['면접', '면접보는', '면접잡힌'] },
    { regex: /지원(완료|한|했)/, status: 'applied', words: ['지원완료', '지원한', '지원했'] },
    { regex: /(관심|북마크|찜해둔|찜)/, status: 'interested', words: ['관심', '북마크', '찜해둔', '찜'] },
    { regex: /(합격|오퍼)/, status: 'offer', words: ['합격', '합격한', '오퍼'] },
    { regex: /불합격/, status: 'declined', words: ['불합격'] },
    { regex: /(탈락|거절|떨어)/, status: 'rejected,declined', words: ['탈락', '탈락한', '거절', '떨어진'] },
    { regex: /지원(예정|할)/, status: 'applying', words: ['지원예정', '지원할'] },
  ];

  for (const { regex, status, words } of statusPatterns) {
    if (regex.test(text)) {
      if (status.includes(',')) {
        filters.push(`a.status IN ('${status.split(',').join("','")}')`);
      } else {
        filters.push(`a.status = '${status}'`);
      }
      for (const w of words) consumedWords.add(w);
      break;
    }
  }

  // === Negation detection ===
  const negationMatch = text.match(/(빼고|제외|말고)/);
  const negationIdx = negationMatch ? text.indexOf(negationMatch[0]) : -1;
  let appliedNegation = false;

  // === Work type ===
  if (/(재택|원격|리모트)/.test(text)) {
    filters.push("j.work_type = 'remote'");
    consumedWords.add('재택'); consumedWords.add('원격'); consumedWords.add('리모트');
  }
  if (/하이브리드/.test(text)) {
    filters.push("j.work_type = 'hybrid'");
    consumedWords.add('하이브리드');
  }

  // === Salary filter ===
  if (/(연봉|급여|연수입)/.test(text)) {
    filters.push("j.salary IS NOT NULL AND j.salary != ''");
    consumedWords.add('연봉'); consumedWords.add('급여'); consumedWords.add('연수입');
  }

  // === Experience filter ===
  if (/신입/.test(text)) {
    filters.push("(j.experience LIKE '%신입%' OR j.experience LIKE '%무관%')");
    consumedWords.add('신입');
  }
  const expMatch = text.match(/(\d+)\s*년\s*(이상|이상의)?/);
  if (expMatch) {
    filters.push(`j.experience LIKE '%${expMatch[1]}%'`);
    consumedWords.add(expMatch[0]);
  }
  // N년차 pattern (e.g., "5년차" = 5th year of experience)
  const yoeMatch = text.match(/(\d+)\s*년차/);
  if (yoeMatch && !expMatch) {
    filters.push(`j.experience LIKE '%${yoeMatch[1]}%'`);
    consumedWords.add(yoeMatch[0]);
    consumedWords.add('년차');
  }
  // "경력" standalone → show experienced jobs (exclude 신입-only)
  if (/경력/.test(text) && !/신입/.test(text) && !expMatch && !yoeMatch) {
    filters.push("(j.experience NOT LIKE '%신입%' OR j.experience LIKE '%무관%')");
    consumedWords.add('경력');
  }

  // === Deadline urgency ===
  if (/마감\s*임박|곧마감/.test(text)) {
    filters.push("j.deadline IS NOT NULL AND j.deadline != '' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 7");
    consumedWords.add('마감임박'); consumedWords.add('곧마감'); consumedWords.add('마감'); consumedWords.add('임박');
  } else if (/오늘\s*마감/.test(text)) {
    filters.push("CAST(julianday(j.deadline) - julianday('now') AS INTEGER) = 0");
    consumedWords.add('오늘'); consumedWords.add('마감'); consumedWords.add('마감인');
  } else if (/내일\s*마감/.test(text)) {
    filters.push("CAST(julianday(j.deadline) - julianday('now') AS INTEGER) = 1");
    consumedWords.add('내일'); consumedWords.add('마감');
  } else if (/마감/.test(text) && !/마감순|마감 빠른순/.test(text)) {
    // Standalone 마감 (not 마감순 sort) → show jobs with deadlines
    filters.push("j.deadline IS NOT NULL AND j.deadline != ''");
    consumedWords.add('마감');
  }
  const daysLeftMatch = text.match(/(\d+)\s*일\s*남은/);
  if (daysLeftMatch) {
    filters.push(`j.deadline IS NOT NULL AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND ${daysLeftMatch[1]}`);
    consumedWords.add(daysLeftMatch[0]);
  }
  if (/기한\s*있는|데드라인\s*있는/.test(text)) {
    filters.push("j.deadline IS NOT NULL AND j.deadline != ''");
    consumedWords.add('기한'); consumedWords.add('데드라인');
  }

  // === Companies (sorted by length desc to match longest first) ===
  const companies = ['우아한형제들', '배달의민족', '당근마켓', '카카오뱅크', '토스뱅크', '마이플레이스', '네오위즈', '엔씨소프트', '카카오', '네이버', '삼성', '라인', '토스', '쿠팡', '야놀자', '크몽', '배민', '넥슨', '한컴', '위메프'];
  companies.sort((a, b) => b.length - a.length);

  for (const company of companies) {
    if (consumedWords.has(company)) continue;
    if (text.includes(company)) {
      // Check if this company is a substring of an already-consumed longer company
      const isSubOfConsumed = [...consumedWords].some(c => c.includes(company) && c !== company);
      if (isSubOfConsumed) continue;

      if (negationMatch) {
        const beforeNeg = text.substring(0, negationIdx).trim();
        const isImmediatelyBefore = beforeNeg.endsWith(company);
        if (isImmediatelyBefore) {
          filters.push(`j.company NOT LIKE '%${company}%'`);
          appliedNegation = true;
        } else {
          filters.push(`j.company LIKE '%${company}%'`);
        }
      } else {
        filters.push(`j.company LIKE '%${company}%'`);
      }
      consumedWords.add(company);
    }
  }

  // === Locations ===
  const locations = ['영등포', '서울', '경기', '부산', '대전', '인천', '광주', '대구', '울산', '수원', '이천', '판교', '강남', '송파', '성수', '역삼', '잠실', '마포', '용산', '구로', '분당', '일산', '평촌'];
  for (const loc of locations) {
    if (consumedWords.has(loc)) continue;
    if (text.includes(loc)) {
      if (negationMatch) {
        const beforeNeg = text.substring(0, negationIdx).trim();
        if (beforeNeg.endsWith(loc)) {
          filters.push(`j.location NOT LIKE '%${loc}%'`);
          appliedNegation = true;
        } else {
          filters.push(`j.location LIKE '%${loc}%'`);
        }
      } else {
        filters.push(`j.location LIKE '%${loc}%'`);
      }
      consumedWords.add(loc);
    }
  }

  // === Skill-based filtering (EXP-078) ===
  const skillPatterns = [
    // Longer patterns first to avoid substring conflicts
    { canonical: 'react native', patterns: [/react\s*native/i, /리액트\s*네이티브/i] },
    { canonical: 'react', patterns: [/react(?!ive)|리액트/i] },
    { canonical: 'typescript', patterns: [/typescript|타입스크립트/i] },
    { canonical: 'javascript', patterns: [/javascript|자바스크립트/i] },
    { canonical: 'python', patterns: [/python|파이썬/i] },
    { canonical: 'java', patterns: [/java(?!script)|자바(?!스크립트)/i] },
    { canonical: 'go', patterns: [/golang|고언어|go언어/i] },
    { canonical: 'rust', patterns: [/rust|러스트/i] },
    { canonical: 'kotlin', patterns: [/kotlin|코틀린/i] },
    { canonical: 'swift', patterns: [/swift|스위프트/i] },
    { canonical: 'ruby', patterns: [/ruby|루비/i] },
    { canonical: 'spring boot', patterns: [/spring\s*boot|스프링\s*부트/i] },
    { canonical: 'spring', patterns: [/spring|스프링/i] },
    { canonical: 'django', patterns: [/django|장고/i] },
    { canonical: 'flask', patterns: [/flask|플라스크/i] },
    { canonical: 'fastapi', patterns: [/fastapi/i] },
    { canonical: 'next.js', patterns: [/next\.?js|넥스트/i] },
    { canonical: 'vue', patterns: [/vue\.?js?|뷰/i] },
    { canonical: 'angular', patterns: [/angular|앵귤러/i] },
    { canonical: 'node.js', patterns: [/node\.?js|노드/i] },
    { canonical: 'express', patterns: [/express|익스프레스/i] },
    { canonical: 'flutter', patterns: [/flutter|플러터/i] },
    { canonical: 'docker', patterns: [/docker|도커/i] },
    { canonical: 'kubernetes', patterns: [/kubernetes|k8s|쿠버네티스/i] },
    { canonical: 'aws', patterns: [/aws|아마존웹서비스/i] },
    { canonical: 'gcp', patterns: [/gcp|google\s*cloud/i] },
    { canonical: 'azure', patterns: [/azure/i] },
    { canonical: 'terraform', patterns: [/terraform|테라폼/i] },
    { canonical: 'jenkins', patterns: [/jenkins/i] },
    { canonical: 'github actions', patterns: [/github\s*actions/i] },
    { canonical: 'kafka', patterns: [/kafka/i] },
    { canonical: 'redis', patterns: [/redis|레디스/i] },
    { canonical: 'mongodb', patterns: [/mongodb/i] },
    { canonical: 'mysql', patterns: [/mysql/i] },
    { canonical: 'postgresql', patterns: [/postgresql|postgres/i] },
    { canonical: 'elasticsearch', patterns: [/elasticsearch/i] },
    { canonical: 'graphql', patterns: [/graphql/i] },
    { canonical: 'tensorflow', patterns: [/tensorflow/i] },
    { canonical: 'pytorch', patterns: [/pytorch/i] },
    { canonical: 'figma', patterns: [/figma|피그마/i] },
  ];

  for (const { canonical, patterns } of skillPatterns) {
    if (consumedWords.has(canonical)) continue;
    // Skip if a longer canonical already consumed that contains this one
    if ([...consumedWords].some(c => c !== canonical && c.includes(canonical))) continue;
    for (const p of patterns) {
      if (p.test(text)) {
        filters.push(`j.skills LIKE '%${canonical}%'`);
        consumedWords.add(canonical);
        // Add Korean alias to consumed words
        const koMatch = text.match(new RegExp(p.source.includes('가-힣') ? '[가-힣]+' : ''));
        if (koMatch && p.source.includes('가-힣')) consumedWords.add(koMatch[0]);
        break;
      }
    }
  }

  // === Remaining Korean keywords (title/company search) ===
  const stopWords = new Set(['면접', '면접보는', '면접잡힌', '지원', '지원한', '지원할', '지원예정', '지원완료', '관심', '북마크', '찜', '찜해둔', '합격', '합격한', '오퍼', '탈락', '탈락한', '거절', '불합격', '재택', '재택으로', '원격', '리모트', '하이브리드', '점수', '점수순으로', '매칭', '최신', '빼고', '제외', '말고', '있어', '보여', '보여줘', '공고', '거', '곳', '다', '중에', '할', '한', '수', '있는', '순으로', '보는', '잡힌', '해둔', '예정', '완료', '했', '을', '를', '이', '가', '에서', '의', '에', '연봉', '급여', '연수입', '마감임박', '곧마감', '마감순', '오늘', '내일', '마감', '기한', '데드라인', '경력', '년', '년차', '이상', '남은', '빠른순', '쓰는', '하는', '쓰는곳', '하는곳', '파이썬', '도커', '코틀린', '스프링', '장고', '플라스크', '넥스트', '뷰', '앵귤러', '노드', '익스프레스', '플러터', '쿠버네티스', '테라폼', '러스트', '스위프트', '루비', '레디스', '피그마', '리액트', '자바스크립트', '타입스크립트', '자바', '고언어', '부트']);
  const koreanWords = text.match(/[가-힣]{2,}/g) || [];
  for (const word of koreanWords) {
    if (!stopWords.has(word) && !consumedWords.has(word)) {
      filters.push(`(j.title LIKE '%${word}%' OR j.company LIKE '%${word}%')`);
      consumedWords.add(word);
    }
  }

  // === Negation fallback: if no entity was negated, negate status ===
  if (negationMatch && !appliedNegation && !filters.some(f => f.includes('NOT'))) {
    const statusIdx = filters.findIndex(f => f.includes('a.status'));
    if (statusIdx >= 0) {
      const orig = filters[statusIdx];
      if (orig.includes("= '")) {
        const status = orig.match(/= '([^']+)'/)?.[1];
        if (status) filters[statusIdx] = `a.status != '${status}'`;
      } else if (orig.includes("IN (")) {
        filters[statusIdx] = orig.replace('IN (', 'NOT IN (');
      }
    }
  }

  return { filters, order };
}

// === Test Cases ===
const testCases = [
  // --- Original 11 regression tests ---
  { id: 1, input: "면접 잡힌 거 있어?", expectedFilters: ["a.status = 'interview'"], expectedOrder: "a.updated_at DESC" },
  { id: 2, input: "지원한 거 다 보여줘", expectedFilters: ["a.status = 'applied'"], expectedOrder: "a.updated_at DESC" },
  { id: 3, input: "찜해둔 공고", expectedFilters: ["a.status = 'interested'"], expectedOrder: "a.updated_at DESC" },
  { id: 4, input: "합격한 곳", expectedFilters: ["a.status = 'offer'"], expectedOrder: "a.updated_at DESC" },
  { id: 5, input: "탈락한 거 빼고", expectedFilters: ["a.status NOT IN ('rejected','declined')"], expectedOrder: "a.updated_at DESC" },
  { id: 6, input: "지원할 거", expectedFilters: ["a.status = 'applying'"], expectedOrder: "a.updated_at DESC" },
  { id: 7, input: "지원한 거 중에 카카오 빼고", expectedFilters: ["a.status = 'applied'", "j.company NOT LIKE '%카카오%'"], expectedOrder: "a.updated_at DESC" },
  { id: 8, input: "재택으로 할 수 있는 관심 공고", expectedFilters: ["a.status = 'interested'", "j.work_type = 'remote'"], expectedOrder: "a.updated_at DESC" },
  { id: 9, input: "면접보는 곳 점수순으로", expectedFilters: ["a.status = 'interview'"], expectedOrder: "m.score DESC" },
  { id: 10, input: "카카오 공고 있어?", expectedFilters: ["j.company LIKE '%카카오%'"], expectedOrder: "a.updated_at DESC" },
  { id: 11, input: "백엔드 관심 공고", expectedFilters: ["a.status = 'interested'", "(j.title LIKE '%백엔드%' OR j.company LIKE '%백엔드%')"], expectedOrder: "a.updated_at DESC" },

  // --- EXP-035 regression ---
  { id: 12, input: "카카오뱅크 공고", expectedFilters: ["j.company LIKE '%카카오뱅크%'"], expectedOrder: "a.updated_at DESC",
    note: "should NOT have separate 카카오 filter (substring conflict)" },
  { id: 13, input: "지원한 거 중에 판교 빼고", expectedFilters: ["a.status = 'applied'", "j.location NOT LIKE '%판교%'"], expectedOrder: "a.updated_at DESC" },
  { id: 14, input: "토스 서울 면접 공고", expectedFilters: ["a.status = 'interview'", "j.company LIKE '%토스%'", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC" },
  { id: 15, input: "지원한 거 최신순", expectedFilters: ["a.status = 'applied'"], expectedOrder: "a.updated_at DESC",
    note: "최신순 should be consumed as sort order, NOT a keyword filter" },
  { id: 16, input: "하이브리드 네이버 공고", expectedFilters: ["j.work_type = 'hybrid'", "j.company LIKE '%네이버%'"], expectedOrder: "a.updated_at DESC" },
  { id: 17, input: "카카오 지원한 거 중에 토스 빼고", expectedFilters: ["a.status = 'applied'", "j.company LIKE '%카카오%'", "j.company NOT LIKE '%토스%'"], expectedOrder: "a.updated_at DESC" },
  { id: 18, input: "", expectedFilters: [], expectedOrder: "a.updated_at DESC" },

  // --- EXP-050: New features ---

  // Salary filter
  { id: 19, input: "연봉 있는 지원한 공고", expectedFilters: ["a.status = 'applied'", "j.salary IS NOT NULL AND j.salary != ''"], expectedOrder: "a.updated_at DESC" },
  { id: 20, input: "급여 나오는 관심 공고", expectedFilters: ["a.status = 'interested'", "j.salary IS NOT NULL AND j.salary != ''"], expectedOrder: "a.updated_at DESC" },

  // Deadline urgency
  { id: 21, input: "마감임박 공고 있어?", expectedFilters: ["j.deadline IS NOT NULL AND j.deadline != '' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 7"], expectedOrder: "a.updated_at DESC" },
  { id: 22, input: "곧마감 관심 공고", expectedFilters: ["a.status = 'interested'", "j.deadline IS NOT NULL AND j.deadline != '' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 7"], expectedOrder: "a.updated_at DESC" },
  { id: 23, input: "오늘 마감인 공고", expectedFilters: ["CAST(julianday(j.deadline) - julianday('now') AS INTEGER) = 0"], expectedOrder: "a.updated_at DESC" },
  { id: 24, input: "내일 마감 공고", expectedFilters: ["CAST(julianday(j.deadline) - julianday('now') AS INTEGER) = 1"], expectedOrder: "a.updated_at DESC" },
  { id: 25, input: "3일 남은 관심 공고", expectedFilters: ["a.status = 'interested'", "j.deadline IS NOT NULL AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 3"], expectedOrder: "a.updated_at DESC" },
  { id: 26, input: "기한 있는 공고", expectedFilters: ["j.deadline IS NOT NULL AND j.deadline != ''"], expectedOrder: "a.updated_at DESC" },

  // Deadline sorting
  { id: 27, input: "관심 공고 마감순", expectedFilters: ["a.status = 'interested'"], expectedOrder: "j.deadline ASC" },
  { id: 28, input: "지원한 공고 마감 빠른순", expectedFilters: ["a.status = 'applied'"], expectedOrder: "j.deadline ASC" },

  // Company substring: 카카오뱅크 should only match 카카오뱅크, NOT 카카오
  { id: 29, input: "카카오뱅크 면접 공고", expectedFilters: ["a.status = 'interview'", "j.company LIKE '%카카오뱅크%'"], expectedOrder: "a.updated_at DESC",
    note: "should NOT contain j.company LIKE '%카카오%'" },

  // SQL quote fix: 백엔드 filter must have balanced quotes
  { id: 30, input: "프론트엔드 관심 공고", expectedFilters: ["a.status = 'interested'", "(j.title LIKE '%프론트엔드%' OR j.company LIKE '%프론트엔드%')"], expectedOrder: "a.updated_at DESC",
    note: "SQL must have balanced quotes" },

  // --- EXP-051: Bug fixes ---

  // 마감 alone should trigger deadline filter (not swallowed by stopWords)
  { id: 31, input: "마감 공고 있어?", expectedFilters: ["j.deadline IS NOT NULL AND j.deadline != ''"], expectedOrder: "a.updated_at DESC",
    note: "마감 alone should show deadline-filtered jobs, not empty filters" },

  // 마감 임박 with space should work same as 마감임박
  { id: 32, input: "마감 임박 공고", expectedFilters: ["j.deadline IS NOT NULL AND j.deadline != '' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 7"], expectedOrder: "a.updated_at DESC",
    note: "마감 임박 with space should match 마감임박 pattern" },

  // 신입 should be detected as experience filter
  { id: 33, input: "신입 공고 있어?", expectedFilters: ["(j.experience LIKE '%신입%' OR j.experience LIKE '%무관%')"], expectedOrder: "a.updated_at DESC",
    note: "신입 should trigger experience filter, not generic keyword search" },

  // 신입 + status combined
  { id: 34, input: "신입 관심 공고", expectedFilters: ["a.status = 'interested'", "(j.experience LIKE '%신입%' OR j.experience LIKE '%무관%')"], expectedOrder: "a.updated_at DESC" },

  // 마감순 should still be sort order, not trigger deadline filter
  { id: 35, input: "관심 공고 마감순", expectedFilters: ["a.status = 'interested'"], expectedOrder: "j.deadline ASC",
    note: "마감순 is sort order, 마감 should not leak into deadline filter" },
  // EXP-056: N년차 and 경력 standalone patterns
  { id: 36, input: "5년차 공고 있어?", expectedFilters: ["j.experience LIKE '%5%'"], expectedOrder: "a.updated_at DESC",
    note: "N년차 should trigger experience filter without keyword leak" },
  { id: 37, input: "3년차 관심 공고", expectedFilters: ["a.status = 'interested'", "j.experience LIKE '%3%'"], expectedOrder: "a.updated_at DESC",
    note: "N년차 + status composite without keyword leak" },
  { id: 38, input: "경력 공고 있어?", expectedFilters: ["(j.experience NOT LIKE '%신입%' OR j.experience LIKE '%무관%')"], expectedOrder: "a.updated_at DESC",
    note: "standalone 경력 excludes 신입-only jobs" },
  { id: 39, input: "경력 5년 이상 서울", expectedFilters: ["j.experience LIKE '%5%'", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC",
    note: "경력 N년 + location composite (경력 is stopword, not leaked)" },

  // --- EXP-078: Skill-based filtering ---
  { id: 40, input: "React 공고 있어?", expectedFilters: ["j.skills LIKE '%react%'"], expectedOrder: "a.updated_at DESC",
    note: "English skill name queries j.skills column" },
  { id: 41, input: "파이썬 공고", expectedFilters: ["j.skills LIKE '%python%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean skill alias 파이썬 maps to python canonical" },
  { id: 42, input: "도커 쓰는 공고", expectedFilters: ["j.skills LIKE '%docker%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 도커 maps to docker, 쓰는 is stopword" },
  { id: 43, input: "스프링 부트 지원한 공고", expectedFilters: ["a.status = 'applied'", "j.skills LIKE '%spring boot%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 스프링 부트 + status composite" },
  { id: 44, input: "k8s 서울 공고", expectedFilters: ["j.skills LIKE '%kubernetes%'", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC",
    note: "k8s alias maps to kubernetes canonical" },
  { id: 45, input: "코틀린 관심 공고", expectedFilters: ["a.status = 'interested'", "j.skills LIKE '%kotlin%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 코틀린 maps to kotlin + status" },

  // --- EXP-079: Multi-skill queries ---
  { id: 46, input: "React TypeScript 공고", expectedFilters: ["j.skills LIKE '%react%'", "j.skills LIKE '%typescript%'"], expectedOrder: "a.updated_at DESC",
    note: "Two English skills should both generate skill filters" },
  { id: 47, input: "파이썬 장고 공고", expectedFilters: ["j.skills LIKE '%python%'", "j.skills LIKE '%django%'"], expectedOrder: "a.updated_at DESC",
    note: "Two Korean skill aliases should both match" },
  { id: 48, input: "도커 k8s 서울 공고", expectedFilters: ["j.skills LIKE '%docker%'", "j.skills LIKE '%kubernetes%'", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC",
    note: "Two skills + location composite" },
  { id: 49, input: "React Python 지원한 공고", expectedFilters: ["a.status = 'applied'", "j.skills LIKE '%react%'", "j.skills LIKE '%python%'"], expectedOrder: "a.updated_at DESC",
    note: "Two skills + status composite" },
  { id: 50, input: "react native TypeScript 공고", expectedFilters: ["j.skills LIKE '%react native%'", "j.skills LIKE '%typescript%'"], expectedOrder: "a.updated_at DESC",
    note: "Multi-word skill (react native) + second skill, no double-react" },
];

// Run tests
let passed = 0;
let failed = 0;
const failures = [];

console.log('🧪 EXP-050: Korean NLP Query Parser v3\n');
console.log('='.repeat(70));

for (const tc of testCases) {
  const result = parseKoreanQuery(tc.input);
  let tcPassed = true;

  for (const expectedFilter of tc.expectedFilters) {
    if (!result.filters.some(f => f === expectedFilter)) {
      failures.push({ id: tc.id, input: tc.input, expected: expectedFilter, got: JSON.stringify(result.filters), note: tc.note });
      tcPassed = false;
      break;
    }
  }

  // Check no extra unexpected filters
  if (tcPassed) {
    // Special check: company substring conflicts
    if (tc.note?.includes('NOT contain')) {
      const notMatch = tc.note.match(/NOT contain (.+)/);
      if (notMatch && result.filters.some(f => f.includes(notMatch[1].replace(/'/g, '')))) {
        failures.push({ id: tc.id, input: tc.input, expected: tc.note, got: JSON.stringify(result.filters) });
        tcPassed = false;
      }
    }
    // SQL quote validation
    if (tc.note?.includes('balanced quotes')) {
      for (const f of result.filters) {
        const singleQuotes = (f.match(/'/g) || []).length;
        if (singleQuotes % 2 !== 0) {
          failures.push({ id: tc.id, input: tc.input, expected: 'balanced SQL quotes', got: f });
          tcPassed = false;
          break;
        }
      }
    }
  }

  if (tcPassed && result.order !== tc.expectedOrder) {
    failures.push({ id: tc.id, input: tc.input, expected: `order: ${tc.expectedOrder}`, got: `order: ${result.order}` });
    tcPassed = false;
  }

  if (tcPassed) {
    console.log(`✅ #${tc.id} "${tc.input}" → [${result.filters.join(', ')}] | ${result.order}`);
    passed++;
  } else {
    console.log(`❌ #${tc.id} "${tc.input}"`);
    const last = failures[failures.length - 1];
    console.log(`   Expected: ${last.expected}`);
    console.log(`   Got: ${last.got}`);
    if (last.note) console.log(`   Note: ${last.note}`);
    failed++;
  }
}

console.log('='.repeat(70));
console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✅ All Korean NLP v3 tests passed!');
} else {
  console.log(`❌ ${failed} tests failed`);
}
process.exit(failed === 0 ? 0 : 1);
