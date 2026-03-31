---
name: job-matching
description: "Resume-to-job matching with tiered skill similarity, skill-gated scoring, and primary domain alignment"
---

# Job Matching Skill v3.2 (EXP-048: Korean Culture Patterns + WLB)

## Score Weights (Validated — EXP-017)

| Component | Weight | Score Range | Description |
|-----------|--------|-------------|-------------|
| **Skill match** | **35%** | 0-100 | Core skill alignment with tiered matching |
| **Experience fit** | **25%** | 0-100 | Career stage and experience level alignment |
| **Company culture fit** | **15%** | 0-100 | Cultural values and work environment matching |
| **Career stage alignment** | **15%** | 0-100 | Professional development stage compatibility |
| **Location/work fit** | **10%** | 0-100 | Work type and location preference alignment |

## Discrimination Requirements (EXP-028)

After scoring, these rules must hold:
- **HIGH** group: score ≥ 70
- **MEDIUM** group: score ≤ 65
- **HIGH min − MED max** gap ≥ 15
- **LOW** group: score ≤ 25

## Skill-Gated Scoring (EXP-021, tuned EXP-037)

When skill score < 40, all non-skill components are dampened by a quadratic gate multiplier:
- Multiplier = `(skillScore / 40)²`, minimum 0.04
- At skill=0: gate=0.04, skill=10: gate=0.0625, skill=20: gate=0.25, skill=40: gate=1.0
- This prevents unrelated jobs from scoring high on experience/culture/location alone
- Experience scoring considers range upper bounds (e.g., "3~7년" with 5 years experience = 95)

## Primary Domain Alignment (EXP-024, tuned EXP-037)

When the job's primary technology stack has zero overlap with the candidate's core domain skills, the skill score is penalized by **40%** (multiplied by 0.60).

Primary domains detected: Python, Java, JavaScript/TypeScript, Go, Rust, Swift, C++, C#

This prevents infrastructure-only overlap (AWS, Docker, PostgreSQL) from inflating scores for jobs in completely different primary tech stacks.

## Technology Similarity Map

### Tier 1: Exact Equivalents (100%)
- TypeScript ↔ JavaScript
- React ↔ Next.js
- Vue ↔ Nuxt.js
- PostgreSQL ↔ MySQL ↔ SQL
- Docker ↔ Container

### Tier 2: Strong Compatibility (75%)
- Spring ↔ Spring Boot
- Express ↔ Node.js ↔ NestJS
- FastAPI ↔ Python
- Django ↔ Python
- AWS ↔ GCP ↔ Azure ↔ Cloud

### Tier 3: Partial Overlap (25%)
- React ↔ Vue (frontend frameworks)
- Node.js ↔ Python (server-side)
- AWS ↔ Docker (cloud/containers)
- Kubernetes ↔ Container
- SQL ↔ NoSQL (data handling)

### Tier 4: Context-Based Matches (50%)
- Domain-specific associations
- Technology stack relationships

## Job Intent Classification

Categorize job postings by technical domain:
- **Development**: 개발, development, engineer, programmer
- **Data**: 데이터, data, analytics, AI/ML
- **Management**: 매니저, manager, leader, pm
- **Design**: 디자인, design, ui/ux
- **Sales**: 영업, sales, business development
- **Research**: 연구, research, scientist, r&d

## Company Culture Keywords (EXP-043, EXP-048)

Culture keywords are extracted from job listing text by the scraper (see `skills/job-scraping/SKILL.md`):
- **Innovative**: 혁신, 도전, 창의, 크리에이티브, creative, innovation, 실험, experiment
- **Collaborative**: 협업, 팀워크, 소통, 협력, collaborat*, teamwork, 함께, 공동, 수평적, 가로형, 크로스 펑셔널
- **Fast-paced**: 빠른, agile, 실시간, 스타트업, fast-paced, 릴리즈, 스프린트, sprint
- **Structured**: 체계, 프로세스, systematic, QA, 품질관리, 코드리뷰, code review, 가이드라인
- **Learning-focused**: 성장, 학습, learning, 교육, 스터디, 멘토링, 세미나, 사내강의, 도서지원
- **Autonomous**: 자율, 독립, autonomous, 자기주도, 오너십, 자유도, 주도적
- **Work-life balance**: 워라밸, 워크라이프밸런스, WLB, 유연근무, 시차출근, 자유출퇴근, 연차, 리프레시, 가족친화

When `culture_keywords` is empty/null, culture score defaults to 70 (neutral). When present, score is based on overlap with candidate's `cultural_preferences`.

## Matching Workflow

1. **Parse job** → extract skills, experience range, culture keywords, work type, location
2. **Load candidate** → from `data/resume/master.yaml` (skill_summary, experience_years, career_stage, preferences, cultural_preferences)
3. **Score each component** using weights above, with skill-gate and domain alignment adjustments
4. **Verify discrimination** — HIGH/MED/LOW groups must satisfy gap requirements
5. **Output match report** with scores, matched/missing skills, and recommendations

## Output Format

```json
{
  "job_id": "JOB-001",
  "overall_score": 78,
  "components": {
    "skills": { "score": 80, "weighted": 28, "matched": ["Node.js", "TypeScript"], "missing": ["Docker"] },
    "experience": { "score": 75, "weighted": 19 },
    "culture": { "score": 90, "weighted": 14, "matched": ["innovative", "collaborative"] },
    "career_stage": { "score": 85, "weighted": 13 },
    "location": { "score": 100, "weighted": 10 }
  },
  "recommendations": ["Docker 경험 추가 학습 권장"]
}
```

## Career Stage Mapping

| Years | Stage |
|-------|-------|
| 0-1 | entry |
| 1-3 | junior |
| 3-7 | mid |
| 7-12 | senior |
| 12+ | lead |
