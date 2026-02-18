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
    console.log(`  mode:        ${config.mode ?? "read"}`);
}
function configSet(opts) {
    if (!opts.space && !opts.apiKey && !opts.projectKey && !opts.mode) {
        console.error("Error: At least one of --space, --api-key, --project-key, or --mode is required.");
        process.exit(1);
    }
    if (opts.mode && opts.mode !== "read" && opts.mode !== "write") {
        console.error('Error: --mode must be "read" or "write".');
        process.exit(1);
    }
    const existing = (0, loader_1.loadConfig)();
    const config = {
        space: opts.space ?? existing?.space ?? "",
        apiKey: opts.apiKey ?? existing?.apiKey ?? "",
        projectKey: opts.projectKey ?? existing?.projectKey ?? "",
        mode: opts.mode ?? existing?.mode,
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
