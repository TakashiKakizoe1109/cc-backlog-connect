"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configShow = configShow;
exports.configSet = configSet;
const loader_1 = require("../config/loader");
function configShow() {
    const config = (0, loader_1.loadConfig)();
    if (!config) {
        console.log("No configuration found.");
        console.log('Run "cc-backlog config set --space <name> --api-key <key> --project-key <KEY>" to configure.');
        process.exit(1);
    }
    console.log("Current configuration:");
    console.log(`  space:       ${config.space}`);
    console.log(`  apiKey:      ${(0, loader_1.maskApiKey)(config.apiKey)}`);
    console.log(`  projectKey:  ${config.projectKey}`);
}
function configSet(opts) {
    if (!opts.space && !opts.apiKey && !opts.projectKey) {
        console.error("Error: At least one of --space, --api-key, or --project-key is required.");
        process.exit(1);
    }
    const existing = (0, loader_1.loadConfig)();
    const config = {
        space: opts.space ?? existing?.space ?? "",
        apiKey: opts.apiKey ?? existing?.apiKey ?? "",
        projectKey: opts.projectKey ?? existing?.projectKey ?? "",
    };
    if (!config.space || !config.apiKey || !config.projectKey) {
        const missing = [];
        if (!config.space)
            missing.push("--space");
        if (!config.apiKey)
            missing.push("--api-key");
        if (!config.projectKey)
            missing.push("--project-key");
        console.warn(`Warning: Missing required config: ${missing.join(", ")}`);
    }
    (0, loader_1.saveConfig)(config);
    console.log("Configuration saved.");
    console.log("");
    console.log("Note: Add .cc-backlog/config.json to your .gitignore to avoid committing API keys.");
}
