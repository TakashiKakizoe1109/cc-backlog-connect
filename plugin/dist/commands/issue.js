"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueCommand = issueCommand;
const loader_1 = require("../config/loader");
const client_1 = require("../api/client");
const guard_1 = require("../config/guard");
const metadata_1 = require("../cache/metadata");
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
function resolveId(opts, nameFlag, idFlag, metaType) {
    if (opts[idFlag])
        return Number(opts[idFlag]);
    if (opts[nameFlag] && typeof opts[nameFlag] === "string") {
        const id = (0, metadata_1.resolveNameToId)(metaType, opts[nameFlag]);
        if (id === undefined) {
            console.error(`Error: Cannot resolve "${opts[nameFlag]}" for ${metaType}. Run "cc-backlog project-info ${metaType}" first.`);
            process.exit(1);
        }
        return id;
    }
    return undefined;
}
function resolveIdToArray(opts, nameFlag, idFlag, metaType) {
    const parseIds = (v) => v && typeof v === "string" ? v.split(",").map(Number) : undefined;
    const ids = parseIds(opts[idFlag]);
    if (ids)
        return ids;
    if (opts[nameFlag] && typeof opts[nameFlag] === "string") {
        const id = (0, metadata_1.resolveNameToId)(metaType, opts[nameFlag]);
        if (id === undefined) {
            console.error(`Error: Cannot resolve "${opts[nameFlag]}" for ${metaType}. Run "cc-backlog project-info ${metaType}" first.`);
            process.exit(1);
        }
        return [id];
    }
    return undefined;
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
                (0, guard_1.assertWriteMode)(config);
                const opts = parseOptions(args.slice(1));
                const summary = opts.summary;
                const typeId = resolveId(opts, "type", "type-id", "issue-types");
                const priorityId = resolveId(opts, "priority", "priority-id", "priorities");
                const assigneeId = resolveId(opts, "assignee", "assignee-id", "users");
                if (!summary || typeId === undefined || priorityId === undefined) {
                    console.error("Usage: cc-backlog issue create --summary <text> --type-id <id> --priority-id <id> [--description <text>] [--assignee-id <id>] [--due-date <YYYY-MM-DD>]");
                    process.exit(1);
                }
                // Use cached project ID if available, otherwise fetch and cache
                let projectId;
                const cachedProject = (0, metadata_1.readCache)("project");
                if (cachedProject?.data[0]) {
                    projectId = cachedProject.data[0].id;
                }
                else {
                    const project = await client.getProject(config.projectKey);
                    (0, metadata_1.writeCache)("project", [project]);
                    projectId = project.id;
                }
                const issue = await client.addIssue({
                    projectId,
                    summary,
                    issueTypeId: typeId,
                    priorityId: priorityId,
                    description: opts.description,
                    assigneeId,
                    dueDate: opts["due-date"],
                    estimatedHours: opts["estimated-hours"] ? Number(opts["estimated-hours"]) : undefined,
                    actualHours: opts["actual-hours"] ? Number(opts["actual-hours"]) : undefined,
                });
                console.log(`Created ${issue.issueKey}: ${issue.summary}`);
                console.log(`URL: ${issueUrl(client.space, issue.issueKey)}`);
                break;
            }
            case "update": {
                (0, guard_1.assertWriteMode)(config);
                const issueKey = args[1];
                if (!issueKey) {
                    console.error("Usage: cc-backlog issue update <ISSUE-KEY> [--status-id <id>] [--status <name>] [--summary <text>] [--description <text>] [--assignee-id <id>] [--priority-id <id>] [--comment <text>]");
                    process.exit(1);
                }
                const opts = parseOptions(args.slice(2));
                const issue = await client.updateIssue(issueKey, {
                    summary: opts.summary,
                    description: opts.description,
                    statusId: resolveId(opts, "status", "status-id", "statuses"),
                    assigneeId: resolveId(opts, "assignee", "assignee-id", "users"),
                    priorityId: resolveId(opts, "priority", "priority-id", "priorities"),
                    issueTypeId: resolveId(opts, "type", "type-id", "issue-types"),
                    resolutionId: resolveId(opts, "resolution", "resolution-id", "resolutions"),
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
                (0, guard_1.assertWriteMode)(config);
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
                // Use cached project ID if available, otherwise fetch and cache
                let projectId;
                const cachedProject = (0, metadata_1.readCache)("project");
                if (cachedProject?.data[0]) {
                    projectId = cachedProject.data[0].id;
                }
                else {
                    const project = await client.getProject(config.projectKey);
                    (0, metadata_1.writeCache)("project", [project]);
                    projectId = project.id;
                }
                const issues = await client.searchIssues(projectId, {
                    keyword: opts.keyword,
                    statusId: resolveIdToArray(opts, "status", "status-id", "statuses"),
                    assigneeId: resolveIdToArray(opts, "assignee", "assignee-id", "users"),
                    issueTypeId: resolveIdToArray(opts, "type", "type-id", "issue-types"),
                    categoryId: resolveIdToArray(opts, "category", "category-id", "categories"),
                    milestoneId: resolveIdToArray(opts, "milestone", "milestone-id", "versions"),
                    versionId: resolveIdToArray(opts, "version", "version-id", "versions"),
                    priorityId: resolveIdToArray(opts, "priority", "priority-id", "priorities"),
                    createdUserId: resolveIdToArray(opts, "created-user", "created-user-id", "users"),
                    resolutionId: resolveIdToArray(opts, "resolution", "resolution-id", "resolutions"),
                    parentChild: opts["parent-child"] !== undefined ? Number(opts["parent-child"]) : undefined,
                });
                console.log(JSON.stringify(issues, null, 2));
                break;
            }
            case "count": {
                const opts = parseOptions(args.slice(1));
                // Use cached project ID if available, otherwise fetch and cache
                let projectId;
                const cachedProject = (0, metadata_1.readCache)("project");
                if (cachedProject?.data[0]) {
                    projectId = cachedProject.data[0].id;
                }
                else {
                    const project = await client.getProject(config.projectKey);
                    (0, metadata_1.writeCache)("project", [project]);
                    projectId = project.id;
                }
                const result = await client.countIssues(projectId, {
                    keyword: opts.keyword,
                    statusId: resolveIdToArray(opts, "status", "status-id", "statuses"),
                    assigneeId: resolveIdToArray(opts, "assignee", "assignee-id", "users"),
                    issueTypeId: resolveIdToArray(opts, "type", "type-id", "issue-types"),
                    categoryId: resolveIdToArray(opts, "category", "category-id", "categories"),
                    milestoneId: resolveIdToArray(opts, "milestone", "milestone-id", "versions"),
                    versionId: resolveIdToArray(opts, "version", "version-id", "versions"),
                    priorityId: resolveIdToArray(opts, "priority", "priority-id", "priorities"),
                    createdUserId: resolveIdToArray(opts, "created-user", "created-user-id", "users"),
                    resolutionId: resolveIdToArray(opts, "resolution", "resolution-id", "resolutions"),
                    parentChild: opts["parent-child"] !== undefined ? Number(opts["parent-child"]) : undefined,
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
