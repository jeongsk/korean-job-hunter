/**
 * Shared Korean NLP Query Parser (EXP-159)
 * Single source of truth — all test files import from here.
 */

function parseKoreanQuery(input) {
  const filters = [];
  const careerStageFilters = []; // EXP-169: Collect separately, pick most restrictive
  let order = "a.updated_at DESC";
  const text = input.trim();
  if (!text) return { filters, order };

  const consumedWords = new Set();

  // === Sorting (consume keywords early) ===
  if (/최신순/.test(text)) {
    order = "a.updated_at DESC";
    consumedWords.add('최신순');
  }
  if (/(점수|매칭)순|(점수|매칭).*순/.test(text)) {
    order = "m.score DESC";
    consumedWords.add('점수순');
    consumedWords.add('매칭순');
  }
  if (/마감(순| 빠른순)/.test(text)) {
    order = "j.deadline ASC";
    consumedWords.add('마감순');
  }

  // === "Unapplied" status detection (안 + 지원, 미지원, 지원하지 않은) ===
  let isUnapplied = false;
  if (/(?:지원\s*안\s*(?:한|했)|미지원|지원하지\s*않|안\s*지원)/.test(text)) {
    filters.push("a.status IS NULL OR a.status = ''");
    consumedWords.add('미지원');
    isUnapplied = true;
    const unappliedWords = text.match(/[가-힣]+/g) || [];
    for (const w of unappliedWords) {
      if (/^(지원|미지원|안|않|않은|않는|아직)$/.test(w)) consumedWords.add(w);
    }
  }

  // === Status detection ===
  const statusPatterns = [
    { regex: /면접(?!후결정)(잡힌|보는)?/, status: 'interview', words: ['면접', '면접보는', '면접잡힌'] },
    { regex: /지원(완료|한|했)/, status: 'applied', words: ['지원완료', '지원한', '지원했'] },
    { regex: /(관심|북마크|찜해둔|찜)/, status: 'interested', words: ['관심', '북마크', '찜해둔', '찜'] },
    { regex: /(합격|오퍼)/, status: 'offer', words: ['합격', '합격한', '오퍼'] },
    { regex: /불합격/, status: 'declined', words: ['불합격'] },
    { regex: /(탈락|거절|떨어)/, status: 'rejected,declined', words: ['탈락', '탈락한', '거절', '떨어진'] },
    { regex: /지원(예정|할)/, status: 'applying', words: ['지원예정', '지원할'] },
  ];

  if (!isUnapplied) {
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
  }

  // === Negation detection ===
  const negationMatch = text.match(/(빼고|뺀|제외|말고)/);
  const negationIdx = negationMatch ? text.indexOf(negationMatch[0]) : -1;
  let appliedNegation = false;

  // === Work type ===
  if (/(재택근무|전면재택|재택|원격근무|원격|풀리모트|리모트|완전재택)/.test(text)) {
    filters.push("j.work_type = 'remote'");
    consumedWords.add('재택근무'); consumedWords.add('전면재택'); consumedWords.add('재택'); consumedWords.add('원격근무'); consumedWords.add('원격');
    consumedWords.add('풀리모트'); consumedWords.add('리모트'); consumedWords.add('완전재택');
  }
  if (/하이브리드|주\s*\d\s*일\s*출근/.test(text)) {
    filters.push("j.work_type = 'hybrid'");
    consumedWords.add('하이브리드'); consumedWords.add('출근');
  }

  // === Salary filter (EXP-082: threshold + range + 억 support) ===
  const salaryWords = ['연봉', '급여', '연수입', '월급', '월수입', '만원', '이상', '부터', '사이'];
  for (const w of salaryWords) consumedWords.add(w);

  let salaryThresholdApplied = false;
  if (/(연봉|급여|연수입|월급|월수입)/.test(text)) {
    // Try 억 range first: 연봉 1~2억
    const eokRange = text.match(/(연봉|급여|연수입|월급|월수입)\s*(\d+(?:\.\d+)?)\s*(?:[~\-]|에서)\s*(\d+(?:\.\d+)?)\s*억/);
    const eokSingle = !eokRange && text.match(/(연봉|급여|연수입|월급|월수입)\s*(\d+(?:\.\d+)?)\s*억/);
    // 만원 range: 연봉 5000~8000만원 or 연봉 5000에서 8000 사이
    const manRange = !eokRange && !eokSingle && text.match(/(연봉|급여|연수입|월급|월수입)\s*(\d[\d,]*)\s*(?:[~\-]|에서)\s*(\d[\d,]*)\s*(?:만원|사이)?/);
    // Korean number-word range: 연봉 4천~6천, 연봉 5천에서 8천만원
    const cheonRange = !eokRange && !eokSingle && !manRange && text.match(/(연봉|급여|연수입|월급|월수입)\s*(\d+(?:\.\d+)?)\s*천\s*(?:[~\-]|에서)\s*(\d+(?:\.\d+)?)\s*천\s*(만원)?/);
    // Korean number-word single: 연봉 5천, 연봉 5천만원
    const cheonSingle = !eokRange && !eokSingle && !manRange && !cheonRange && text.match(/(연봉|급여|연수입|월급|월수입)\s*(\d+(?:\.\d+)?)\s*천\s*(만원)?/);
    // 만원 threshold: 연봉 6000 이상
    const manThreshold = !manRange && !eokRange && !eokSingle && !cheonRange && !cheonSingle && text.match(/(연봉|급여|연수입|월급|월수입)\s*(\d[\d,]*)\s*(만원)?\s*(이상|부터|↑)?/);

    if (eokRange) {
      const min = Math.round(parseFloat(eokRange[2]) * 10000);
      const max = Math.round(parseFloat(eokRange[3]) * 10000);
      filters.push(`(j.salary_min <= ${max} AND j.salary_max >= ${min})`);
      consumedWords.add(eokRange[0]);
      salaryThresholdApplied = true;
    } else if (eokSingle) {
      const val = Math.round(parseFloat(eokSingle[2]) * 10000);
      filters.push(`j.salary_min >= ${val}`);
      consumedWords.add(eokSingle[0]);
      salaryThresholdApplied = true;
    } else if (manRange) {
      const isMonthly = /월급|월수입/.test(manRange[1]);
      let min = parseInt(manRange[2].replace(/,/g, ''));
      let max = parseInt(manRange[3].replace(/,/g, ''));
      if (isMonthly) { min = Math.round(min * 12); max = Math.round(max * 12); }
      filters.push(`(j.salary_min <= ${max} AND j.salary_max >= ${min})`);
      consumedWords.add(manRange[0]);
      salaryThresholdApplied = true;
    } else if (cheonRange) {
      const isMonthly = /월급|월수입/.test(cheonRange[1]);
      let min = Math.round(parseFloat(cheonRange[2]) * 1000);
      let max = Math.round(parseFloat(cheonRange[3]) * 1000);
      if (isMonthly) { min = Math.round(min * 12); max = Math.round(max * 12); }
      filters.push(`(j.salary_min <= ${max} AND j.salary_max >= ${min})`);
      consumedWords.add(cheonRange[0]);
      consumedWords.add('천');
      consumedWords.add('천에서');
      salaryThresholdApplied = true;
    } else if (cheonSingle) {
      const isMonthly = /월급|월수입/.test(cheonSingle[1]);
      let val = Math.round(parseFloat(cheonSingle[2]) * 1000);
      if (isMonthly) val = Math.round(val * 12);
      filters.push(`j.salary_min >= ${val}`);
      consumedWords.add(cheonSingle[0]);
      consumedWords.add('천');
      salaryThresholdApplied = true;
    } else if (manThreshold) {
      const isMonthly = /월급|월수입/.test(manThreshold[1]);
      let val = parseInt(manThreshold[2].replace(/,/g, ''));
      if (isMonthly) val = Math.round(val * 12);
      if (/이상|부터|↑/.test(text)) {
        filters.push(`j.salary_min >= ${val}`);
      } else {
        filters.push("j.salary IS NOT NULL AND j.salary != ''");
      }
      consumedWords.add(manThreshold[0]);
      salaryThresholdApplied = true;
    } else {
      // Fallback: just has salary
      filters.push("j.salary IS NOT NULL AND j.salary != ''");
    }
  }
  // EXP-169: Salary threshold without 연봉 prefix — "5000만원 이상", "3천만원 이상"
  if (!salaryThresholdApplied) {
    // N만원 이상/부터 pattern (e.g., "5000만원 이상")
    const bareManThreshold = text.match(/(\d[\d,]*)\s*만원\s*(이상|부터|↑)/);
    if (bareManThreshold) {
      const val = parseInt(bareManThreshold[1].replace(/,/g, ''));
      filters.push(`j.salary_min >= ${val}`);
      consumedWords.add(bareManThreshold[0]);
      consumedWords.add('만원');
      salaryThresholdApplied = true;
    }
    // N천만원 이상 pattern (e.g., "5천만원 이상")
    if (!salaryThresholdApplied) {
      const cheonMatch = text.match(/(\d+)\s*천\s*만원\s*(이상|부터|↑)?/);
      if (cheonMatch) {
        const val = parseInt(cheonMatch[1]) * 1000;
        filters.push(`j.salary_min >= ${val}`);
        consumedWords.add(cheonMatch[0]);
        consumedWords.add('천');
        consumedWords.add('만원');
        salaryThresholdApplied = true;
      }
    }
  }
  // 면접후결정 (negotiable salary) — NOT an interview status
  if (/면접\s*후\s*결정|면접후결정/.test(text)) {
    filters.push("(j.salary LIKE '%면접후결정%' OR j.salary LIKE '%협의%' OR j.salary IS NULL OR j.salary = '')");
    consumedWords.add('면접후결정');
    consumedWords.add('면접');
    consumedWords.add('후');
    consumedWords.add('결정');
  }

  // === Employment type filter (EXP-095) ===
  if (/정규직/.test(text)) {
    const isNegated = negationMatch && text.indexOf('정규직') < negationIdx;
    filters.push(isNegated ? "j.employment_type != 'regular'" : "j.employment_type = 'regular'");
    if (isNegated) appliedNegation = true;
    consumedWords.add('정규직');
  }
  if (/계약직|파견/.test(text)) {
    const isNegated = negationMatch && text.indexOf('계약직') < negationIdx;
    filters.push(isNegated ? "j.employment_type != 'contract'" : "j.employment_type = 'contract'");
    if (isNegated) appliedNegation = true;
    consumedWords.add('계약직'); consumedWords.add('파견');
  }
  if (/인턴/.test(text)) {
    const isNegated = negationMatch && text.indexOf('인턴') < negationIdx;
    filters.push(isNegated ? "j.employment_type != 'intern'" : "j.employment_type = 'intern'");
    if (isNegated) appliedNegation = true;
    consumedWords.add('인턴');
  }
  if (/프리랜서|프리랜스/.test(text)) {
    const isNegated = negationMatch && text.indexOf(text.match(/프리랜서|프리랜스/)[0]) < negationIdx;
    filters.push(isNegated ? "j.employment_type != 'freelance'" : "j.employment_type = 'freelance'");
    if (isNegated) appliedNegation = true;
    consumedWords.add('프리랜서'); consumedWords.add('프리랜스');
  }

  // === Career stage filter (EXP-095, EXP-169: collect separately) ===
  if (/시니어|senior/i.test(text)) {
    careerStageFilters.push({ stages: ['senior'], sql: "j.career_stage = 'senior'" });
    consumedWords.add('시니어');
  }
  if (/(?<![가-힣])리드(?![가-힣])/.test(text) || /lead\s*포지션|lead\s*position/i.test(text)) {
    careerStageFilters.push({ stages: ['lead'], sql: "j.career_stage = 'lead'" });
    consumedWords.add('리드');
  }
  if (/미드|미들|mid\s*level/i.test(text)) {
    careerStageFilters.push({ stages: ['mid'], sql: "j.career_stage = 'mid'" });
    consumedWords.add('미드'); consumedWords.add('미들');
  }
  if (/주니어|junior/i.test(text)) {
    careerStageFilters.push({ stages: ['junior'], sql: "j.career_stage = 'junior'" });
    consumedWords.add('주니어');
  }

  // === Experience filter ===
  if (/신입/.test(text)) {
    filters.push("(j.career_stage = 'entry' OR j.experience LIKE '%신입%' OR j.experience LIKE '%무관%')");
    consumedWords.add('신입');
  }
  const expMatch = text.match(/(\d+)\s*년(?!차)\s*(이상|이상의)?/);
  if (expMatch) {
    const years = parseInt(expMatch[1]);
    // Map N년 이상 to career_stage for accurate filtering
    // deriveCareerStage: 0→entry, 1-3→junior, 4-7→mid, 8-12→senior, 13+→lead
    // N년 이상 means "minimum N years" → include the stage N maps to AND all higher stages
    if (years <= 3) {
      // 1-3년 이상: junior+ (junior = 1-3 years)
      careerStageFilters.push({ stages: ['junior','mid','senior','lead'], sql: "j.career_stage IN ('junior','mid','senior','lead')" });
    } else if (years <= 7) {
      // 4-7년 이상: mid+ (mid = 4-7 years)
      careerStageFilters.push({ stages: ['mid','senior','lead'], sql: "j.career_stage IN ('mid','senior','lead')" });
    } else if (years <= 12) {
      // 8-12년 이상: senior+ (senior = 8-12 years)
      careerStageFilters.push({ stages: ['senior','lead'], sql: "j.career_stage IN ('senior','lead')" });
    } else {
      // 13+년: only lead
      careerStageFilters.push({ stages: ['lead'], sql: "j.career_stage = 'lead'" });
    }
    consumedWords.add(expMatch[0]);
  }
  // N년차 pattern (e.g., "5년차" = 5th year of experience)
  // Also handles "N년차 이상" (minimum experience) with tighter filtering
  const yoeMatch = text.match(/(\d+)\s*년차(\s*이상)?/);
  if (yoeMatch && !expMatch) {
    const years = parseInt(yoeMatch[1]);
    const isMinimum = !!yoeMatch[2]; // "이상" suffix → minimum threshold
    if (isMinimum) {
      // N년차 이상: restrictive, matching N년 이상 logic
      if (years <= 3) {
        careerStageFilters.push({ stages: ['mid','senior','lead'], sql: "j.career_stage IN ('mid','senior','lead')" });
      } else if (years <= 7) {
        careerStageFilters.push({ stages: ['mid','senior','lead'], sql: "j.career_stage IN ('mid','senior','lead')" });
      } else if (years <= 12) {
        careerStageFilters.push({ stages: ['senior','lead'], sql: "j.career_stage IN ('senior','lead')" });
      } else {
        careerStageFilters.push({ stages: ['lead'], sql: "j.career_stage = 'lead'" });
      }
    } else {
      // N년차 alone: show jobs suitable for that experience level
      if (years <= 1) {
        careerStageFilters.push({ stages: ['entry','junior','mid','senior','lead'], sql: "j.career_stage IN ('entry','junior','mid','senior','lead')" });
      } else if (years <= 3) {
        careerStageFilters.push({ stages: ['entry','junior','mid','senior','lead'], sql: "j.career_stage IN ('entry','junior','mid','senior','lead')" });
      } else if (years <= 7) {
        careerStageFilters.push({ stages: ['mid','senior','lead'], sql: "j.career_stage IN ('mid','senior','lead')" });
      } else if (years <= 12) {
        careerStageFilters.push({ stages: ['senior','lead'], sql: "j.career_stage IN ('senior','lead')" });
      } else {
        careerStageFilters.push({ stages: ['lead'], sql: "j.career_stage = 'lead'" });
      }
    }
    consumedWords.add(yoeMatch[0]);
    consumedWords.add('년차');
  }
  // "경력" standalone → show experienced jobs (exclude 신입-only)
  if (/경력무관/.test(text)) {
    // 경력무관 = accepts all experience levels
    filters.push("(j.career_stage IN ('entry','junior','mid','senior','lead') OR j.experience LIKE '%무관%')");
    consumedWords.add('경력무관'); consumedWords.add('경력'); consumedWords.add('무관');
  } else if (/경력/.test(text) && !/신입/.test(text) && !expMatch && !yoeMatch) {
    filters.push("(j.career_stage IN ('junior','mid','senior','lead') OR (j.experience NOT LIKE '%신입%' OR j.experience LIKE '%무관%'))");
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
  const companies = ['우아한형제들', '배달의민족', '당근마켓', '카카오뱅크', '토스뱅크', '카카오페이', '카카오엔터', '마이플레이스', '네오위즈', '엔씨소프트', '카카오', '네이버', '삼성', '라인', '토스', '쿠팡', '야놀자', '크몽', '배민', '넥슨', '한컴', '위메프'];
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

  // === Region Aliases ===
  // Korean region groupings that map to multiple location filters (OR group)
  const REGION_ALIASES = {
    '수도권': ['서울', '경기', '인천'],
    '수도': ['서울'],
    '首都권': ['서울', '경기', '인천'],
    '지방': null, // special: NOT 서울/경기/인천
    '해외': null, // special: foreign (no domestic location match)
  };
  const REGION_ALIAS_PATTERNS = Object.keys(REGION_ALIASES).join('|');
  const regionRegex = new RegExp(`(${REGION_ALIAS_PATTERNS})`);
  const regionMatch = text.match(regionRegex);
  if (regionMatch) {
    const alias = regionMatch[1];
    if (alias === '지방') {
      // Exclude 수도권 locations
      filters.push(`(j.location NOT LIKE '%서울%' AND j.location NOT LIKE '%경기%' AND j.location NOT LIKE '%인천%')`);
    } else if (alias === '해외') {
      // No specific filter — just keyword search
      filters.push(`(j.title LIKE '%해외%' OR j.company LIKE '%해외%' OR j.location LIKE '%해외%')`);
    } else if (REGION_ALIASES[alias]) {
      const locs = REGION_ALIASES[alias];
      const orClauses = locs.map(l => `j.location LIKE '%${l}%'`).join(' OR ');
      filters.push(`(${orClauses})`);
    }
    consumedWords.add(alias);
  }

  // === Locations ===
  const locations = ['영등포', '서울', '경기', '부산', '대전', '인천', '광주', '대구', '울산', '수원', '이천', '판교', '강남', '송파', '성수', '역삼', '잠실', '마포', '용산', '구로', '분당', '일산', '평촌', '세종', '여의도', '신촌', '홍대', '건대', '동탄', '청주', '천안', '양재', '논현', '신사', '삼성', '방배', '광화문', '을지로', '종로', '시흥', '안양', '안산', '평택', '파주', '김포', '창원', '포항'];
  for (const loc of locations) {
    if (consumedWords.has(loc)) continue;
    // Skip if already matched as company (e.g., 삼성 is both company and location)
    if (filters.some(f => f.includes(`company LIKE '%${loc}%'`))) continue;
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
    { canonical: 'go', patterns: [/golang|고언어|go언어|(?<!\w)go(?!\w)/i] },
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
    { canonical: 'vue', patterns: [/vue(?:\.?js)?|(?<![가-힣])뷰(?![가-힣])/i] },
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
    { canonical: 'linux', patterns: [/linux|리눅스/i] },
    { canonical: 'nginx', patterns: [/nginx|엔진엑스/i] },
    { canonical: 'ci/cd', patterns: [/ci\/cd|ci\s*cd|cicd|씨아이씨디/i] },
    { canonical: 'devops', patterns: [/devops|데브옵스/i] },
    { canonical: 'spark', patterns: [/spark|스파크/i] },
    { canonical: 'hadoop', patterns: [/hadoop|하둡/i] },
    { canonical: 'airflow', patterns: [/airflow|에어플로우/i] },
    { canonical: 'dbt', patterns: [/\bdbt\b|디비티/i] },
    { canonical: 'bigquery', patterns: [/bigquery|빅쿼리/i] },
    { canonical: 'snowflake', patterns: [/snowflake|스노우플레이크/i] },
    { canonical: 'jpa', patterns: [/\bjpa\b/i] },
    { canonical: 'redux', patterns: [/redux|리덕스/i] },
    { canonical: 'zustand', patterns: [/zustand|주스탄드/i] },
    { canonical: 'recoil', patterns: [/recoil|리코일/i] },
    { canonical: 'mobx', patterns: [/mobx|몹엑스/i] },
    { canonical: 'vuex', patterns: [/vuex|뷰엑스/i] },
    { canonical: 'pinia', patterns: [/pinia|피니아/i] },
    { canonical: 'unity', patterns: [/unity|유니티/i] },
    { canonical: 'unreal', patterns: [/unreal|언리얼/i] },
    { canonical: 'machine learning', patterns: [/machine\s*learning|머신러닝|머신\s*러닝|기계학습/i] },
    { canonical: 'rest api', patterns: [/rest\s*api|레스트\s*api/i] },
    { canonical: 'grpc', patterns: [/grpc|지알피시/i] },
    { canonical: 'rabbitmq', patterns: [/rabbitmq|래빗엠큐/i] },
    { canonical: 'oracle', patterns: [/oracle|오라클/i] },
    { canonical: 'mssql', patterns: [/mssql|ms\s*sql/i] },
    { canonical: 'c#', patterns: [/c#\s*|시샵/i] },
    { canonical: 'c++', patterns: [/c\+\+/i] },
    { canonical: 'php', patterns: [/php/i] },
    { canonical: 'dart', patterns: [/dart|(?<![가-힣])다트(?![가-힣])/i] },
    { canonical: 'svelte', patterns: [/svelte|스벨트/i] },
    { canonical: 'swiftui', patterns: [/swiftui|스위프트유아이/i] },
    { canonical: 'jetpack compose', patterns: [/jetpack\s*compose|젯팩\s*컴포즈/i] },
    { canonical: 'nestjs', patterns: [/nest\.?js|네스트/i] },
    { canonical: 'nuxt', patterns: [/nuxt(?:\.?js)?|넉스트/i] },
    { canonical: 'laravel', patterns: [/laravel|라라벨/i] },
    { canonical: 'rails', patterns: [/rails|레일즈/i] },
    { canonical: '.net', patterns: [/\.net|닷넷/i] },
    { canonical: 'aws lambda', patterns: [/aws\s*lambda|람다/i] },
    { canonical: 'aws s3', patterns: [/aws\s*s3|에스쓰리/i] },
    { canonical: 'aws sqs', patterns: [/aws\s*sqs/i] },
    { canonical: 'ansible', patterns: [/ansible|앤서블/i] },
    { canonical: 'llm', patterns: [/\bllm\b|엘엘이엠|대규모언어모델/i] },
    { canonical: 'nlp', patterns: [/\bnlp\b|자연어처리|자연어\s*처리/i] },
    { canonical: 'computer vision', patterns: [/computer\s*vision|컴퓨터\s*비전/i] },
    { canonical: 'mlops', patterns: [/ml[\s/]?ops|엠엘옵스/i] },
    { canonical: 'rag', patterns: [/\brag\b|래그/i] },
    { canonical: 'langchain', patterns: [/langchain|랭체인/i] },
    { canonical: 'huggingface', patterns: [/huggingface|허깅페이스/i] },
    { canonical: 'fine-tuning', patterns: [/fine[\s-]*tuning|파인튜닝|파인\s*튜닝/i] },
    { canonical: 'prompt engineering', patterns: [/prompt\s*engineering|프롬프트\s*엔지니어링/i] },
    { canonical: 'stable diffusion', patterns: [/stable\s*diffusion|스테이블\s*디퓨전/i] },
    { canonical: 'vector database', patterns: [/vector\s*database|벡터\s*디비|벡터데이터베이스/i] },
    { canonical: 'r', patterns: [/\br\s*(?:언어|프로그래밍)/i] },
    // EXP-101: Modern web tools
    { canonical: 'vite', patterns: [/(?<!\w)vite(?!\w)|바이트/i] },
    { canonical: 'tailwind', patterns: [/tailwind\s*css|tailwind|테일윈드/i] },
    { canonical: 'prisma', patterns: [/(?<!\w)prisma(?!\w)|프리즈마/i] },
    { canonical: 'vercel', patterns: [/(?<!\w)vercel(?!\w)|버셀/i] },
    { canonical: 'trpc', patterns: [/(?<!\w)trpc(?!\w)/i] },
    { canonical: 'hono', patterns: [/(?<!\w)hono(?!\w)|호노/i] },
    { canonical: 'firebase', patterns: [/(?<!\w)firebase(?!\w)|파이어베이스/i] },
    { canonical: 'supabase', patterns: [/(?<!\w)supabase(?!\w)|수파베이스/i] },
    { canonical: 'storybook', patterns: [/storybook|스토리북/i] },
    { canonical: 'jest', patterns: [/(?<!\w)jest(?!\w)|제스트/i] },
    { canonical: 'cypress', patterns: [/(?<!\w)cypress(?!\w)|사이프레스/i] },
    { canonical: 'junit', patterns: [/(?<!\w)junit(?!\w)|제이유닛/i] },
    { canonical: 'sql', patterns: [/(?<!\w)sql(?!\w)|에스큐엘/i] },
    // EXP-103: Runtimes, frameworks, ORM, monitoring, desktop/mobile
    { canonical: 'deno', patterns: [/(?<!\w)deno(?!\w)|데노/i] },
    { canonical: 'bun', patterns: [/(?<!\w)bun(?!\w)/i] },
    { canonical: 'remix', patterns: [/(?<!\w)remix(?!\w)|레믹스/i] },
    { canonical: 'astro', patterns: [/(?<!\w)astro(?!\w)|아스트로/i] },
    { canonical: 'fastify', patterns: [/(?<!\w)fastify(?!\w)|패스티파이/i] },
    { canonical: 'koa', patterns: [/(?<!\w)koa(?!\w)|코아/i] },
    { canonical: 'drizzle', patterns: [/(?<!\w)drizzle(?!\w)|드리즐/i] },
    { canonical: 'typeorm', patterns: [/(?<!\w)typeorm(?!\w)|타입오알엠/i] },
    { canonical: 'sequelize', patterns: [/(?<!\w)sequelize(?!\w)|시퀄라이즈/i] },
    { canonical: 'mongoose', patterns: [/(?<!\w)mongoose(?!\w)|몽구스/i] },
    { canonical: 'electron', patterns: [/(?<!\w)electron(?!\w)|일렉트론/i] },
    { canonical: 'tauri', patterns: [/(?<!\w)tauri(?!\w)|타우리/i] },
    { canonical: 'capacitor', patterns: [/(?<!\w)capacitor(?!\w)|캐패시터/i] },
    { canonical: 'ionic', patterns: [/(?<!\w)ionic(?!\w)|아이오닉/i] },
    { canonical: 'sentry', patterns: [/(?<!\w)sentry(?!\w)|센트리/i] },
    { canonical: 'datadog', patterns: [/(?<!\w)datadog(?!\w)|데이터독/i] },
    { canonical: 'grafana', patterns: [/(?<!\w)grafana(?!\w)|그라파나/i] },
    { canonical: 'prometheus', patterns: [/(?<!\w)prometheus(?!\w)|프로메테우스/i] },
    // EXP-116: Blockchain / Web3
    { canonical: 'smart contract', patterns: [/smart[\s-]?contract|스마트[\s-]*컨트랙트/i] },
    { canonical: 'solidity', patterns: [/(?<!\w)solidity(?!\w)|솔리디티/i] },
    { canonical: 'blockchain', patterns: [/block[\s-]?chain|블록체인/i] },
    { canonical: 'ethereum', patterns: [/(?<!\w)ethereum(?!\w)|이더리움/i] },
    { canonical: 'web3', patterns: [/(?<!\w)web3(?!\w)|웹3/i] },
    // EXP-116: Security
    { canonical: 'devsecops', patterns: [/(?<!\w)devsecops(?!\w)|데브시큐옵스/i] },
    { canonical: 'cybersecurity', patterns: [/cyber[\s-]?secur|사이버보안|정보보안|보안[\s-]*(엔지니어|전문가|담당자|분야|직무|분석)/i] },
    { canonical: 'owasp', patterns: [/(?<!\w)owasp(?!\w)/i] },
    { canonical: 'penetration testing', patterns: [/pen(?:etration)?[\s-]?test|침투테스트|모의해킹/i] },
    // EXP-116: Platform / SRE
    { canonical: 'platform engineering', patterns: [/platform[\s-]?eng|플랫폼[\s-]*(엔지니어링|엔지니어)/i] },
    { canonical: 'sre', patterns: [/(?<!\w)sre(?!\w)|사이트[\s-]*신뢰성/i] },
    { canonical: 'istio', patterns: [/(?<!\w)istio(?!\w)|이스티오/i] },
    { canonical: 'argocd', patterns: [/(?<!\w)argocd(?!\w)|아르고시디/i] },
    // EXP-167: Missing skill patterns from skill-inference sync
    { canonical: 'vitest', patterns: [/(?<!\w)vitest(?!\w)|바이테스트/i] },
    { canonical: 'dynamodb', patterns: [/(?<!\w)dynamo(?:db)?(?!\w)|다이나모/i] },
    { canonical: 'cloudwatch', patterns: [/(?<!\w)cloudwatch(?!\w)|클라우드워치/i] },
    { canonical: 'mybatis', patterns: [/(?<!\w)mybatis(?!\w)|마이바티스/i] },
    { canonical: 'msa', patterns: [/(?<!\w)msa(?!\w)|엠에스에이|마이크로서비스/i] },
    { canonical: 'opensearch', patterns: [/(?<!\w)opensearch(?!\w)|오픈서치/i] },
    { canonical: 'celery', patterns: [/(?<!\w)celery(?!\w)|셀러리/i] },
    { canonical: 'webflux', patterns: [/(?<!\w)webflux(?!\w)|웹플럭스/i] },
  ];

  for (const { canonical, patterns } of skillPatterns) {
    if (consumedWords.has(canonical)) continue;
    // Skip if a longer canonical already consumed that contains this one
    if ([...consumedWords].some(c => c !== canonical && c.includes(canonical))) continue;
    for (const p of patterns) {
      if (p.test(text)) {
        filters.push(`j.skills LIKE '%${canonical}%'`);
        consumedWords.add(canonical);
        // Add full Korean match to consumed words (handles multi-word: 리액트 네이티브, 머신 러닝)
        const fullMatch = text.match(p);
        if (fullMatch) {
          // Extract all Korean word runs from the match
          const koTokens = fullMatch[0].match(/[가-힣]+/g);
          if (koTokens) koTokens.forEach(t => consumedWords.add(t));
        }
        break;
      }
    }
  }

  // === Role-based skill inference (풀스택, 프론트엔드, 백엔드 etc.) ===
  // These are alternative skills (OR), not required-together (AND).
  // A 백엔드 job may use Java OR Python OR Node.js — not all three.
  const roleSkillMap = [
    { role: '풀스택', skills: ['react', 'node.js', 'typescript'] },
    { role: '프론트엔드', skills: ['react', 'typescript', 'javascript'] },
    { role: '백엔드', skills: ['node.js', 'python', 'java'] },
    { role: '안드로이드', skills: ['kotlin', 'java'] },
    { role: '프론트', skills: ['react', 'typescript', 'javascript'] },
    // EXP-166: Data role skill inference
    { role: '데이터 엔지니어', skills: ['python', 'spark', 'airflow', 'dbt'] },
    { role: '데이터 분석', skills: ['python', 'sql', 'bigquery'] },
    { role: '데이터 사이언티스트', skills: ['python', 'tensorflow', 'pytorch'] },
    { role: '데이터 분석가', skills: ['python', 'sql', 'bigquery'] },
    // EXP-167: Web developer role (Korean)
    { role: '웹', skills: ['react', 'javascript', 'html', 'css'] },
  ];
  for (const { role, skills } of roleSkillMap) {
    if (text.includes(role)) {
      const skillFilters = skills
        .filter(skill => !consumedWords.has(skill))
        .map(skill => `j.skills LIKE '%${skill}%'`);
      if (skillFilters.length > 0) {
        // OR: any one of the role's typical skills should match
        filters.push(`(${skillFilters.join(' OR ')})`);
        skills.forEach(s => consumedWords.add(s));
      }
      consumedWords.add(role);
    }
  }

  // === Remaining Korean keywords (title/company search) ===
  const stopWords = new Set(['면접', '면접보는', '면접잡힌', '면접후결정', '결정', '정규직', '계약직', '파견', '인턴', '프리랜서', '프리랜스', '시니어', '주니어', '미드', '미들', '리드', '포지션', '레벨', '수준', '지원', '지원한', '지원할', '지원예정', '지원완료', '관심', '북마크', '찜', '찜해둔', '합격', '합격한', '오퍼', '탈락', '탈락한', '거절', '불합격', '재택', '재택으로', '재택근무', '전면재택', '원격', '원격근무', '리모트', '풀리모트', '완전재택', '하이브리드', '출근', '상시모집', '수시모집', '상시채용', '전부', '모두', '모든', '점수', '점수순으로', '매칭', '최신', '빼고', '뺀', '제외', '말고', '있어', '보여', '보여줘', '공고', '거', '곳', '다', '중에', '할', '한', '수', '있는', '순으로', '보는', '잡힌', '해둔', '예정', '완료', '했', '을', '를', '이', '가', '에서', '의', '에', '연봉', '급여', '연수입', '마감임박', '곧마감', '마감순', '오늘', '내일', '마감', '기한', '데드라인', '경력', '년', '년차', '이상', '남은', '빠른순', '쓰는', '하는', '쓰는곳', '하는곳', '파이썬', '도커', '코틀린', '스프링', '장고', '플라스크', '넥스트', '뷰', '앵귤러', '노드', '익스프레스', '플러터', '쿠버네티스', '테라폼', '러스트', '스위프트', '루비', '레디스', '피그마', '리액트', '자바스크립트', '타입스크립트', '자바', '고언어', '부트', '리눅스', '엔진엑스', '데브옵스', '스파크', '하둡', '에어플로우', '디비티', '빅쿼리', '스노우플레이크', '리덕스', '주스탄드', '리코일', '몹엑스', '뷰엑스', '피니아', '유니티', '언리얼', '머신러닝', '래빗엠큐', '오라클', '다트', '스벨트', '스위프트유아이', '네스트', '넉스트', '라라벨', '레일즈', '닷넷', '앤서블', '랭체인', '허깅페이스', '파인튜닝', '프롬프트', '디퓨전', '벡터', '자연어', '자연어처리', '비전', '컴퓨터', '컴퓨터비전', '머신러닝', '파인튜닝', '프롬프트엔지니어링', '스테이블', '디퓨전', '벡터디비', '바이트', '테일윈드', '프리즈마', '버셀', '파이어베이스', '수파베이스', '스토리북', '제스트', '사이프레스', '호노', '수도권', '지방', '해외', '사이', '아니면', '월급', '월수입', '에서',
    // EXP-128: Korean skill aliases from EXP-103 (runtimes/ORM/monitoring/desktop/mobile)
    '데노', '레믹스', '아스트로', '패스티파이', '코아', '드리즐', '타입오알엠', '타우리', '캐패시터', '아이오닉', '데이터독',
    // EXP-128: Korean skill aliases from EXP-116 (blockchain/security/platform)
    '솔리디티', '블록체인', '이더리움', '스마트컨트랙트', '데브시큐옵스', '사이버보안', '모의해킹', '침투테스트', '플랫폼엔지니어링', '플랫폼엔지니어', '이스티오', '아르고시디', '사이트신뢰성',
    // EXP-128: Particle-truncated forms (인/이/나 stripped by koreanParticles regex)
    '블록체', '그라파', '패스티파',
    // EXP-128: Additional Korean aliases that could leak
    '그라파나', '프로메테우스', '웹3', '젠킨스', '램다', '포스트그레스', '포스트그레스큐엘', '시샵', '그래프큐엘', '지알피시', '레스트', '스토리북',
    // EXP-166: Security keyword stopWord
    '보안',
    '프레임워크', '프로그래밍', '개발', '엔지니어', '매니저', '디자이너', '플랫폼', '서비스', '솔루션', '시스템', '프로젝트', '테스트', '분석', '데이터', '모델', '알고리즘',
    // EXP-166: Data role stopwords
    '데이터엔지니어', '데이터분석', '데이터사이언티스트', '데이터분석가', '사이언티스트', '분석가',
    // EXP-145: Common Korean words that leak as keywords
    '가능', '가능한', '개발자', '전체', '담당자', '담당', '찾는', '원하는', '필요한', '관련', '분야', '경험', '있어요', '없는', '높은', '낮은', '빠른', '느린', '좋은', '많은', '적은', '큰', '작은', '새로운', '다음', '이전', '최고', '최소', '평균', '기준', '위치', '지역', '근무', '근무지', '환경', '복지', '혜택',
    // EXP-167: Conversational Korean noise words
    '열정', '열정적인', '이력서', '포트폴리오', '준비', '협의', '추천', '추천해줘', '알려줘', '찾아줘', '보여줘', '어떤', '없어', '뭐있어', '뭐', '있어', '해줘', '좀', '좀알려줘', '경력직', '협상', '협의',
    '채용', '공고', '구인', '모집', '지원자', '지원서', '면접', '면접관', '오퍼', '오퍼받은',
    '이번', '저번', '지금', '현재', '오늘', '내일', '이번주', '저번주', '이번달', '저번달',
    '바이트', '마이바티스', '엠에스에이', '마이크로서비스', '오픈서치', '셀러리', '웹플럭스', '다이나모', '클라우드워치', '바이테스트', '네이티브', '제이에스', '기계학습', '제이유닛', '에스큐엘', '시퀄라이즈', '클라우드', '러닝',
    // EXP-169: Salary-related words that shouldn't become keyword searches
    '천만원', '만원', '근처', '근교', '인근', '신입가능', '신입 가능', '연차',
    // EXP-168: Conversational phrase noise
    '가장', '잘', '맞는', '맞는지', '정렬', '아직', '미지원', '지원하지', '않은', '않는', '안', '적합한', '추천순', '높은순', '낮은순',
  ]);
  const koreanParticles = /^(.+?)(?:에서|으로|로서|으로서|에게|한테|으로부터|부터|까지|에서부터|에|은|는|이|가|을|를|와|과|의|도|만|조차|마저|부터|까지|이나|나|니|대로|만큼|처럼|같이|하고|랑|이랑|아|야|여|이여|한|인|적인|적인지|적)$/;
  const koreanWords = (text.match(/[가-힣]{2,}/g) || []).map(w => {
    const m = w.match(koreanParticles);
    return m && m[1].length >= 2 ? m[1] : w;
  });
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

  // === EXP-169: Merge career stage filters — pick most restrictive ===
  // Stage hierarchy: entry < junior < mid < senior < lead
  // When multiple filters exist (e.g., "시니어" + "5년 이상"), intersect to keep
  // only stages that appear in ALL filters.
  if (careerStageFilters.length > 0) {
    if (careerStageFilters.length === 1) {
      filters.push(careerStageFilters[0].sql);
    } else {
      // Intersect: keep stages present in every filter
      const stageOrder = ['entry', 'junior', 'mid', 'senior', 'lead'];
      let intersected = careerStageFilters[0].stages;
      for (let i = 1; i < careerStageFilters.length; i++) {
        intersected = intersected.filter(s => careerStageFilters[i].stages.includes(s));
      }
      if (intersected.length === 0) {
        // Contradictory (e.g., "리드" + "주니어") — no results possible, use most restrictive single
        const mostRestrictive = careerStageFilters.reduce((best, f) =>
          f.stages.length < best.stages.length ? f : best, careerStageFilters[0]);
        intersected = mostRestrictive.stages;
      }
      if (intersected.length === 1) {
        filters.push(`j.career_stage = '${intersected[0]}'`);
      } else {
        filters.push(`j.career_stage IN ('${intersected.join("','")}')`);
      }
    }
  }

  return { filters, order };
}

module.exports = { parseKoreanQuery };
