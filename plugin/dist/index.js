#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArgs = parseArgs;
const config_1 = require("./commands/config");
const sync_1 = require("./commands/sync");
const issue_1 = require("./commands/issue");
const comment_1 = require("./commands/comment");
const project_info_1 = require("./commands/project-info");
const wiki_1 = require("./commands/wiki");
function parseArgs(args) {
    const command = args[0] ?? "help";
    const options = {};
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (next && !next.startsWith("--")) {
                options[key] = next;
                i++;
            }
            else {
                options[key] = true;
            }
        }
    }
    return { command, options };
}
function printHelp() {
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

  sync                Sync open issues
    --all               Sync all issues (including closed)
    --issue <KEY>       Sync a specific issue (e.g. PROJ-123)
    --force             Overwrite existing files
    --dry-run           Preview without writing files
    --type-id <ids>     Filter by issue type (comma-separated)
    --category-id <ids> Filter by category (comma-separated)
    --milestone-id <ids> Filter by milestone (comma-separated)
    --assignee-id <ids> Filter by assignee (comma-separated)
    --keyword <text>    Filter by keyword

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

  project-info <type> Get project metadata (JSON)
    statuses            Issue statuses
    issue-types         Issue types
    priorities          Priorities
    resolutions         Resolutions
    users               Project members
    categories          Categories
    versions            Versions/milestones

  wiki <subcommand>   Manage wiki pages
    list                List wiki pages (JSON)
    get <wikiId>        Get wiki page content (JSON)
    create              Create a wiki page
    update <wikiId>     Update a wiki page
    delete <wikiId>     Delete a wiki page
    count               Count wiki pages

  help                Show this help message
`);
}
async function main() {
    const args = process.argv.slice(2);
    const { command, options } = parseArgs(args);
    switch (command) {
        case "config":
            if (args[1] === "set") {
                (0, config_1.configSet)({
                    space: options.space,
                    apiKey: options["api-key"],
                    projectKey: options["project-key"],
                    mode: options.mode,
                });
            }
            else {
                (0, config_1.configShow)();
            }
            break;
        case "sync": {
            const parseIds = (v) => v && typeof v === "string" ? v.split(",").map(Number) : undefined;
            await (0, sync_1.syncCommand)({
                all: options.all === true,
                issue: options.issue,
                force: options.force === true,
                dryRun: options["dry-run"] === true,
                typeId: parseIds(options["type-id"]),
                categoryId: parseIds(options["category-id"]),
                milestoneId: parseIds(options["milestone-id"]),
                assigneeId: parseIds(options["assignee-id"]),
                keyword: options.keyword,
            });
            break;
        }
        case "issue":
            await (0, issue_1.issueCommand)(args.slice(1));
            break;
        case "comment":
            await (0, comment_1.commentCommand)(args.slice(1));
            break;
        case "project-info":
            await (0, project_info_1.projectInfoCommand)(args.slice(1));
            break;
        case "wiki":
            await (0, wiki_1.wikiCommand)(args.slice(1));
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
main().catch((err) => {
    console.error("Unexpected error:", err.message ?? err);
    process.exit(1);
});
