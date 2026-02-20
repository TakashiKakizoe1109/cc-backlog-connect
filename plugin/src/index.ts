#!/usr/bin/env node

import { configShow, configSet } from "./commands/config";
import { syncCommand } from "./commands/sync";
import { issueCommand } from "./commands/issue";
import { commentCommand } from "./commands/comment";
import { projectInfoCommand } from "./commands/project-info";
import { wikiCommand } from "./commands/wiki";
import { documentCommand } from "./commands/document";
import { resolveNameToId } from "./cache/metadata";
import type { ResolvableMetadataType } from "./cache/metadata";

export function parseArgs(args: string[]): { command: string; options: Record<string, string | boolean> } {
  const command = args[0] ?? "help";
  const options: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  return { command, options };
}

function printHelp(): void {
  console.log(`cc-backlog - Backlog issue sync for Claude Code

USAGE:
  cc-backlog <command> [options]

COMMANDS:
  config              Show current configuration
  config set          Set configuration values
    --space <name>      Backlog space name (e.g. test-company)
    --api-key <key>     API key
    --project-key <KEY> Project key (e.g. PROJ)
    --mode <read|write> Operation mode (default: read)
    --parallel <n>      Concurrent issues to sync at once (default: 5, max: 20)

  sync                Sync open issues
    --all               Sync all issues (including closed)
    --issue <KEY>       Sync a specific issue (e.g. PROJ-123)
    --force             Overwrite existing files
    --dry-run           Preview without writing files
    --status-id <ids>   Filter by status ID (comma-separated)
    --status <names>    Filter by status name (uses cache; run project-info statuses first)
    --type-id <ids>     Filter by issue type ID (comma-separated)
    --type <names>      Filter by issue type name (uses cache)
    --category-id <ids> Filter by category ID (comma-separated)
    --category <names>  Filter by category name (uses cache)
    --milestone-id <ids> Filter by milestone ID (comma-separated)
    --milestone <names> Filter by milestone name (uses cache)
    --assignee-id <ids> Filter by assignee ID (comma-separated)
    --assignee <names>  Filter by assignee name (uses cache)
    --keyword <text>    Filter by keyword
    --version-id <ids>  Filter by version (affected) ID (comma-separated)
    --version <names>   Filter by version name (uses cache)
    --priority-id <ids> Filter by priority ID (comma-separated)
    --priority <names>  Filter by priority name (uses cache)
    --created-user-id <ids> Filter by creator ID (comma-separated)
    --created-user <names>  Filter by creator name (uses cache)
    --resolution-id <ids>   Filter by resolution ID (comma-separated)
    --resolution <names>    Filter by resolution name (uses cache)
    --parent-child <n>  Filter by parent/child: 0=all 1=non-child 2=child-only 3=neither 4=parent-only

  issue <subcommand>  Manage issues
    get <KEY>           Get issue details (JSON)
    create              Create a new issue
    update <KEY>        Update an issue
    delete <KEY>        Delete an issue
    search              Search issues
    count               Count issues

  comment <subcommand> Manage issue comments
    list <KEY>          List comments (JSON)
    add <KEY>           Add a comment
    get <KEY>           Get a specific comment
    update <KEY>        Update a comment
    delete <KEY>        Delete a comment

  project-info <type> Get project metadata (JSON); cached in .cc-backlog/
    statuses            Issue statuses
    issue-types         Issue types
    priorities          Priorities
    resolutions         Resolutions
    users               Project members
    categories          Categories
    versions            Versions/milestones
    --refresh           Force re-fetch from API (bypass cache)
    --rate-limit        Show current rate limit status

  wiki <subcommand>   Manage wiki pages
    list                List wiki pages (JSON)
    get <wikiId>        Get wiki page content (JSON)
    create              Create a wiki page
    update <wikiId>     Update a wiki page
    delete <wikiId>     Delete a wiki page
    count               Count wiki pages

  document <subcommand> Manage Backlog documents (hierarchical docs, distinct from Wiki)
    list                List documents (JSON)
      --project <key>     Project key (default: configured project)
      --keyword <text>    Filter by keyword
      --count <n>         Number of results
      --offset <n>        Offset for pagination
    get <documentId>    Get document details and content (JSON)
    tree                Show document tree structure
      --project <key>     Project key (default: configured project)
    attachments <documentId> <attachmentId> --output <path>
                        Download a document attachment
    add                 Create a document (write mode required)
      --project <key>     Project key (default: configured project)
      --title <text>      Document title
      --content <text>    Document content (Markdown)
      --content-stdin     Read content from stdin
      --emoji <emoji>     Document emoji
      --parent-id <id>    Parent document ID
    delete <documentId> Delete a document (write mode required)

  help                Show this help message
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);

  switch (command) {
    case "config":
      if (args[1] === "set") {
        configSet({
          space: options.space as string | undefined,
          apiKey: options["api-key"] as string | undefined,
          projectKey: options["project-key"] as string | undefined,
          mode: options.mode as string | undefined,
          parallel: options.parallel !== undefined ? Number(options.parallel) : undefined,
        });
      } else {
        configShow();
      }
      break;

    case "sync": {
      const parseIds = (v: string | boolean | undefined): number[] | undefined =>
        v && typeof v === "string" ? v.split(",").map(Number) : undefined;

      const resolveNameIds = (
        nameVal: string | boolean | undefined,
        type: ResolvableMetadataType
      ): number[] | undefined => {
        if (!nameVal || typeof nameVal !== "string") return undefined;
        return nameVal.split(",").map((n) => {
          const id = resolveNameToId(type, n.trim());
          if (id === undefined) {
            console.error(
              `Error: Cannot resolve "${n.trim()}" for ${type}. Run "cc-backlog project-info ${type}" first.`
            );
            process.exit(1);
          }
          return id;
        });
      };

      await syncCommand({
        all: options.all === true,
        issue: options.issue as string | undefined,
        force: options.force === true,
        dryRun: options["dry-run"] === true,
        statusId: parseIds(options["status-id"]) ?? resolveNameIds(options["status"], "statuses"),
        typeId: parseIds(options["type-id"]) ?? resolveNameIds(options["type"], "issue-types"),
        categoryId: parseIds(options["category-id"]) ?? resolveNameIds(options["category"], "categories"),
        milestoneId: parseIds(options["milestone-id"]) ?? resolveNameIds(options["milestone"], "versions"),
        assigneeId: parseIds(options["assignee-id"]) ?? resolveNameIds(options["assignee"], "users"),
        keyword: options.keyword as string | undefined,
        versionId: parseIds(options["version-id"]) ?? resolveNameIds(options["version"], "versions"),
        priorityId: parseIds(options["priority-id"]) ?? resolveNameIds(options["priority"], "priorities"),
        createdUserId: parseIds(options["created-user-id"]) ?? resolveNameIds(options["created-user"], "users"),
        resolutionId: parseIds(options["resolution-id"]) ?? resolveNameIds(options["resolution"], "resolutions"),
        parentChild: options["parent-child"] !== undefined ? Number(options["parent-child"]) : undefined,
      });
      break;
    }

    case "issue":
      await issueCommand(args.slice(1));
      break;

    case "comment":
      await commentCommand(args.slice(1));
      break;

    case "project-info":
      await projectInfoCommand(args.slice(1));
      break;

    case "wiki":
      await wikiCommand(args.slice(1));
      break;

    case "document":
      await documentCommand(args.slice(1));
      break;

    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "cc-backlog help" for usage.');
      process.exit(1);
  }
}

let exiting = false;
main()
  .then(() => { exiting = true; process.exit(0); })
  .catch((err) => {
    if (exiting) return; // process.exit(0) was called; suppress secondary error
    console.error("Unexpected error:", err.message ?? err);
    process.exit(1);
  });
