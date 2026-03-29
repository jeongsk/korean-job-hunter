---
name: job-matching
description: "Resume-to-job matching analysis with skill scoring, experience evaluation, and commute/work-type preference calculation"
---

# Job Matching Skill

## Score Weights (Enhanced)

| Component | Weight | Score Range |
|-----------|--------|-------------|
| Skill match | 60% | 0-100 |
| Experience | 15% | 0-100 |
| Preferred qualifications | 10% | 0-100 |
| Work type preference | 10% | 0-100 |
| Commute distance | 5% | 0-100 |

## Skill Matching Algorithm

### Step 1: Extract Skills from JD
Parse job description to identify:
- Required skills (필수, required, must-have)
- Preferred skills (우대, preferred, nice-to-have)

### Step 2: Enhanced Resume Comparison with Graduated Scoring

For each JD skill, check against resume skills using graduated matching:

#### Exact Match: 100% credit
- Same technology (e.g., "Node.js" ↔ "Node.js")
- Direct equivalents (e.g., "TypeScript" ↔ "JavaScript")

#### Strong Compatibility: 75% credit  
- Tier 2 matches from similarity map
- Direct framework associations (e.g., "Express" ↔ "Node.js")

#### Partial Overlap: 25% credit
- Tier 3 matches from similarity map  
- General technology domains (e.g., "Python" ↔ "Java" in data context)

#### Context Match: 50% credit
- Special context-based matches
- Domain expertise crossover

#### No Match: 0% credit
- Completely unrelated technologies

### Step 3: Calculate Weighted Score
```
skill_score = (
  (exact_matches + (strong_matches * 0.75) + (partial_matches * 0.25) + (context_matches * 0.5)) / 
  total_required_skills
) * 70 + (
  (exact_preferred + (strong_preferred * 0.75) + (partial_preferred * 0.25) + (context_preferred * 0.5)) / 
  total_preferred_skills  
) * 30
```

### Matching Logic Implementation
```javascript
function calculateSkillMatchScore(jdSkills, resumeSkills) {
  let exact = 0, strong = 0, partial = 0, context = 0;
  
  jdSkills.forEach(jdSkill => {
    resumeSkills.forEach(resumeSkill => {
      if (jdSkill === resumeSkill) exact++;
      else if (tier2Matches[jdSkill]?.includes(resumeSkill)) strong++;
      else if (tier3Matches[jdSkill]?.includes(resumeSkill)) partial++;
      else if (contextMatches[jdSkill]?.includes(resumeSkill)) context++;
    });
  });
  
  const requiredMatches = exact + (strong * 0.75) + (partial * 0.25) + (context * 0.5);
  const requiredRatio = requiredMatches / jdSkills.filter(s => !isPreferredSkill(s)).length;
  
  return Math.round(requiredRatio * 70); // Base 70 points for required skills
}
```

## Enhanced Technology Similarity Map

### Tier 1: Exact Equivalents (100% credit)
- TypeScript ↔ JavaScript
- React ↔ Next.js  
- Vue ↔ Nuxt.js
- PostgreSQL ↔ MySQL ↔ SQL
- Docker ↔ Container

### Tier 2: Strong Compatibility (75% credit)
- Spring ↔ Spring Boot
- Express ↔ Node.js ↔ NestJS
- FastAPI ↔ Python
- Django ↔ Python
- AWS ↔ GCP ↔ Azure ↔ Cloud

### Tier 3: Partial Overlap (25% credit)
- React ↔ Vue
- Node.js ↔ Python
- AWS ↔ Docker
- Kubernetes ↔ Container
- SQL ↔ NoSQL
- Python ↔ Java (data engineering context)
- JavaScript ↔ TypeScript (any context)

### Special Context Matches (50% credit)
- Frontend: React ↔ Vue (web frameworks)
- Backend: Node.js ↔ Python (server-side)
- Database: SQL ↔ NoSQL (general data handling)
- DevOps: Docker ↔ Kubernetes (containerization)
- Mobile: Swift ↔ Kotlin (cross-platform familiarity)

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
