"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentCommand = commentCommand;
const loader_1 = require("../config/loader");
const client_1 = require("../api/client");
const guard_1 = require("../config/guard");
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
async function commentCommand(args) {
    const subcommand = args[0];
    if (!subcommand) {
        console.error("Usage: cc-backlog comment <list|add|get|update|delete> [options]");
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
                const issueKey = args[1];
                if (!issueKey) {
                    console.error("Usage: cc-backlog comment list <ISSUE-KEY>");
                    process.exit(1);
                }
                const comments = await client.getComments(issueKey);
                console.log(JSON.stringify(comments, null, 2));
                break;
            }
            case "add": {
                (0, guard_1.assertWriteMode)(config);
                const issueKey = args[1];
                if (!issueKey) {
                    console.error("Usage: cc-backlog comment add <ISSUE-KEY> --content <text>");
                    process.exit(1);
                }
                const opts = parseOptions(args.slice(2));
                const content = opts.content;
                if (!content) {
                    console.error("Usage: cc-backlog comment add <ISSUE-KEY> --content <text>");
                    process.exit(1);
                }
                const comment = await client.addComment(issueKey, content);
                console.log(`Comment added to ${issueKey} (id: ${comment.id})`);
                console.log(`URL: ${issueUrl(client.space, issueKey)}#comment-${comment.id}`);
                break;
            }
            case "get": {
                const issueKey = args[1];
                const opts = parseOptions(args.slice(2));
                const commentId = opts["comment-id"];
                if (!issueKey || !commentId) {
                    console.error("Usage: cc-backlog comment get <ISSUE-KEY> --comment-id <id>");
                    process.exit(1);
                }
                const comment = await client.getComment(issueKey, Number(commentId));
                console.log(JSON.stringify(comment, null, 2));
                break;
            }
            case "update": {
                (0, guard_1.assertWriteMode)(config);
                const issueKey = args[1];
                const opts = parseOptions(args.slice(2));
                const commentId = opts["comment-id"];
                const content = opts.content;
                if (!issueKey || !commentId || !content) {
                    console.error("Usage: cc-backlog comment update <ISSUE-KEY> --comment-id <id> --content <text>");
                    process.exit(1);
                }
                const comment = await client.updateComment(issueKey, Number(commentId), content);
                console.log(`Comment ${comment.id} updated on ${issueKey}`);
                console.log(`URL: ${issueUrl(client.space, issueKey)}#comment-${comment.id}`);
                break;
            }
            case "delete": {
                (0, guard_1.assertWriteMode)(config);
                const issueKey = args[1];
                const opts = parseOptions(args.slice(2));
                const commentId = opts["comment-id"];
                if (!issueKey || !commentId) {
                    console.error("Usage: cc-backlog comment delete <ISSUE-KEY> --comment-id <id>");
                    process.exit(1);
                }
                const comment = await client.deleteComment(issueKey, Number(commentId));
                console.log(`Comment ${comment.id} deleted from ${issueKey}`);
                break;
            }
            default:
                console.error(`Unknown comment subcommand: ${subcommand}`);
                console.error("Available: list, add, get, update, delete");
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
