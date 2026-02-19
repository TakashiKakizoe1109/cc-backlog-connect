import { loadConfig, saveConfig, maskApiKey } from "../config/loader";
import { BacklogConfig } from "../config/types";

interface ConfigSetOptions {
  space?: string;
  apiKey?: string;
  projectKey?: string;
  mode?: string;
  parallel?: number;
}

export function configShow(): void {
  const config = loadConfig();
  if (!config) {
    console.log("No configuration found.");
    console.log('Run "cc-backlog config set --space <name> --api-key <key> --project-key <KEY>" to configure.');
    process.exit(1);
  }
  console.log("Current configuration:");
  console.log(`  space:       ${config.space}`);
  console.log(`  apiKey:      ${maskApiKey(config.apiKey)}`);
  console.log(`  projectKey:  ${config.projectKey}`);
  console.log(`  mode:        ${config.mode ?? "read"}`);
  console.log(`  parallel:    ${config.parallel ?? 5}`);
}

export function configSet(opts: ConfigSetOptions): void {
  if (!opts.space && !opts.apiKey && !opts.projectKey && !opts.mode && opts.parallel === undefined) {
    console.error("Error: At least one of --space, --api-key, --project-key, --mode, or --parallel is required.");
    process.exit(1);
  }

  if (opts.mode && opts.mode !== "read" && opts.mode !== "write") {
    console.error('Error: --mode must be "read" or "write".');
    process.exit(1);
  }

  if (opts.parallel !== undefined && (opts.parallel < 1 || opts.parallel > 20 || !Number.isInteger(opts.parallel))) {
    console.error("Error: --parallel must be an integer between 1 and 20.");
    process.exit(1);
  }

  const existing = loadConfig();
  const config: BacklogConfig = {
    space: opts.space ?? existing?.space ?? "",
    apiKey: opts.apiKey ?? existing?.apiKey ?? "",
    projectKey: opts.projectKey ?? existing?.projectKey ?? "",
    mode: (opts.mode as "read" | "write") ?? existing?.mode,
    parallel: opts.parallel ?? existing?.parallel,
  };

  if (!config.space || !config.apiKey || !config.projectKey) {
    const missing: string[] = [];
    if (!config.space) missing.push("--space");
    if (!config.apiKey) missing.push("--api-key");
    if (!config.projectKey) missing.push("--project-key");
    console.warn(`Warning: Missing required config: ${missing.join(", ")}`);
  }

  saveConfig(config);
  console.log("Configuration saved.");
  console.log("");
  console.log("Note: Add .cc-backlog/config.json to your .gitignore to avoid committing API keys.");
}
