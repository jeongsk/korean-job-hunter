---
name: job-matching
description: "Resume-to-job matching analysis with skill scoring, experience evaluation, and commute/work-type preference calculation"
---

# Job Matching Skill

## Score Weights

| Component | Weight | Score Range |
|-----------|--------|-------------|
| Skill match | 40% | 0-100 |
| Experience | 20% | 0-100 |
| Preferred qualifications | 10% | 0-100 |
| Work type preference | 15% | 0-100 |
| Commute distance | 15% | 0-100 |

## Skill Matching Algorithm

### Step 1: Extract Skills from JD
Parse job description to identify:
- Required skills (필수, required, must-have)
- Preferred skills (우대, preferred, nice-to-have)

### Step 2: Compare with Resume
For each JD skill, check against resume skills:
- Exact match: 100% credit
- Related technology: 50% credit (e.g., Express.js ≈ Node.js, Spring Boot ≈ Spring)
- No match: 0% credit

### Step 3: Calculate Score
```
skill_score = (matched_required / total_required) * 70 + (matched_preferred / total_preferred) * 30
```

## Technology Similarity Map

Related technologies that earn partial credit:
- TypeScript ↔ JavaScript
- React ↔ Next.js
- Vue ↔ Nuxt.js
- Spring ↔ Spring Boot
- Express ↔ Node.js ↔ NestJS
- FastAPI ↔ Python ↔ Django
- PostgreSQL ↔ MySQL ↔ SQL
- Docker ↔ Kubernetes ↔ Container
- AWS ↔ GCP ↔ Azure ↔ Cloud

## Experience Evaluation

### Parsing Years from JD
- Look for: "N년 이상", "N+ years", "경력 N년"
- Extract numeric value

### Scoring
| Condition | Score |
|-----------|-------|
| Meets or exceeds | 100 |
| 1 year below | 70 |
| 2 years below | 40 |
| 3+ years below | 10 |
| 3+ years above (overqualified) | 80 |

## Work Type Scoring

Resume preference priority list (e.g., [remote, hybrid, onsite]):
| Match Position | Score |
|---------------|-------|
| #1 preference | 100 |
| #2 preference | 70 |
| #3 preference | 40 |
| Not in list | 0 |

## Commute Scoring

| Condition | Score |
|-----------|-------|
| Remote job | 100 |
| Commute ≤ 50% of max | 100 |
| Commute ≤ 75% of max | 80 |
| Commute ≤ 100% of max | 60 |
| Commute ≤ 120% of max | 30 |
| Commute > 120% of max | 0 |
| Unknown commute | 50 |

## Report Generation

Generate JSON report structure:
```json
{
  "job_id": "...",
  "overall_score": 85,
  "components": {
    "skill": { "score": 86, "weighted": 34, "matched": [], "missing": [] },
    "experience": { "score": 100, "weighted": 20, "required": 3, "actual": 3 },
    "preferred": { "score": 60, "weighted": 6, "matched": [], "missing": [] },
    "work_type": { "score": 100, "weighted": 15, "job": "remote", "preference_rank": 1 },
    "commute": { "score": 100, "weighted": 15, "minutes": null, "max": 60 }
  },
  "suggestions": ["Add Kubernetes experience to resume"]
}
```
