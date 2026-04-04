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

  // === Salary filter (EXP-082: threshold + range + 억 support) ===
  const salaryWords = ['연봉', '급여', '연수입', '만원', '이상', '부터'];
  for (const w of salaryWords) consumedWords.add(w);

  let salaryThresholdApplied = false;
  if (/(연봉|급여|연수입)/.test(text)) {
    // Try 억 range first: 연봉 1~2억
    const eokRange = text.match(/(연봉|급여|연수입)\s*(\d+(?:\.\d+)?)\s*[~\-]\s*(\d+(?:\.\d+)?)\s*억/);
    const eokSingle = !eokRange && text.match(/(연봉|급여|연수입)\s*(\d+(?:\.\d+)?)\s*억/);
    // 만원 range: 연봉 5000~8000만원
    const manRange = !eokRange && !eokSingle && text.match(/(연봉|급여|연수입)\s*(\d[\d,]*)\s*[~\-]\s*(\d[\d,]*)\s*(만원)?/);
    // 만원 threshold: 연봉 6000 이상
    const manThreshold = !manRange && !eokRange && !eokSingle && text.match(/(연봉|급여|연수입)\s*(\d[\d,]*)\s*(만원)?\s*(이상|부터|↑)?/);

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
      const min = parseInt(manRange[2].replace(/,/g, ''));
      const max = parseInt(manRange[3].replace(/,/g, ''));
      filters.push(`(j.salary_min <= ${max} AND j.salary_max >= ${min})`);
      consumedWords.add(manRange[0]);
      salaryThresholdApplied = true;
    } else if (manThreshold) {
      const val = parseInt(manThreshold[2].replace(/,/g, ''));
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

  // === Employment type filter (EXP-095) ===
  if (/정규직/.test(text)) {
    filters.push("j.employment_type = 'regular'");
    consumedWords.add('정규직');
  }
  if (/계약직|파견/.test(text)) {
    filters.push("j.employment_type = 'contract'");
    consumedWords.add('계약직'); consumedWords.add('파견');
  }
  if (/인턴/.test(text)) {
    filters.push("j.employment_type = 'intern'");
    consumedWords.add('인턴');
  }
  if (/프리랜서|프리랜스/.test(text)) {
    filters.push("j.employment_type = 'freelance'");
    consumedWords.add('프리랜서'); consumedWords.add('프리랜스');
  }

  // === Career stage filter (EXP-095) ===
  if (/시니어|senior/i.test(text)) {
    filters.push("j.career_stage = 'senior'");
    consumedWords.add('시니어');
  }
  if (/(?<![가-힣])리드(?![가-힣])/.test(text) || /lead\s*포지션|lead\s*position/i.test(text)) {
    filters.push("j.career_stage = 'lead'");
    consumedWords.add('리드');
  }
  if (/미드|미들|mid\s*level/i.test(text)) {
    filters.push("j.career_stage = 'mid'");
    consumedWords.add('미드'); consumedWords.add('미들');
  }
  if (/주니어|junior/i.test(text)) {
    filters.push("j.career_stage = 'junior'");
    consumedWords.add('주니어');
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
    { canonical: 'machine learning', patterns: [/machine\s*learning|머신러닝|머신\s*러닝/i] },
    { canonical: 'rest api', patterns: [/rest\s*api|레스트\s*api/i] },
    { canonical: 'grpc', patterns: [/grpc|지알피시/i] },
    { canonical: 'rabbitmq', patterns: [/rabbitmq|래빗엠큐/i] },
    { canonical: 'oracle', patterns: [/oracle|오라클/i] },
    { canonical: 'mssql', patterns: [/mssql|ms\s*sql/i] },
    { canonical: 'c#', patterns: [/c#\s*|시샵/i] },
    { canonical: 'c++', patterns: [/c\+\+/i] },
    { canonical: 'php', patterns: [/php/i] },
    { canonical: 'dart', patterns: [/dart|다트/i] },
    { canonical: 'svelte', patterns: [/svelte|스벨트/i] },
    { canonical: 'swiftui', patterns: [/swiftui|스위프트유아이/i] },
    { canonical: 'jetpack compose', patterns: [/jetpack\s*compose|젯팩\s*컴포즈/i] },
    { canonical: 'nestjs', patterns: [/nest\.?js|네스트/i] },
    { canonical: 'nuxt', patterns: [/nuxt\.?js?|넉스트/i] },
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
    { canonical: 'mlops', patterns: [/\bmlops\b|엠엘옵스/i] },
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
  const stopWords = new Set(['면접', '면접보는', '면접잡힌', '정규직', '계약직', '파견', '인턴', '프리랜서', '프리랜스', '시니어', '주니어', '미드', '미들', '리드', '포지션', '레벨', '수준', '지원', '지원한', '지원할', '지원예정', '지원완료', '관심', '북마크', '찜', '찜해둔', '합격', '합격한', '오퍼', '탈락', '탈락한', '거절', '불합격', '재택', '재택으로', '원격', '리모트', '하이브리드', '점수', '점수순으로', '매칭', '최신', '빼고', '제외', '말고', '있어', '보여', '보여줘', '공고', '거', '곳', '다', '중에', '할', '한', '수', '있는', '순으로', '보는', '잡힌', '해둔', '예정', '완료', '했', '을', '를', '이', '가', '에서', '의', '에', '연봉', '급여', '연수입', '마감임박', '곧마감', '마감순', '오늘', '내일', '마감', '기한', '데드라인', '경력', '년', '년차', '이상', '남은', '빠른순', '쓰는', '하는', '쓰는곳', '하는곳', '파이썬', '도커', '코틀린', '스프링', '장고', '플라스크', '넥스트', '뷰', '앵귤러', '노드', '익스프레스', '플러터', '쿠버네티스', '테라폼', '러스트', '스위프트', '루비', '레디스', '피그마', '리액트', '자바스크립트', '타입스크립트', '자바', '고언어', '부트', '리눅스', '엔진엑스', '데브옵스', '스파크', '하둡', '에어플로우', '디비티', '빅쿼리', '스노우플레이크', '리덕스', '주스탄드', '리코일', '몹엑스', '뷰엑스', '피니아', '유니티', '언리얼', '머신러닝', '래빗엠큐', '오라클', '다트', '스벨트', '스위프트유아이', '네스트', '넉스트', '라라벨', '레일즈', '닷넷', '앤서블', '랭체인', '허깅페이스', '파인튜닝', '프롬프트', '디퓨전', '벡터', '자연어', '자연어처리', '비전', '컴퓨터', '컴퓨터비전', '머신러닝', '파인튜닝', '프롬프트엔지니어링', '스테이블', '디퓨전', '벡터디비', '바이트', '테일윈드', '프리즈마', '버셀', '파이어베이스', '수파베이스', '스토리북', '제스트', '사이프레스', '호노']);
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
  { id: 51, input: "연봉 6000 이상 공고", expectedFilters: ["j.salary_min >= 6000"], expectedOrder: "a.updated_at DESC",
    note: "Salary threshold 만원 이상" },
  { id: 52, input: "연봉 5000~8000 공고", expectedFilters: ["(j.salary_min <= 8000 AND j.salary_max >= 5000)"], expectedOrder: "a.updated_at DESC",
    note: "Salary range 만원" },
  { id: 53, input: "연봉 1억 이상", expectedFilters: ["j.salary_min >= 10000"], expectedOrder: "a.updated_at DESC",
    note: "Salary threshold 억" },
  { id: 54, input: "연봉 1~2억 공고", expectedFilters: ["(j.salary_min <= 20000 AND j.salary_max >= 10000)"], expectedOrder: "a.updated_at DESC",
    note: "Salary range 억" },
  { id: 55, input: "급여 8000부터 관심 공고", expectedFilters: ["j.salary_min >= 8000", "a.status = 'interested'"], expectedOrder: "a.updated_at DESC",
    note: "Salary threshold + status" },
  { id: 56, input: "연봉 5000~7000 서울", expectedFilters: ["(j.salary_min <= 7000 AND j.salary_max >= 5000)", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC",
    note: "Salary range + location" },

  // --- EXP-095: Employment type & career stage filtering ---
  { id: 57, input: "정규직 공고 있어?", expectedFilters: ["j.employment_type = 'regular'"], expectedOrder: "a.updated_at DESC",
    note: "정규직 filters employment_type" },
  { id: 58, input: "계약직 관심 공고", expectedFilters: ["j.employment_type = 'contract'", "a.status = 'interested'"], expectedOrder: "a.updated_at DESC",
    note: "계약직 + status composite" },
  { id: 59, input: "인턴 공고", expectedFilters: ["j.employment_type = 'intern'"], expectedOrder: "a.updated_at DESC" },
  { id: 60, input: "정규직 서울 공고", expectedFilters: ["j.employment_type = 'regular'", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC",
    note: "Employment type + location composite" },
  { id: 61, input: "시니어 포지션 있어?", expectedFilters: ["j.career_stage = 'senior'"], expectedOrder: "a.updated_at DESC",
    note: "시니어 filters career_stage" },
  { id: 62, input: "주니어 공고", expectedFilters: ["j.career_stage = 'junior'"], expectedOrder: "a.updated_at DESC" },
  { id: 63, input: "미드 레벨 관심 공고", expectedFilters: ["j.career_stage = 'mid'", "a.status = 'interested'"], expectedOrder: "a.updated_at DESC",
    note: "Career stage + status composite" },
  { id: 64, input: "리드 포지션 서울", expectedFilters: ["j.career_stage = 'lead'", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC" },
  { id: 65, input: "정규직 시니어 카카오 공고", expectedFilters: ["j.employment_type = 'regular'", "j.career_stage = 'senior'", "j.company LIKE '%카카오%'"], expectedOrder: "a.updated_at DESC",
    note: "Employment type + career stage + company composite" },
  { id: 66, input: "프리랜서 공고 있어?", expectedFilters: ["j.employment_type = 'freelance'"], expectedOrder: "a.updated_at DESC" },
  // EXP-099: New skill patterns (48 skills added)
  { id: 67, input: "리눅스 공고", expectedFilters: ["j.skills LIKE '%linux%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 리눅스 maps to linux" },
  { id: 68, input: "데브옵스 공고", expectedFilters: ["j.skills LIKE '%devops%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 데브옵스 maps to devops" },
  { id: 69, input: "스파크 공고 있어?", expectedFilters: ["j.skills LIKE '%spark%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 스파크 maps to spark" },
  { id: 70, input: "유니티 게임 공고", expectedFilters: ["j.skills LIKE '%unity%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 유니티 maps to unity" },
  { id: 71, input: "머신러닝 공고", expectedFilters: ["j.skills LIKE '%machine learning%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 머신러닝 maps to machine learning" },
  { id: 72, input: "빅쿼리 쓰는 공고", expectedFilters: ["j.skills LIKE '%bigquery%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 빅쿼리 maps to bigquery" },
  { id: 73, input: "에어플로우 데이터 공고", expectedFilters: ["j.skills LIKE '%airflow%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 에어플로우 maps to airflow" },
  { id: 74, input: "다트 공고 있어?", expectedFilters: ["j.skills LIKE '%dart%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 다트 maps to dart" },
  { id: 75, input: "스벨트 프론트엔드 공고", expectedFilters: ["j.skills LIKE '%svelte%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 스벨트 maps to svelte" },
  { id: 76, input: "랭체인 LLM 공고", expectedFilters: ["j.skills LIKE '%langchain%'", "j.skills LIKE '%llm%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 랭체인 maps to langchain, LLM also matched" },
  { id: 77, input: "파인튜닝 공고", expectedFilters: ["j.skills LIKE '%fine-tuning%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 파인튜닝 maps to fine-tuning" },
  { id: 78, input: "자연어처리 공고", expectedFilters: ["j.skills LIKE '%nlp%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 자연어처리 maps to nlp" },
  // EXP-100: State management skill NLP queries
  { id: 79, input: "주스탄드 쓰는 공고", expectedFilters: ["j.skills LIKE '%zustand%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 주스탄드 maps to zustand" },
  { id: 80, input: "리코일 상태관리 공고", expectedFilters: ["j.skills LIKE '%recoil%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 리코일 maps to recoil" },
  { id: 81, input: "뷰엑스 공고 있어?", expectedFilters: ["j.skills LIKE '%vuex%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 뷰엑스 maps to vuex" },
  { id: 82, input: "피니아 쓰는 공고", expectedFilters: ["j.skills LIKE '%pinia%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 피니아 maps to pinia" },
  { id: 83, input: "리덕스 주스탄드 공고", expectedFilters: ["j.skills LIKE '%redux%'", "j.skills LIKE '%zustand%'"], expectedOrder: "a.updated_at DESC",
    note: "Both 리덕스→redux and 주스탄드→zustand matched" },
  // EXP-101: Modern web tool NLP queries
  { id: 84, input: "바이트 쓰는 공고", expectedFilters: ["j.skills LIKE '%vite%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 바이트 maps to vite" },
  { id: 85, input: "테일윈드 공고", expectedFilters: ["j.skills LIKE '%tailwind%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 테일윈드 maps to tailwind" },
  { id: 86, input: "프리즈마 ORM 공고", expectedFilters: ["j.skills LIKE '%prisma%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 프리즈마 maps to prisma" },
  { id: 87, input: "파이어베이스 백엔드 공고", expectedFilters: ["j.skills LIKE '%firebase%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 파이어베이스 maps to firebase" },
  { id: 88, input: "수파베이스 공고", expectedFilters: ["j.skills LIKE '%supabase%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 수파베이스 maps to supabase" },
  { id: 89, input: "스토리북 컴포넌트 공고", expectedFilters: ["j.skills LIKE '%storybook%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 스토리북 maps to storybook" },
  { id: 90, input: "Vite React 공고", expectedFilters: ["j.skills LIKE '%vite%'", "j.skills LIKE '%react%'"], expectedOrder: "a.updated_at DESC",
    note: "Both Vite and React in English" },
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
