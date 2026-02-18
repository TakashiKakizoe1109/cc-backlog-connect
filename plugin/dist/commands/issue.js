"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueCommand = issueCommand;
const loader_1 = require("../config/loader");
const client_1 = require("../api/client");
function parseOptions(args) {
    const options = {};
    for (let i = 0; i < args.length; i++) {
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
    return options;
}
function issueUrl(space, issueKey) {
    return `https://${space}.backlog.com/view/${issueKey}`;
}
async function issueCommand(args) {
    const subcommand = args[0];
    if (!subcommand) {
        console.error("Usage: cc-backlog issue <get|create|update|delete|search|count> [options]");
        process.exit(1);
    }
    const config = (0, loader_1.loadConfig)();
    if (!config) {
        console.error('Error: No configuration found. Run "cc-backlog config set" first.');
        process.exit(1);
    }
    const client = new client_1.BacklogApiClient(config);
    try {
        switch (subcommand) {
            case "get": {
                const issueKey = args[1];
                if (!issueKey) {
                    console.error("Usage: cc-backlog issue get <ISSUE-KEY>");
                    process.exit(1);
                }
                const issue = await client.getIssue(issueKey);
                console.log(JSON.stringify(issue, null, 2));
                break;
            }
            case "create": {
                const opts = parseOptions(args.slice(1));
                const summary = opts.summary;
                const typeId = opts["type-id"];
                const priorityId = opts["priority-id"];
                if (!summary || !typeId || !priorityId) {
                    console.error("Usage: cc-backlog issue create --summary <text> --type-id <id> --priority-id <id> [--description <text>] [--assignee-id <id>] [--due-date <YYYY-MM-DD>]");
                    process.exit(1);
                }
                const project = await client.getProject(config.projectKey);
                const issue = await client.addIssue({
                    projectId: project.id,
                    summary,
                    issueTypeId: Number(typeId),
                    priorityId: Number(priorityId),
                    description: opts.description,
                    assigneeId: opts["assignee-id"] ? Number(opts["assignee-id"]) : undefined,
                    dueDate: opts["due-date"],
                    estimatedHours: opts["estimated-hours"] ? Number(opts["estimated-hours"]) : undefined,
                    actualHours: opts["actual-hours"] ? Number(opts["actual-hours"]) : undefined,
                });
                console.log(`Created ${issue.issueKey}: ${issue.summary}`);
                console.log(`URL: ${issueUrl(client.space, issue.issueKey)}`);
                break;
            }
            case "update": {
                const issueKey = args[1];
                if (!issueKey) {
                    console.error("Usage: cc-backlog issue update <ISSUE-KEY> [--status-id <id>] [--summary <text>] [--description <text>] [--assignee-id <id>] [--priority-id <id>] [--comment <text>]");
                    process.exit(1);
                }
                const opts = parseOptions(args.slice(2));
                const issue = await client.updateIssue(issueKey, {
                    summary: opts.summary,
                    description: opts.description,
                    statusId: opts["status-id"] ? Number(opts["status-id"]) : undefined,
                    assigneeId: opts["assignee-id"] ? Number(opts["assignee-id"]) : undefined,
                    priorityId: opts["priority-id"] ? Number(opts["priority-id"]) : undefined,
                    issueTypeId: opts["type-id"] ? Number(opts["type-id"]) : undefined,
                    resolutionId: opts["resolution-id"] ? Number(opts["resolution-id"]) : undefined,
                    dueDate: opts["due-date"],
                    estimatedHours: opts["estimated-hours"] ? Number(opts["estimated-hours"]) : undefined,
                    actualHours: opts["actual-hours"] ? Number(opts["actual-hours"]) : undefined,
                    comment: opts.comment,
                });
                console.log(`Updated ${issue.issueKey}: ${issue.summary}`);
                console.log(`URL: ${issueUrl(client.space, issue.issueKey)}`);
                break;
            }
            case "delete": {
                const issueKey = args[1];
                if (!issueKey) {
                    console.error("Usage: cc-backlog issue delete <ISSUE-KEY>");
                    process.exit(1);
                }
                const issue = await client.deleteIssue(issueKey);
                console.log(`Deleted ${issue.issueKey}: ${issue.summary}`);
                break;
            }
            case "search": {
                const opts = parseOptions(args.slice(1));
                const project = await client.getProject(config.projectKey);
                const statusId = opts["status-id"]
                    ? String(opts["status-id"]).split(",").map(Number)
                    : undefined;
                const issues = await client.searchIssues(project.id, {
                    keyword: opts.keyword,
                    statusId,
                });
                console.log(JSON.stringify(issues, null, 2));
                break;
            }
            case "count": {
                const opts = parseOptions(args.slice(1));
                const project = await client.getProject(config.projectKey);
                const statusId = opts["status-id"]
                    ? String(opts["status-id"]).split(",").map(Number)
                    : undefined;
                const result = await client.countIssues(project.id, {
                    statusId,
                    keyword: opts.keyword,
                });
                console.log(JSON.stringify(result, null, 2));
                break;
            }
            default:
                console.error(`Unknown issue subcommand: ${subcommand}`);
                console.error("Available: get, create, update, delete, search, count");
                process.exit(1);
        }
    }
    catch (err) {
        if (err instanceof client_1.BacklogClientError) {
            console.error(`Error: ${err.message}`);
            process.exit(2);
        }
        throw err;
    }
}
