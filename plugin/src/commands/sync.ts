import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig } from "../config/loader";
import { findProjectRoot } from "../config/loader";
import { BacklogApiClient, BacklogClientError } from "../api/client";
import { BacklogIssue } from "../api/types";
import { formatIssueMd } from "../markdown/issue";
import { formatCommentsMd } from "../markdown/comments";

interface SyncOptions {
  all: boolean;
  issue?: string;
  force: boolean;
  dryRun: boolean;
}

function docsDir(): string {
  return path.join(findProjectRoot(), "docs", "backlog");
}

function ensureBacklogGitignore(baseDir: string): void {
  const gitignorePath = path.join(baseDir, ".gitignore");
  if (fs.existsSync(gitignorePath)) return;
  fs.writeFileSync(gitignorePath, "*\n!.gitignore\n");
}

async function syncIssue(
  client: BacklogApiClient,
  issue: BacklogIssue,
  space: string,
  opts: SyncOptions
): Promise<boolean> {
  const issueDir = path.join(docsDir(), issue.issueKey);
  const issuePath = path.join(issueDir, "issue.md");
  const commentsPath = path.join(issueDir, "comments.md");

  if (!opts.force && fs.existsSync(issuePath)) {
    if (opts.dryRun) {
      console.log(`  [SKIP] ${issue.issueKey} - ${issue.summary} (already exists)`);
    }
    return false;
  }

  if (opts.dryRun) {
    console.log(`  [SYNC] ${issue.issueKey} - ${issue.summary}`);
    return true;
  }

  fs.mkdirSync(issueDir, { recursive: true });

  // Fetch attachments list first (needed for issue.md)
  const attachments = await client.getAttachments(issue.issueKey);

  const issueMd = formatIssueMd(issue, space, attachments);
  fs.writeFileSync(issuePath, issueMd);

  const comments = await client.getComments(issue.issueKey);
  const commentsMd = formatCommentsMd(issue.issueKey, issue.summary, comments);
  if (commentsMd) {
    fs.writeFileSync(commentsPath, commentsMd);
  }

  // Download attachment files
  if (attachments.length > 0) {
    const attachDir = path.join(issueDir, "attachments");
    fs.mkdirSync(attachDir, { recursive: true });

    for (const att of attachments) {
      const filePath = path.join(attachDir, att.name);
      if (!opts.force && fs.existsSync(filePath)) continue;

      try {
        const data = await client.downloadAttachment(issue.issueKey, att.id);
        fs.writeFileSync(filePath, data);
      } catch (err) {
        console.warn(`  [WARN] Failed to download attachment: ${att.name}`);
      }
    }
  }

  console.log(`  [OK] ${issue.issueKey} - ${issue.summary}${attachments.length > 0 ? ` (${attachments.length} attachment(s))` : ""}`);
  return true;
}

export async function syncCommand(opts: SyncOptions): Promise<void> {
  const config = loadConfig();
  if (!config) {
    console.error("Error: No configuration found.");
    console.error('Run "cc-backlog config set" first.');
    process.exit(1);
  }

  if (!config.space || !config.apiKey || !config.projectKey) {
    console.error("Error: Incomplete configuration. Run \"cc-backlog config\" to check.");
    process.exit(1);
  }

  const baseDir = docsDir();
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  if (!opts.dryRun) {
    ensureBacklogGitignore(baseDir);
  }

  const client = new BacklogApiClient(config);

  try {
    if (opts.issue) {
      console.log(`Syncing issue: ${opts.issue}`);
      const issue = await client.getIssue(opts.issue);
      await syncIssue(client, issue, config.space, opts);
    } else {
      const project = await client.getProject(config.projectKey);

      let statusFilter: string;
      let statusIds: number[] | undefined;

      if (opts.all) {
        statusFilter = "all statuses";
      } else {
        const statuses = await client.getStatuses(config.projectKey);
        const closedStatuses = statuses.filter(
          (s) => s.name === "Closed" || s.name === "完了"
        );
        const closedIds = new Set(closedStatuses.map((s) => s.id));
        statusIds = statuses.filter((s) => !closedIds.has(s.id)).map((s) => s.id);
        statusFilter = "open issues";
      }

      console.log(`Syncing ${statusFilter} from ${config.projectKey}...`);
      if (opts.dryRun) console.log("(dry run - no files will be written)");
      console.log("");

      const issues = await client.getIssues(project.id, statusIds);
      console.log(`Found ${issues.length} issue(s).`);
      console.log("");

      let synced = 0;
      for (const issue of issues) {
        const didSync = await syncIssue(client, issue, config.space, opts);
        if (didSync) synced++;
      }

      console.log("");
      console.log(`Done. ${synced} issue(s) synced.`);
    }
  } catch (err) {
    if (err instanceof BacklogClientError) {
      console.error(`Error: ${err.message}`);
      process.exit(2);
    }
    throw err;
  }
}
