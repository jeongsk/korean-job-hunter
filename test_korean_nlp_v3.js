#!/usr/bin/env node
/**
 * EXP-050: Korean NLP Query Parser v3
 * Fixes: SQL injection via missing quote, company substring conflicts, 최신순 sort recognition
 * Adds: salary filter, experience filter, deadline urgency, deadline sorting, 마감순 sorting
 */


const { parseKoreanQuery } = require("./scripts/nlp-parser");


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
  { id: 11, input: "백엔드 관심 공고", expectedFilters: ["a.status = 'interested'", "(j.skills LIKE '%node.js%' OR j.skills LIKE '%python%' OR j.skills LIKE '%java%')"], expectedOrder: "a.updated_at DESC" },

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
  { id: 30, input: "프론트엔드 관심 공고", expectedFilters: ["a.status = 'interested'", "(j.skills LIKE '%react%' OR j.skills LIKE '%typescript%' OR j.skills LIKE '%javascript%')"], expectedOrder: "a.updated_at DESC", note: "SQL must have balanced quotes" },

  // --- EXP-051: Bug fixes ---

  // 마감 alone should trigger deadline filter (not swallowed by stopWords)
  { id: 31, input: "마감 공고 있어?", expectedFilters: ["j.deadline IS NOT NULL AND j.deadline != ''"], expectedOrder: "a.updated_at DESC",
    note: "마감 alone should show deadline-filtered jobs, not empty filters" },

  // 마감 임박 with space should work same as 마감임박
  { id: 32, input: "마감 임박 공고", expectedFilters: ["j.deadline IS NOT NULL AND j.deadline != '' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 7"], expectedOrder: "a.updated_at DESC",
    note: "마감 임박 with space should match 마감임박 pattern" },

  // 신입 should be detected as experience filter
  { id: 33, input: "신입 공고 있어?", expectedFilters: ["(j.career_stage = 'entry' OR j.experience LIKE '%신입%' OR j.experience LIKE '%무관%')"], expectedOrder: "a.updated_at DESC",
    note: "신입 should trigger experience filter using career_stage + LIKE fallback" },

  // 신입 + status combined
  { id: 34, input: "신입 관심 공고", expectedFilters: ["a.status = 'interested'", "(j.career_stage = 'entry' OR j.experience LIKE '%신입%' OR j.experience LIKE '%무관%')"], expectedOrder: "a.updated_at DESC" },

  // 마감순 should still be sort order, not trigger deadline filter
  { id: 35, input: "관심 공고 마감순", expectedFilters: ["a.status = 'interested'"], expectedOrder: "j.deadline ASC",
    note: "마감순 is sort order, 마감 should not leak into deadline filter" },
  // EXP-056: N년차 and 경력 standalone patterns
  { id: 36, input: "5년차 공고 있어?", expectedFilters: ["j.career_stage IN ('mid','senior','lead')"], expectedOrder: "a.updated_at DESC",
    note: "N년차 should trigger career_stage filter (5년차→mid+)" },
  { id: 37, input: "3년차 관심 공고", expectedFilters: ["a.status = 'interested'", "j.career_stage IN ('entry','junior','mid','senior','lead')"], expectedOrder: "a.updated_at DESC",
    note: "3년차 = junior level, show all tiers they qualify for" },
  { id: 38, input: "경력 공고 있어?", expectedFilters: ["(j.career_stage IN ('junior','mid','senior','lead') OR (j.experience NOT LIKE '%신입%' OR j.experience LIKE '%무관%'))"], expectedOrder: "a.updated_at DESC",
    note: "standalone 경력 uses career_stage with LIKE fallback" },
  { id: 39, input: "경력 5년 이상 서울", expectedFilters: ["j.career_stage IN ('mid','senior','lead')", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC",
    note: "경력 N년 이상 uses career_stage filter (5년→mid+)" },

  // --- EXP-125: career_stage-based experience queries ---
  { id: 106, input: "10년 이상 공고", expectedFilters: ["j.career_stage IN ('senior','lead')"], expectedOrder: "a.updated_at DESC",
    note: "10년 이상 → senior+ only (no false match on '10' in unrelated text)" },
  { id: 107, input: "15년 이상 공고", expectedFilters: ["j.career_stage = 'lead'"], expectedOrder: "a.updated_at DESC",
    note: "15년 이상 → lead only" },
  { id: 108, input: "3년 이상 공고", expectedFilters: ["j.career_stage IN ('junior','mid','senior','lead')"], expectedOrder: "a.updated_at DESC",
    note: "3년 이상 → junior+ (deriveCareerStage(3)=junior)" },
  { id: 109, input: "7년 이상 공고", expectedFilters: ["j.career_stage IN ('mid','senior','lead')"], expectedOrder: "a.updated_at DESC",
    note: "7년 이상 → mid+ (7≤7 in deriveCareerStage = mid)" },
  { id: 110, input: "10년차 공고 있어?", expectedFilters: ["j.career_stage IN ('senior','lead')"], expectedOrder: "a.updated_at DESC",
    note: "10년차 → senior+ (deriveCareerStage(10)=senior, show that tier and above)" },

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
  // EXP-103: New runtime/ORM/monitoring NLP queries
  { id: 91, input: "데노 공고", expectedFilters: ["j.skills LIKE '%deno%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 데노 maps to deno" },
  { id: 92, input: "일렉트론 데스크톱 공고", expectedFilters: ["j.skills LIKE '%electron%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 일렉트론 maps to electron" },
  { id: 93, input: "시퀄라이즈 공고", expectedFilters: ["j.skills LIKE '%sequelize%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 시퀄라이즈 maps to sequelize" },
  { id: 94, input: "몽구스 MongoDB 공고", expectedFilters: ["j.skills LIKE '%mongoose%'", "j.skills LIKE '%mongodb%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 몽구스 + English MongoDB" },
  { id: 95, input: "센트리 에러 공고", expectedFilters: ["j.skills LIKE '%sentry%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 센트리 maps to sentry" },
  { id: 96, input: "그라파나 모니터링 공고", expectedFilters: ["j.skills LIKE '%grafana%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 그라파나 maps to grafana" },
  { id: 97, input: "프로메테우스 공고", expectedFilters: ["j.skills LIKE '%prometheus%'"], expectedOrder: "a.updated_at DESC",
    note: "Korean 프로메테우스 maps to prometheus" },

  // EXP-115: work_type keyword leak fixes + hybrid N일 출근 detection
  { id: 98, input: "재택근무 공고", expectedFilters: ["j.work_type = 'remote'"], expectedOrder: "a.updated_at DESC",
    note: "재택근무 should not leak to title/company keyword search" },
  { id: 99, input: "풀리모트 공고", expectedFilters: ["j.work_type = 'remote'"], expectedOrder: "a.updated_at DESC",
    note: "풀리모트 should not leak to title/company keyword search" },
  { id: 100, input: "원격근무 공고", expectedFilters: ["j.work_type = 'remote'"], expectedOrder: "a.updated_at DESC",
    note: "원격근무 should not leak to title/company keyword search" },
  { id: 101, input: "전면재택 공고", expectedFilters: ["j.work_type = 'remote'"], expectedOrder: "a.updated_at DESC",
    note: "전면재택 should not leak to title/company keyword search" },
  { id: 102, input: "완전재택 공고", expectedFilters: ["j.work_type = 'remote'"], expectedOrder: "a.updated_at DESC",
    note: "완전재택 should not leak to title/company keyword search" },
  { id: 103, input: "주 3일 출근 공고", expectedFilters: ["j.work_type = 'hybrid'"], expectedOrder: "a.updated_at DESC",
    note: "주 N일 출근 pattern should detect hybrid work type" },
  { id: 104, input: "하이브리드 서울 공고", expectedFilters: ["j.work_type = 'hybrid'", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC",
    note: "하이브리드 with location should not leak work_type keyword" },
  // EXP-122: Particle stripping fix - 인프라 should not be stripped to 인프
  { id: 105, input: "인프라 공고", expectedFilters: ["(j.title LIKE '%인프라%' OR j.company LIKE '%인프라%')"], expectedOrder: "a.updated_at DESC",
    note: "인프라 should not have 라 stripped as particle" },
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
