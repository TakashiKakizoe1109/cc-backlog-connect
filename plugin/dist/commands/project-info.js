"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectInfoCommand = projectInfoCommand;
const loader_1 = require("../config/loader");
const client_1 = require("../api/client");
const metadata_1 = require("../cache/metadata");
const VALID_TYPES = ["statuses", "issue-types", "priorities", "resolutions", "users", "categories", "versions"];
async function projectInfoCommand(args) {
    const rateLimit = args.includes("--rate-limit");
    if (rateLimit) {
        const config = (0, loader_1.loadConfig)();
        if (!config) {
            console.error('Error: No configuration found. Run "cc-backlog config set" first.');
            process.exit(1);
        }
        const client = new client_1.BacklogApiClient(config);
        try {
            const rl = await client.getRateLimit();
            const fmt = (cat) => {
                const resetTime = new Date(cat.reset * 1000).toLocaleTimeString();
                const remaining = String(cat.remaining).padStart(3);
                const limit = String(cat.limit).padStart(3);
                return `${remaining}/${limit} remaining (reset: ${resetTime})`;
            };
            console.log(`Read:   ${fmt(rl.read)}`);
            console.log(`Update: ${fmt(rl.update)}`);
            console.log(`Search: ${fmt(rl.search)}`);
            console.log(`Icon:   ${fmt(rl.icon)}`);
        }
        catch (err) {
            if (err instanceof client_1.BacklogClientError) {
                console.error(`Error: ${err.message}`);
                process.exit(2);
            }
            throw err;
        }
        return;
    }
    const infoType = args[0];
    const refresh = args.includes("--refresh");
    if (!infoType || !VALID_TYPES.includes(infoType)) {
        console.error(`Usage: cc-backlog project-info <type> [--refresh]`);
        console.error(`       cc-backlog project-info --rate-limit`);
        console.error(`Types: ${VALID_TYPES.join(", ")}`);
        process.exit(1);
    }
    // Cache-first: return cached data unless --refresh requested
    if (!refresh) {
        const cached = (0, metadata_1.readCache)(infoType);
        if (cached) {
            console.log(JSON.stringify(cached.data, null, 2));
            return;
        }
    }
    const config = (0, loader_1.loadConfig)();
    if (!config) {
        console.error('Error: No configuration found. Run "cc-backlog config set" first.');
        process.exit(1);
    }
    const client = new client_1.BacklogApiClient(config);
    try {
        let data;
        switch (infoType) {
            case "statuses":
                data = await client.getStatuses(config.projectKey);
                break;
            case "issue-types":
                data = await client.getIssueTypes(config.projectKey);
                break;
            case "priorities":
                data = await client.getPriorities();
                break;
            case "resolutions":
                data = await client.getResolutions();
                break;
            case "users":
                data = await client.getProjectUsers(config.projectKey);
                break;
            case "categories":
                data = await client.getCategories(config.projectKey);
                break;
            case "versions":
                data = await client.getVersions(config.projectKey);
                break;
        }
        (0, metadata_1.writeCache)(infoType, data);
        console.log(JSON.stringify(data, null, 2));
    }
    catch (err) {
        if (err instanceof client_1.BacklogClientError) {
            console.error(`Error: ${err.message}`);
            process.exit(2);
        }
        throw err;
    }
}
