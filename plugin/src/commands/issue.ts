import { loadConfig } from "../config/loader";
import { BacklogApiClient, BacklogClientError } from "../api/client";
import { assertWriteMode } from "../config/guard";
import { readCache, writeCache, resolveNameToId } from "../cache/metadata";
import type { ResolvableMetadataType } from "../cache/metadata";

function parseOptions(args: string[]): Record<string, string | boolean> {
  const options: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
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
  return options;
}

function issueUrl(space: string, issueKey: string): string {
  return `https://${space}.backlog.com/view/${issueKey}`;
}

function resolveId(
  opts: Record<string, string | boolean>,
  nameFlag: string,
  idFlag: string,
  metaType: ResolvableMetadataType
): number | undefined {
  if (opts[idFlag]) return Number(opts[idFlag]);
  if (opts[nameFlag] && typeof opts[nameFlag] === "string") {
    const id = resolveNameToId(metaType, opts[nameFlag] as string);
    if (id === undefined) {
      console.error(
        `Error: Cannot resolve "${opts[nameFlag]}" for ${metaType}. Run "cc-backlog project-info ${metaType}" first.`
      );
      process.exit(1);
    }
    return id;
  }
  return undefined;
}

function resolveIdToArray(
  opts: Record<string, string | boolean>,
  nameFlag: string,
  idFlag: string,
  metaType: ResolvableMetadataType
): number[] | undefined {
  const parseIds = (v: string | boolean | undefined) =>
    v && typeof v === "string" ? v.split(",").map(Number) : undefined;

  const ids = parseIds(opts[idFlag]);
  if (ids) return ids;

  if (opts[nameFlag] && typeof opts[nameFlag] === "string") {
    const id = resolveNameToId(metaType, opts[nameFlag] as string);
    if (id === undefined) {
      console.error(
        `Error: Cannot resolve "${opts[nameFlag]}" for ${metaType}. Run "cc-backlog project-info ${metaType}" first.`
      );
      process.exit(1);
    }
    return [id];
  }
  return undefined;
}

export async function issueCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (!subcommand) {
    console.error("Usage: cc-backlog issue <get|create|update|delete|search|count> [options]");
    process.exit(1);
  }

  const config = loadConfig();
  if (!config) {
    console.error('Error: No configuration found. Run "cc-backlog config set" first.');
    process.exit(1);
  }

  const client = new BacklogApiClient(config);

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
        assertWriteMode(config);
        const opts = parseOptions(args.slice(1));
        const summary = opts.summary as string;
        const typeId = resolveId(opts, "type", "type-id", "issue-types");
        const priorityId = resolveId(opts, "priority", "priority-id", "priorities");
        const assigneeId = resolveId(opts, "assignee", "assignee-id", "users");

        if (!summary || typeId === undefined || priorityId === undefined) {
          console.error("Usage: cc-backlog issue create --summary <text> --type-id <id> --priority-id <id> [--description <text>] [--assignee-id <id>] [--due-date <YYYY-MM-DD>]");
          process.exit(1);
        }

        // Use cached project ID if available, otherwise fetch and cache
        let projectId: number;
        const cachedProject = readCache<{ id: number }>("project");
        if (cachedProject?.data[0]) {
          projectId = cachedProject.data[0].id;
        } else {
          const project = await client.getProject(config.projectKey);
          writeCache("project", [project]);
          projectId = project.id;
        }

        const issue = await client.addIssue({
          projectId,
          summary,
          issueTypeId: typeId,
          priorityId: priorityId,
          description: opts.description as string | undefined,
          assigneeId,
          dueDate: opts["due-date"] as string | undefined,
          estimatedHours: opts["estimated-hours"] ? Number(opts["estimated-hours"]) : undefined,
          actualHours: opts["actual-hours"] ? Number(opts["actual-hours"]) : undefined,
        });

        console.log(`Created ${issue.issueKey}: ${issue.summary}`);
        console.log(`URL: ${issueUrl(client.space, issue.issueKey)}`);
        break;
      }

      case "update": {
        assertWriteMode(config);
        const issueKey = args[1];
        if (!issueKey) {
          console.error("Usage: cc-backlog issue update <ISSUE-KEY> [--status-id <id>] [--status <name>] [--summary <text>] [--description <text>] [--assignee-id <id>] [--priority-id <id>] [--comment <text>]");
          process.exit(1);
        }

        const opts = parseOptions(args.slice(2));
        const issue = await client.updateIssue(issueKey, {
          summary: opts.summary as string | undefined,
          description: opts.description as string | undefined,
          statusId: resolveId(opts, "status", "status-id", "statuses"),
          assigneeId: resolveId(opts, "assignee", "assignee-id", "users"),
          priorityId: resolveId(opts, "priority", "priority-id", "priorities"),
          issueTypeId: resolveId(opts, "type", "type-id", "issue-types"),
          resolutionId: resolveId(opts, "resolution", "resolution-id", "resolutions"),
          dueDate: opts["due-date"] as string | undefined,
          estimatedHours: opts["estimated-hours"] ? Number(opts["estimated-hours"]) : undefined,
          actualHours: opts["actual-hours"] ? Number(opts["actual-hours"]) : undefined,
          comment: opts.comment as string | undefined,
        });

        console.log(`Updated ${issue.issueKey}: ${issue.summary}`);
        console.log(`URL: ${issueUrl(client.space, issue.issueKey)}`);
        break;
      }

      case "delete": {
        assertWriteMode(config);
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
        let projectId: number;
        const cachedProject = readCache<{ id: number }>("project");
        if (cachedProject?.data[0]) {
          projectId = cachedProject.data[0].id;
        } else {
          const project = await client.getProject(config.projectKey);
          writeCache("project", [project]);
          projectId = project.id;
        }

        const issues = await client.searchIssues(projectId, {
          keyword: opts.keyword as string | undefined,
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
        let projectId: number;
        const cachedProject = readCache<{ id: number }>("project");
        if (cachedProject?.data[0]) {
          projectId = cachedProject.data[0].id;
        } else {
          const project = await client.getProject(config.projectKey);
          writeCache("project", [project]);
          projectId = project.id;
        }

        const result = await client.countIssues(projectId, {
          keyword: opts.keyword as string | undefined,
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
  } catch (err) {
    if (err instanceof BacklogClientError) {
      console.error(`Error: ${err.message}`);
      process.exit(2);
    }
    throw err;
  }
}
