import { loadConfig } from "../config/loader";
import { BacklogApiClient, BacklogClientError } from "../api/client";
import { assertWriteMode } from "../config/guard";
import { writeFile } from "fs/promises";

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

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function parseNonNegativeIntegerOption(
  value: string | boolean | undefined,
  flagName: string
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    console.error(`Error: --${flagName} requires a numeric value`);
    process.exit(1);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    console.error(`Error: --${flagName} must be a non-negative integer`);
    process.exit(1);
  }
  return parsed;
}

function parseStringOption(
  value: string | boolean | undefined,
  flagName: string
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    console.error(`Error: --${flagName} requires a value`);
    process.exit(1);
  }
  return value;
}

function parseRequiredStringOption(
  value: string | boolean | undefined,
  flagName: string
): string {
  const parsed = parseStringOption(value, flagName);
  if (parsed === undefined || parsed.length === 0) {
    console.error(`Error: --${flagName} is required`);
    process.exit(1);
  }
  return parsed;
}

function renderTree(
  nodes: import("../api/types").BacklogDocumentNode[],
  indent = ""
): void {
  for (const node of nodes) {
    const emoji = node.emoji ? `${node.emoji} ` : "";
    console.log(`${indent}${emoji}${node.name} (id: ${node.id})`);
    if (node.children.length > 0) {
      renderTree(node.children, indent + "  ");
    }
  }
}

export async function documentCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (!subcommand) {
    console.error("Usage: cc-backlog document <list|get|tree|attachments|add|delete> [options]");
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
      case "list": {
        const opts = parseOptions(args.slice(1));
        const count = parseNonNegativeIntegerOption(opts.count, "count");
        const offset = parseNonNegativeIntegerOption(opts.offset, "offset");
        const projectKey = parseStringOption(opts.project, "project") ?? config.projectKey;
        const keyword = parseStringOption(opts.keyword, "keyword");
        const project = await client.getProject(projectKey);
        const docs = await client.getDocuments(project.id, {
          keyword,
          count,
          offset,
        });
        console.log(JSON.stringify(docs, null, 2));
        break;
      }

      case "get": {
        const documentId = args[1];
        if (!documentId) {
          console.error("Usage: cc-backlog document get <documentId>");
          process.exit(1);
        }
        const doc = await client.getDocument(documentId);
        console.log(JSON.stringify(doc, null, 2));
        break;
      }

      case "tree": {
        const opts = parseOptions(args.slice(1));
        const projectKey = parseStringOption(opts.project, "project") ?? config.projectKey;
        const tree = await client.getDocumentTree(projectKey);
        console.log("=== Active Documents ===");
        renderTree(tree.activeTree.children);
        console.log("\n=== Trash ===");
        renderTree(tree.trashTree.children);
        break;
      }

      case "attachments": {
        const documentId = args[1];
        const attachmentIdRaw = args[2];
        if (!documentId) {
          console.error("Usage: cc-backlog document attachments <documentId> <attachmentId> --output <path>");
          process.exit(1);
        }
        if (!attachmentIdRaw) {
          console.error("Usage: cc-backlog document attachments <documentId> <attachmentId> --output <path>");
          process.exit(1);
        }
        const attachmentId = Number(attachmentIdRaw);
        if (!Number.isInteger(attachmentId) || attachmentId < 1) {
          console.error("Error: <attachmentId> must be a positive integer");
          process.exit(1);
        }
        const opts = parseOptions(args.slice(3));
        const outputPath = parseRequiredStringOption(opts.output, "output");

        const file = await client.downloadDocumentAttachment(documentId, attachmentId);
        await writeFile(outputPath, file);
        console.log(`Downloaded attachment ${attachmentId} to ${outputPath}`);
        break;
      }

      case "add": {
        assertWriteMode(config);
        const opts = parseOptions(args.slice(1));

        const title = parseRequiredStringOption(opts.title, "title");
        const contentOption = parseStringOption(opts.content, "content");
        const projectKey = parseStringOption(opts.project, "project") ?? config.projectKey;
        const emoji = parseStringOption(opts.emoji, "emoji");
        const parentId = parseStringOption(opts["parent-id"], "parent-id");

        if (!contentOption && opts["content-stdin"] !== true) {
          console.error('Error: --content or --content-stdin is required for "document add"');
          console.error("Usage: cc-backlog document add --title <title> --content <text>");
          process.exit(1);
        }

        const project = await client.getProject(projectKey);

        let content: string | undefined;
        if (opts["content-stdin"] === true) {
          if (process.stdin.isTTY) {
            console.error("Error: --content-stdin requires piped input (stdin is TTY)");
            process.exit(1);
          }
          content = await readStdin();
        } else {
          content = contentOption;
        }

        const doc = await client.addDocument(project.id, {
          title,
          content,
          emoji,
          parentId,
        });
        console.log(`Created document: ${doc.title} (id: ${doc.id})`);
        console.log(JSON.stringify(doc, null, 2));
        break;
      }

      case "delete": {
        assertWriteMode(config);
        const documentId = args[1];
        if (!documentId) {
          console.error("Usage: cc-backlog document delete <documentId>");
          process.exit(1);
        }
        const doc = await client.deleteDocument(documentId);
        console.log(`Deleted document: ${doc.title} (id: ${doc.id})`);
        break;
      }

      default:
        console.error(`Unknown document subcommand: ${subcommand}`);
        console.error("Available: list, get, tree, attachments, add, delete");
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
