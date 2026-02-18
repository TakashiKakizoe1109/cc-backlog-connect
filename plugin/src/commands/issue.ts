import { loadConfig } from "../config/loader";
import { BacklogApiClient, BacklogClientError } from "../api/client";
import { assertWriteMode } from "../config/guard";

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
        const typeId = opts["type-id"] as string;
        const priorityId = opts["priority-id"] as string;

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
          description: opts.description as string | undefined,
          assigneeId: opts["assignee-id"] ? Number(opts["assignee-id"]) : undefined,
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
          console.error("Usage: cc-backlog issue update <ISSUE-KEY> [--status-id <id>] [--summary <text>] [--description <text>] [--assignee-id <id>] [--priority-id <id>] [--comment <text>]");
          process.exit(1);
        }

        const opts = parseOptions(args.slice(2));
        const issue = await client.updateIssue(issueKey, {
          summary: opts.summary as string | undefined,
          description: opts.description as string | undefined,
          statusId: opts["status-id"] ? Number(opts["status-id"]) : undefined,
          assigneeId: opts["assignee-id"] ? Number(opts["assignee-id"]) : undefined,
          priorityId: opts["priority-id"] ? Number(opts["priority-id"]) : undefined,
          issueTypeId: opts["type-id"] ? Number(opts["type-id"]) : undefined,
          resolutionId: opts["resolution-id"] ? Number(opts["resolution-id"]) : undefined,
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
        const project = await client.getProject(config.projectKey);

        const parseIds = (v: string | boolean | undefined) =>
          v && typeof v === "string" ? v.split(",").map(Number) : undefined;

        const issues = await client.searchIssues(project.id, {
          keyword: opts.keyword as string | undefined,
          statusId: parseIds(opts["status-id"]),
          assigneeId: parseIds(opts["assignee-id"]),
          issueTypeId: parseIds(opts["type-id"]),
          categoryId: parseIds(opts["category-id"]),
          milestoneId: parseIds(opts["milestone-id"]),
        });

        console.log(JSON.stringify(issues, null, 2));
        break;
      }

      case "count": {
        const opts = parseOptions(args.slice(1));
        const project = await client.getProject(config.projectKey);

        const parseIds = (v: string | boolean | undefined) =>
          v && typeof v === "string" ? v.split(",").map(Number) : undefined;

        const result = await client.countIssues(project.id, {
          keyword: opts.keyword as string | undefined,
          statusId: parseIds(opts["status-id"]),
          assigneeId: parseIds(opts["assignee-id"]),
          issueTypeId: parseIds(opts["type-id"]),
          categoryId: parseIds(opts["category-id"]),
          milestoneId: parseIds(opts["milestone-id"]),
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
