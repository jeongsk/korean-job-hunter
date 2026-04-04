import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH ?? join(__dirname, "../../data/jobs.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize schema if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id               TEXT PRIMARY KEY,
    source           TEXT NOT NULL,
    title            TEXT NOT NULL,
    company          TEXT NOT NULL,
    url              TEXT UNIQUE NOT NULL,
    content          TEXT,
    location         TEXT,
    office_address   TEXT,
    work_type        TEXT,
    commute_min      INTEGER,
    experience       TEXT,
    salary           TEXT,
    salary_min       INTEGER,
    salary_max       INTEGER,
    deadline         TEXT,
    reward           TEXT,
    culture_keywords TEXT,
    skills           TEXT DEFAULT '',
    employment_type  TEXT DEFAULT 'regular',
    career_stage     TEXT,
    created_at       TEXT DEFAULT (datetime('now')),
    fetched_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS matches (
    id            TEXT PRIMARY KEY,
    job_id        TEXT NOT NULL REFERENCES jobs(id),
    resume_hash   TEXT NOT NULL,
    score         INTEGER NOT NULL,
    skill_score   INTEGER,
    location_score INTEGER,
    report        TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id            TEXT PRIMARY KEY,
    job_id        TEXT NOT NULL REFERENCES jobs(id),
    status        TEXT NOT NULL DEFAULT 'interested',
    memo          TEXT,
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
  CREATE INDEX IF NOT EXISTS idx_jobs_work_type ON jobs(work_type);
  CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
  CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
  CREATE INDEX IF NOT EXISTS idx_matches_job_id ON matches(job_id);
  CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(score DESC);
  CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
  CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

  -- Safe column additions (no-op if column already exists)
  -- SQLite doesn't support IF NOT EXISTS for columns, so we use a pragma trick:
  -- These are idempotent only for new databases; existing DBs already have these columns.
`);

// Type definitions
interface Job {
  id?: string;
  source: string;
  title: string;
  company: string;
  url: string;
  content?: string;
  location?: string;
  office_address?: string;
  work_type?: string;
  commute_min?: number;
  experience?: string;
  salary?: string;
  salary_min?: number;
  salary_max?: number;
  deadline?: string;
  reward?: string;
  culture_keywords?: string;
  skills?: string;
  employment_type?: string;
  career_stage?: string;
}

interface Match {
  id?: string;
  job_id: string;
  resume_hash: string;
  score: number;
  skill_score?: number;
  location_score?: number;
  report?: string;
}

interface JobFilters {
  source?: string;
  work_type?: string;
  min_score?: number;
  max_commute?: number;
  min_salary?: number;
  max_salary?: number;
  location?: string;
  skills?: string;
  experience?: string;
  employment_type?: string;
  career_stage?: string;
  deadline_before?: string;
  limit?: number;
}

// Prepared statements
const insertJob = db.prepare(`
  INSERT OR REPLACE INTO jobs (
    id, source, title, company, url, content, location, office_address,
    work_type, commute_min, experience, salary, salary_min, salary_max,
    deadline, reward, culture_keywords, skills, employment_type, career_stage, fetched_at
  ) VALUES (
    @id, @source, @title, @company, @url, @content, @location, @office_address,
    @work_type, @commute_min, @experience, @salary, @salary_min, @salary_max,
    @deadline, @reward, @culture_keywords, @skills, @employment_type, @career_stage, datetime('now')
  )
`);

const insertMatch = db.prepare(`
  INSERT INTO matches (id, job_id, resume_hash, score, skill_score, location_score, report)
  VALUES (@id, @job_id, @resume_hash, @score, @skill_score, @location_score, @report)
`);

const insertApplication = db.prepare(`
  INSERT OR IGNORE INTO applications (id, job_id, status)
  VALUES (@id, @job_id, 'interested')
`);

const updateApplication = db.prepare(`
  UPDATE applications
  SET status = @status, memo = COALESCE(@memo, memo), updated_at = datetime('now')
  WHERE id = @id
`);

const getJobById = db.prepare(`SELECT * FROM jobs WHERE id = ?`);

const getApplications = db.prepare(`
  SELECT a.*, j.title, j.company, j.url, j.work_type, j.commute_min,
         j.salary, j.salary_min, j.salary_max, j.experience, j.deadline,
         j.skills, j.employment_type, j.career_stage, j.location, j.source
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  ORDER BY a.updated_at DESC
`);

// MCP Server
const server = new Server(
  { name: "job-hunter", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "db_save_job",
      description: "Save a job posting to the SQLite database",
      inputSchema: {
        type: "object",
        properties: {
          job: {
            type: "object",
            description: "Job posting object",
            properties: {
              source: { type: "string", description: "Source: linkedin | jobkorea | wanted" },
              title: { type: "string", description: "Job title" },
              company: { type: "string", description: "Company name" },
              url: { type: "string", description: "Job posting URL (unique)" },
              content: { type: "string", description: "Raw JD text" },
              location: { type: "string", description: "City/region" },
              office_address: { type: "string", description: "Office detail address for commute calc" },
              work_type: { type: "string", description: "remote | hybrid | onsite" },
              commute_min: { type: "number", description: "Estimated commute time in minutes" },
              experience: { type: "string", description: "Experience requirement (e.g. '경력 5년 이상')" },
              salary: { type: "string", description: "Raw salary text" },
              salary_min: { type: "number", description: "Normalized minimum salary (만원)" },
              salary_max: { type: "number", description: "Normalized maximum salary (만원)" },
              deadline: { type: "string", description: "Application deadline (ISO date)" },
              reward: { type: "string", description: "Referral reward text" },
              culture_keywords: { type: "string", description: "JSON array of culture keywords" },
              skills: { type: "string", description: "Comma-separated skill list" },
              employment_type: { type: "string", description: "regular | contract | intern | freelance" },
              career_stage: { type: "string", description: "junior | mid | senior | lead" },
            },
            required: ["source", "title", "company", "url"],
          },
        },
        required: ["job"],
      },
    },
    {
      name: "db_search_jobs",
      description: "Search jobs with filters",
      inputSchema: {
        type: "object",
        properties: {
          filters: {
            type: "object",
            description: "Search filters",
            properties: {
              source: { type: "string", description: "Filter by source" },
              work_type: { type: "string", description: "Filter by work type" },
              min_score: { type: "number", description: "Minimum match score (0-100)" },
              max_commute: { type: "number", description: "Maximum commute time in minutes" },
              min_salary: { type: "number", description: "Minimum salary (만원)" },
              max_salary: { type: "number", description: "Maximum salary (만원)" },
              location: { type: "string", description: "Location filter (partial match)" },
              skills: { type: "string", description: "Skill filter (partial match)" },
              experience: { type: "string", description: "Experience filter (partial match)" },
              employment_type: { type: "string", description: "Employment type filter" },
              career_stage: { type: "string", description: "Career stage filter" },
              deadline_before: { type: "string", description: "Deadline before date (ISO)" },
              limit: { type: "number", description: "Max results (default 20)" },
            },
          },
        },
      },
    },
    {
      name: "db_save_match",
      description: "Save a resume match result for a job",
      inputSchema: {
        type: "object",
        properties: {
          match: {
            type: "object",
            description: "Match result object",
            properties: {
              job_id: { type: "string", description: "Job ID" },
              resume_hash: { type: "string", description: "Hash of the resume used" },
              score: { type: "number", description: "Overall match score 0-100" },
              skill_score: { type: "number", description: "Skill match score" },
              location_score: { type: "number", description: "Location/work-type score" },
              report: { type: "string", description: "JSON report string" },
            },
            required: ["job_id", "resume_hash", "score"],
          },
        },
        required: ["match"],
      },
    },
    {
      name: "db_get_applications",
      description: "Get all job applications with job details",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "db_update_application",
      description: "Update application status and memo",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Application ID" },
          status: {
            type: "string",
            description: "New status: interested | applying | applied | rejected | interview | offer | declined",
          },
          memo: { type: "string", description: "Optional memo/note" },
        },
        required: ["id", "status"],
      },
    },
    {
      name: "db_get_job",
      description: "Get a single job by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Job ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "db_get_stats",
      description: "Get summary statistics for the job hunt",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "db_save_job": {
        const job = args?.job as Job;
        const id = job.id ?? crypto.randomUUID();
        insertJob.run({ ...job, id });

        // Auto-create application entry
        const appId = crypto.randomUUID();
        insertApplication.run({ id: appId, job_id: id });

        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, id }) }],
        };
      }

      case "db_search_jobs": {
        const filters = (args?.filters ?? {}) as JobFilters;
        const conditions: string[] = [];
        const params: (string | number)[] = [];

        if (filters.source) {
          conditions.push("j.source = ?");
          params.push(filters.source);
        }
        if (filters.work_type) {
          conditions.push("j.work_type = ?");
          params.push(filters.work_type);
        }
        if (filters.max_commute !== undefined) {
          conditions.push("(j.commute_min IS NULL OR j.commute_min <= ?)");
          params.push(filters.max_commute);
        }
        if (filters.min_salary !== undefined) {
          conditions.push("j.salary_min IS NOT NULL AND j.salary_min >= ?");
          params.push(filters.min_salary);
        }
        if (filters.max_salary !== undefined) {
          conditions.push("(j.salary_max IS NULL OR j.salary_max <= ?)");
          params.push(filters.max_salary);
        }
        if (filters.location) {
          conditions.push("j.location LIKE ?");
          params.push(`%${filters.location}%`);
        }
        if (filters.skills) {
          conditions.push("j.skills LIKE ?");
          params.push(`%${filters.skills}%`);
        }
        if (filters.experience) {
          conditions.push("j.experience LIKE ?");
          params.push(`%${filters.experience}%`);
        }
        if (filters.employment_type) {
          conditions.push("j.employment_type = ?");
          params.push(filters.employment_type);
        }
        if (filters.career_stage) {
          conditions.push("j.career_stage = ?");
          params.push(filters.career_stage);
        }
        if (filters.deadline_before) {
          conditions.push("(j.deadline IS NOT NULL AND j.deadline != '' AND j.deadline <= ?)");
          params.push(filters.deadline_before);
        }

        let query = `
          SELECT j.*, m.score, m.skill_score, m.location_score
          FROM jobs j
          LEFT JOIN (
            SELECT job_id, MAX(score) as score, skill_score, location_score
            FROM matches
            GROUP BY job_id
          ) m ON j.id = m.job_id
        `;

        if (filters.min_score !== undefined) {
          conditions.push("m.score >= ?");
          params.push(filters.min_score);
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY COALESCE(m.score, 0) DESC";
        query += ` LIMIT ${filters.limit ?? 20}`;

        const jobs = db.prepare(query).all(...params);
        return {
          content: [{ type: "text", text: JSON.stringify(jobs) }],
        };
      }

      case "db_save_match": {
        const match = args?.match as Match;
        const id = match.id ?? crypto.randomUUID();
        insertMatch.run({ ...match, id });
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, id }) }],
        };
      }

      case "db_get_applications": {
        const applications = getApplications.all();
        return {
          content: [{ type: "text", text: JSON.stringify(applications) }],
        };
      }

      case "db_update_application": {
        const { id, status, memo } = args as { id: string; status: string; memo?: string };
        updateApplication.run({ id, status, memo: memo ?? null });
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true }) }],
        };
      }

      case "db_get_job": {
        const { id } = args as { id: string };
        const job = getJobById.get(id);
        return {
          content: [{ type: "text", text: JSON.stringify(job ?? null) }],
        };
      }

      case "db_get_stats": {
        const stats = {
          total_jobs: (db.prepare("SELECT COUNT(*) as count FROM jobs").get() as { count: number }).count,
          by_source: db.prepare("SELECT source, COUNT(*) as count FROM jobs GROUP BY source").all(),
          by_work_type: db.prepare("SELECT work_type, COUNT(*) as count FROM jobs GROUP BY work_type").all(),
          by_status: db.prepare("SELECT status, COUNT(*) as count FROM applications GROUP BY status").all(),
          by_employment_type: db.prepare("SELECT employment_type, COUNT(*) as count FROM jobs GROUP BY employment_type").all(),
          salary_coverage: (db.prepare("SELECT COUNT(*) as count FROM jobs WHERE salary_min IS NOT NULL").get() as { count: number }).count,
          skills_coverage: (db.prepare("SELECT COUNT(*) as count FROM jobs WHERE skills IS NOT NULL AND skills != ''").get() as { count: number }).count,
          top_matches: db.prepare(`
            SELECT j.title, j.company, j.salary, j.skills, m.score
            FROM matches m
            JOIN jobs j ON m.job_id = j.id
            ORDER BY m.score DESC
            LIMIT 5
          `).all(),
        };
        return {
          content: [{ type: "text", text: JSON.stringify(stats) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
