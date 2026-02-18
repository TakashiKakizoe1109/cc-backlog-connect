"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCommand = syncCommand;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const loader_1 = require("../config/loader");
const client_1 = require("../api/client");
const guard_1 = require("../config/guard");
const issue_1 = require("../markdown/issue");
const comments_1 = require("../markdown/comments");
function docsDir() {
    return path.join((0, loader_1.findProjectRoot)(), "docs", "backlog");
}
function ensureBacklogGitignore(baseDir) {
    const gitignorePath = path.join(baseDir, ".gitignore");
    if (fs.existsSync(gitignorePath))
        return;
    fs.writeFileSync(gitignorePath, "*\n!.gitignore\n");
}
async function syncIssue(client, issue, space, opts) {
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
    const issueMd = (0, issue_1.formatIssueMd)(issue, space, attachments);
    fs.writeFileSync(issuePath, issueMd);
    const comments = await client.getComments(issue.issueKey);
    const commentsMd = (0, comments_1.formatCommentsMd)(issue.issueKey, issue.summary, comments);
    if (commentsMd) {
        fs.writeFileSync(commentsPath, commentsMd);
    }
    // Download attachment files
    if (attachments.length > 0) {
        const attachDir = path.join(issueDir, "attachments");
        fs.mkdirSync(attachDir, { recursive: true });
        for (const att of attachments) {
            const filePath = path.join(attachDir, att.name);
            if (!opts.force && fs.existsSync(filePath))
                continue;
            try {
                const data = await client.downloadAttachment(issue.issueKey, att.id);
                fs.writeFileSync(filePath, data);
            }
            catch (err) {
                console.warn(`  [WARN] Failed to download attachment: ${att.name}`);
            }
        }
    }
    console.log(`  [OK] ${issue.issueKey} - ${issue.summary}${attachments.length > 0 ? ` (${attachments.length} attachment(s))` : ""}`);
    return true;
}
async function syncCommand(opts) {
    const config = (0, loader_1.loadConfig)();
    if (!config) {
        console.error("Error: No configuration found.");
        console.error('Run "cc-backlog config set" first.');
        process.exit(1);
    }
    if (!config.space || !config.apiKey || !config.projectKey) {
        console.error("Error: Incomplete configuration. Run \"cc-backlog config\" to check.");
        process.exit(1);
    }
    (0, guard_1.assertWriteMode)(config);
    const baseDir = docsDir();
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
    if (!opts.dryRun) {
        ensureBacklogGitignore(baseDir);
    }
    const client = new client_1.BacklogApiClient(config);
    try {
        if (opts.issue) {
            console.log(`Syncing issue: ${opts.issue}`);
            const issue = await client.getIssue(opts.issue);
            await syncIssue(client, issue, config.space, opts);
        }
        else {
            const project = await client.getProject(config.projectKey);
            let statusFilter;
            let statusIds;
            if (opts.all) {
                statusFilter = "all statuses";
            }
            else {
                const statuses = await client.getStatuses(config.projectKey);
                const closedStatuses = statuses.filter((s) => s.name === "Closed" || s.name === "完了");
                const closedIds = new Set(closedStatuses.map((s) => s.id));
                statusIds = statuses.filter((s) => !closedIds.has(s.id)).map((s) => s.id);
                statusFilter = "open issues";
            }
            console.log(`Syncing ${statusFilter} from ${config.projectKey}...`);
            if (opts.dryRun)
                console.log("(dry run - no files will be written)");
            console.log("");
            const issues = await client.getIssues(project.id, {
                statusId: statusIds,
                issueTypeId: opts.typeId,
                categoryId: opts.categoryId,
                milestoneId: opts.milestoneId,
                assigneeId: opts.assigneeId,
                keyword: opts.keyword,
            });
            console.log(`Found ${issues.length} issue(s).`);
            console.log("");
            let synced = 0;
            for (const issue of issues) {
                const didSync = await syncIssue(client, issue, config.space, opts);
                if (didSync)
                    synced++;
            }
            console.log("");
            console.log(`Done. ${synced} issue(s) synced.`);
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
