# 개선 리포트 #1 — agent-browser 스크래핑 도구 추가

**날짜:** 2026-03-29
**커밋:** f8b0caf
**작성자:** Law (트라팔가 로)

---

## 개요

`job-scraping` 스킬에 Vercel Labs의 **agent-browser**를 권장 스크래핑 도구로 추가하고, 기존 playwright-cli를 대안으로 유지하는 이중화 구조를 구축했다.

## 변경 파일

| 파일 | 변경 | 설명 |
|------|------|------|
| `skills/job-scraping/SKILL.md` | +232 / -12 | agent-browser 예제, 가이드, 비교표 추가 |

## 상세 변경 사항

### 1. allowed-tools 확장
```yaml
allowed-tools:
  - Bash(agent-browser:*)  # NEW
  - Bash(playwright-cli:*)
  - Bash(sleep)
  - Bash(curl)
```

### 2. 도구 선택 가이드
| 상황 | 추천 도구 | 이유 |
|------|----------|------|
| 일반적인 스크래핑 | agent-browser | Rust 네이티브, 빠름 |
| 복잡한 인증 | agent-browser | auth vault, 세션 암호화 |
| 대량 배치 | agent-browser | batch 모드 |
| 클라우드 브라우저 | agent-browser | Browserless/Browserbase/Kernel |

### 3. 소스별 예제 이중화
- **Wanted** — agent-browser + playwright-cli
- **Jobkorea** — agent-browser + playwright-cli
- **LinkedIn** — agent-browser + playwright-cli

### 4. 추가 기능 문서화
- batch 모드 (JSON 배열로 다중 명령 실행)
- 세션 관리 (session-name, profile)
- 보안 기능 (도메인 allowlist, 액션 정책)
- 대시보드 (실시간 모니터링)

### 5. 도구 비교 표
| 기능 | agent-browser | playwright-cli |
|------|---------------|----------------|
| 성능 | Rust 네이티브 | Node.js 기반 |
| batch 모드 | ✅ | ❌ |
| 클라우드 브라우저 | ✅ | ❌ |
| 대시보드 | ✅ | ❌ |
| iOS Safari | ✅ | ❌ |
| 설치 | npm/brew/cargo | npm |

## 개선 효과

| 지표 | 개선 전 | 개선 후 |
|------|---------|---------|
| 스크래핑 도구 | playwright-cli 단일 | agent-browser + playwright-cli 이중화 |
| 실행 속도 | Node.js 기반 | Rust 네이티브 (agent-browser) |
| 대량 작업 | 명령별 프로세스 | batch 모드 지원 |
| 클라우드 브라우저 | 미지원 | Browserless/Browserbase/Kernel |
| 실시간 모니터링 | 미지원 | 대시보드 |
| 장애 대응 | 단일 도구 | fallback 구조 |

## 다음 계획

1. autoresearch 스킬 프로토타입 작성
2. job-matching 알고리즘 개선
3. 테스트 케이스 정의 및 baseline 측정
