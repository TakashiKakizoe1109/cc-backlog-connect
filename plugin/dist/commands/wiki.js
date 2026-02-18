"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wikiCommand = wikiCommand;
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
function wikiUrl(space, wikiId) {
    return `https://${space}.backlog.com/wiki/${wikiId}`;
}
async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
}
async function wikiCommand(args) {
    const subcommand = args[0];
    if (!subcommand) {
        console.error("Usage: cc-backlog wiki <list|get|create|update|delete|count> [options]");
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
            case "list": {
                const opts = parseOptions(args.slice(1));
                const keyword = opts.keyword;
                const pages = await client.getWikiPages(config.projectKey, keyword);
                console.log(JSON.stringify(pages, null, 2));
                break;
            }
            case "get": {
                const wikiId = args[1];
                if (!wikiId) {
                    console.error("Usage: cc-backlog wiki get <wikiId>");
                    process.exit(1);
                }
                const page = await client.getWikiPage(Number(wikiId));
                console.log(JSON.stringify(page, null, 2));
                break;
            }
            case "create": {
                const opts = parseOptions(args.slice(1));
                const name = opts.name;
                if (!name) {
                    console.error("Usage: cc-backlog wiki create --name <name> --content <text>");
                    console.error("  or:  echo 'content' | cc-backlog wiki create --name <name> --content-stdin");
                    process.exit(1);
                }
                let content;
                if (opts["content-stdin"] === true) {
                    content = await readStdin();
                }
                else {
                    content = opts.content ?? "";
                }
                const project = await client.getProject(config.projectKey);
                const mailNotify = opts["mail-notify"] === true ? true : undefined;
                const page = await client.addWikiPage(project.id, name, content, mailNotify);
                console.log(`Created wiki page: ${page.name} (id: ${page.id})`);
                console.log(`URL: ${wikiUrl(client.space, page.id)}`);
                break;
            }
            case "update": {
                const wikiId = args[1];
                if (!wikiId) {
                    console.error("Usage: cc-backlog wiki update <wikiId> [--name <name>] [--content <text>] [--content-stdin]");
                    process.exit(1);
                }
                const opts = parseOptions(args.slice(2));
                let content;
                if (opts["content-stdin"] === true) {
                    content = await readStdin();
                }
                else {
                    content = opts.content;
                }
                const mailNotify = opts["mail-notify"] === true ? true : undefined;
                const page = await client.updateWikiPage(Number(wikiId), {
                    name: opts.name,
                    content,
                    mailNotify,
                });
                console.log(`Updated wiki page: ${page.name} (id: ${page.id})`);
                console.log(`URL: ${wikiUrl(client.space, page.id)}`);
                break;
            }
            case "delete": {
                const wikiId = args[1];
                if (!wikiId) {
                    console.error("Usage: cc-backlog wiki delete <wikiId>");
                    process.exit(1);
                }
                const opts = parseOptions(args.slice(2));
                const mailNotify = opts["mail-notify"] === true ? true : undefined;
                const page = await client.deleteWikiPage(Number(wikiId), mailNotify);
                console.log(`Deleted wiki page: ${page.name} (id: ${page.id})`);
                break;
            }
            case "count": {
                const result = await client.countWikiPages(config.projectKey);
                console.log(JSON.stringify(result, null, 2));
                break;
            }
            default:
                console.error(`Unknown wiki subcommand: ${subcommand}`);
                console.error("Available: list, get, create, update, delete, count");
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
