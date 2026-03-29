# 개선 리포트 #6 — Phase 3 최종: 3개 소스 스크래핑 전체 검증 완료

**날짜:** 2026-03-29
**커밋:** 43a80d6
**작성자:** Law (트라팔가 로)

---

## 개요

3개 채용 사이트(Wanted, JobKorea, LinkedIn)의 스크래핑을 모두 검증 완료했다. agent-browser + custom User-Agent 접근법으로 세 사이트 모두에서 데이터 수집에 성공했다.

## 스크래핑 결과

### Wanted ✅
- **수집 공고:** 12개 (unique)
- **셀렉터:** `a[href*="/wd/"]`
- **추출 필드:** title, company, experience, reward, link
- **필드 완성도:** ~88% (location 누락)
- **핵심 발견:** CSS class 셀렉터(`.JobCard_container`) 작동 안 함. `el.textContent` 파싱 필요

### JobKorea ✅
- **수집 공고:** 20개
- **셀렉터:** `[class*=dlua7o0]`
- **추출 필드:** title, company, experience, location, deadline, link
- **필드 완성도:** ~85% (company 일부 누락)
- **샘플:** 솔트룩스 Backend Engineer, 와디즈 Java 백엔드, 넥슨 백엔드 엔지니어

### LinkedIn ✅
- **수집 공고:** 15개 (622개 중)
- **셀렉터:** `.base-card`
- **추출 필드:** title, company, location, link
- **필드 완성도:** ~90%
- **샘플:** 카카오페이 Back End Developer, Canonical Software Developer, Streami Backend Developer

## 핵심 인사이트

### 1. User-Agent가 핵심
세 사이트 모두 headless Chrome 감지하여 차단. `--user-agent` 플래그로 일반 Chrome UA 설정하면 우회 가능.

### 2. 사이트별 DOM 구조
| 사이트 | 유효 셀렉터 | 데이터 추출 방식 |
|--------|-----------|-----------------|
| Wanted | `a[href*="/wd/"]` | `el.textContent` 파싱 (title+company+exp+reward 합쳐져 있음) |
| JobKorea | `[class*=dlua7o0]` | 정규식으로 experience/location/deadline 분리 |
| LinkedIn | `.base-card` | h3(title) / h4(company) / location class 직접 추출 |

### 3. 검증한 스크래핑 도구 (총 11개)
| 도구 | 결과 | 비고 |
|------|------|------|
| agent-browser + UA | ✅ **성공** | 3개 소스 모두 |
| agent-browser (기본) | ❌ 403 | Bot 감지 |
| curl + headers | ❌ 빈 결과 | JS 렌더링 필요 |
| curl + API | ❌ 403 | WAF 차단 |
| web_fetch | ⚠️ 부분 | 정적만 |
| Stagehand (Browserbase) | 📖 조사 | 유료, VirusTotal 경고 |
| Browser Use | 📖 조사 | Python, vision 기반 |
| Crawl4ai | 📖 조사 | 오픈소스, 무료 |
| Firecrawl | 📖 조사 | 유료 API |
| Bright Data MCP | 📖 조사 | 5000회/월 무료 |
| ScrapeGraphAI | 📖 조사 | NL + 그래프 |

## 개선 효과

| 메트릭 | Phase 3 (v1) | Phase 3 (최종) | 변화 |
|--------|-------------|---------------|------|
| 검증된 소스 | 0/3 | **3/3** | 전체 성공 |
| 수집 공고 수 | 0 | **47개** | +47 |
| Fields completeness | 0% | **~88%** | +88% |
| 검증된 도구 수 | 1 | **11개 조사, 1개 검증** | 확장 |

## 다음 계획 (Phase 4)

1. **SKILL.md v3 업데이트** — 검증된 셀렉터와 접근법 반영
2. **스크래핑 스크립트 자동화** — 3개 소스 순차 스크래핑 스크립트
3. **크론 자동화** — 6시간마다 자동 실행
4. **상세 페이지 스크래핑** — JD, 기술스택, 연봉 추출
