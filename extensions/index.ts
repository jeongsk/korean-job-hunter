/**
 * Korean Job Hunter - OpenClaw Plugin Entry Point
 *
 * This plugin provides AI-powered job hunting capabilities for Korean job markets:
 * - Job scraping from Wanted, Jobkorea, LinkedIn
 * - Resume-to-job matching analysis
 * - Application tracking with SQLite
 * - Commute time calculation via Kakao Map API
 */

import type { PluginApi } from "openclaw";

export default function register(api: PluginApi) {
  const logger = api.logger.child({ plugin: "korean-job-hunter" });

  // Register CLI commands
  api.registerCli(
    ({ program }) => {
      // Job search command
      program
        .command("job-search")
        .description("Search job postings from Korean job sites")
        .option("-k, --keyword <keyword>", "Search keyword")
        .option("-s, --source <source>", "Job source (wanted, jobkorea, linkedin)")
        .option("-l, --limit <number>", "Maximum results", "20")
        .action(async (options) => {
          logger.info("Job search started", { options });
          console.log(`
Job Search Command
==================
Keyword: ${options.keyword || "not specified"}
Source: ${options.source || "all"}
Limit: ${options.limit}

Usage: Use the job-scraping skill for detailed scraping operations.
Run: /job-search to invoke the skill with AI assistance.
          `);
        });

      // Job match command
      program
        .command("job-match")
        .description("Match resume against job postings")
        .option("-j, --job-id <jobId>", "Job ID to match against")
        .option("-r, --resume <file>", "Resume file path")
        .action(async (options) => {
          logger.info("Job match started", { options });
          console.log(`
Job Match Command
=================
Job ID: ${options.jobId || "not specified"}
Resume: ${options.resume || "default resume"}

Usage: Use the job-matching skill for detailed matching analysis.
Run: /job-match to invoke the skill with AI assistance.
          `);
        });

      // Job track command
      program
        .command("job-track")
        .description("Track job application status")
        .option("-s, --status <status>", "Filter by status")
        .option("--stats", "Show pipeline statistics")
        .action(async (options) => {
          logger.info("Job track started", { options });
          console.log(`
Job Track Command
=================
Status Filter: ${options.status || "all"}
Show Stats: ${options.stats || false}

Usage: Use the job-tracking skill for detailed tracking operations.
Run: /job-track to invoke the skill with AI assistance.
          `);
        });

      // Job resume command
      program
        .command("job-resume")
        .description("Manage master resume file")
        .option("-p, --parse <file>", "Parse resume from PDF/YAML")
        .option("-v, --view", "View current resume")
        .action(async (options) => {
          logger.info("Job resume started", { options });
          console.log(`
Job Resume Command
==================
Parse File: ${options.parse || "none"}
View Resume: ${options.view || false}

Usage: Use the resume-agent for detailed resume management.
Run: /job-resume to invoke the skill with AI assistance.
          `);
        });

      logger.info("CLI commands registered");
    },
    { commands: ["job-search", "job-match", "job-track", "job-resume"] }
  );

  // Register auto-reply commands
  api.registerCommand({
    name: "job-stats",
    description: "Show job hunting statistics",
    requireAuth: true,
    handler: (ctx) => {
      return {
        text: `Job Hunting Statistics

Use /job-track --stats for detailed pipeline statistics.
Available statuses:
- interested: Jobs you're interested in
- applying: Currently applying
- applied: Application submitted
- interview: Interview scheduled
- offer: Offer received
- rejected: Application rejected
- declined: You declined the offer`,
      };
    },
  });

  logger.info("Korean Job Hunter plugin loaded");
}
