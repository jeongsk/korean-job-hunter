# korean-job-hunter

AI-powered Korean job hunting assistant. Runs as a plugin on both Claude Code and OpenClaw.

Collects job postings from Wanted, JobKorea, and LinkedIn, matches them against your resume, and tracks your application pipeline.

---

## Project Structure

```
korean-job-hunter/
├── skills/                    # Shared skills (both platforms)
│   ├── job-matching/SKILL.md  # Resume × Job matching (0-100 score)
│   ├── job-scraping/SKILL.md  # Web scraping via agent-browser
│   └── job-tracking/SKILL.md  # SQLite application pipeline
├── agents/                    # Claude Code agents
│   ├── scraper-agent.md       # Job collection specialist
│   ├── matcher-agent.md       # Match analysis specialist
│   ├── resume-agent.md        # Resume parsing specialist
│   └── tracker-agent.md       # Application tracking specialist
├── commands/                  # Claude Code slash commands
│   ├── job-search.md
│   ├── job-match.md
│   ├── job-resume.md
│   └── job-track.md
├── scripts/                   # Utility scripts
├── data/                      # Runtime data (gitignored)
├── reports/                   # Improvement reports
├── extensions/                # OpenClaw plugin entry point
├── .claude-plugin/            # Claude Code manifest
├── openclaw.plugin.json       # OpenClaw manifest
├── package.json               # npm package config
└── README.md
```

---

## Skills (do NOT add more without updating this list)

| Skill | Purpose |
|-------|---------|
| `job-scraping` | Collect postings from Wanted, JobKorea, LinkedIn using agent-browser with custom User-Agent |
| `job-matching` | Score resume vs job posting (skill 50%, experience 15%, preferred 10%, work type 15%, commute 10%) |
| `job-tracking` | SQLite CRUD for application pipeline (interested → applying → applied → interview → offer) |

### Excluded skills

- **autoresearch** — Meta-tool for self-improvement experiments. Lives at `~/.claude/skills/autoresearch/`, never in this project.

---

## Key Technical Details

### Scraping

- **Tool**: agent-browser with `--user-agent` flag (mandatory, otherwise 403 from Wanted)
- **Selectors**:
  - Wanted: `a[href*="/wd/"]` (CSS class selectors don't work)
  - JobKorea: `[class*=dlua7o0]`
  - LinkedIn: `.base-card`
- **Fallback chain**: agent-browser → web_fetch → web_search → manual

### Matching Weights (autoresearch-optimized)

| Component | Weight |
|-----------|--------|
| Skill match | 50% |
| Experience | 15% |
| Preferred qualifications | 10% |
| Work type | 15% |
| Commute | 10% |

---

## Platform Support

| Component | Claude Code | OpenClaw |
|-----------|-------------|----------|
| Manifest | `.claude-plugin/plugin.json` | `openclaw.plugin.json` |
| Entry point | commands/ + agents/ | `extensions/index.ts` |
| Skills | `skills/*/SKILL.md` | `skills/*/SKILL.md` (shared) |
| CLI | `/korean-job-hunter:*` | `openclaw job-*` |

### OpenClaw config

```yaml
plugins:
  entries:
    korean-job-hunter:
      enabled: true
      config:
        kakaoApiKey: "${KAKAO_REST_API_KEY}"
        defaultMaxCommute: 60
        dataPath: "data"
```

### Claude Code install

```bash
claude plugin install jeongsk/korean-job-hunter
# or local dev:
claude --plugin-dir .
```

---

## Development Rules

1. **Always update related files** — when modifying a skill, update the corresponding agent .md file too
2. **Write reports** — save improvement reports to `reports/` directory
3. **Commit after each change** — use meaningful commit messages
4. **Keep skills focused** — only 3 skills belong in this project (see above)
5. **Test scraping with agent-browser** — always use `--user-agent` flag
