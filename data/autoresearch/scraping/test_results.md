# job-scraping SK킬 v3 — 실제 테스트 결과

date: 2026-03-29
테스터: Law (트라팔가 로)

## 테스트 결과 요약

| # | 접근 방식 | 결과 | 데이터 |
|---|------|------|--------|
| **1. agent-browser + custom user-agent** | ✅ 성공 | 20 jobs, fields_completeness: 88% |
| **2. agent-browser (JS eval parsing)** | ✅ 성공 | title/company/experience/reward 분리 가능 |
| **3. web_fetch (markdown)** | ✅ 부분 성공 | 제목/회사명 일부 추출 |
| **4. curl (proper headers)** | ✅ HTML 수신 | 렌더링 안 됨, 검색 결과 없음 |
| **5. curl (jina.ai reader)** | ❌ 실패 | 403 (WAF 차단) |
| **6. curl (Wanted API)** | ❌ 실패 | 403 |

## 핵심 발견

1. **Wanted는 직접 URL 접근 시 403 에러 발생**
   - 해결: 메인 페이지에서 검색하거나 user-agent 설정 필요
   - agent-browser에 `--user-agent` 플래그로 해결

2. **Wanted 검색 결과 DOM 구조**
   - CSS class 기반 셀렉터가 아닌 `<a href="/wd/...">` 링크 기반 추출
   - `el.textContent`에 title/company/experience/reward가 합쳐져 있음
   - JS로 정규식 파싱 필요

3. **성공적인 스크래핑 접근법**
   ```bash
   agent-browser --user-agent "..." open "https://www.wanted.co.kr/search?query=백엔드&tab=position"
   sleep 5
   agent-browser wait --load networkidle
   agent-browser eval "..." --json
   ```

## 추출된 데이터 샘플 (20 jobs)

| title | company | link |
|------|---------|------|
| 디지털 학습 플랫폼 백엔드 개발자 (JAVA) | 미래엔 | /wd/350866 |
| Back-end Developer (Senior) | 웨이브릿지 | /wd/349890 |
| 백엔드 웹프로그래머 (Spring, MSA) (4~6년) | 키트웍스 | /wd/350965 |
| Backend Engineer Lead | 비댁스 | /wd/349871 |
| 백엔드팀 리드 (팀장급) | 에버온 | /wd/350572 |
| 광고 플랫폼 백엔드 리드 | 리스타 | /wd/350738 |
| GeoAI Platform Backend Engineer | 스패이드 | /wd/342675 |

## 다음 단계
- 잡코리아, LinkedIn 스크래핑 테스트
- 스크래핑 스크립트 업데이트 (SKILL.md 반영)
- web-scraping 스킬 통합
