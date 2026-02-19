import * as fs from "node:fs";
import * as path from "node:path";
import { BacklogConfig } from "./types";

const CONFIG_DIR = ".cc-backlog";
const CONFIG_FILE = "config.json";

export function findProjectRoot(startDir: string = process.cwd()): string {
  let dir = path.resolve(startDir);
  while (true) {
    if (
      fs.existsSync(path.join(dir, CONFIG_DIR)) ||
      fs.existsSync(path.join(dir, ".git"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return startDir;
    }
    dir = parent;
  }
}

function configPath(projectRoot: string): string {
  return path.join(projectRoot, CONFIG_DIR, CONFIG_FILE);
}

export function loadConfig(): BacklogConfig | null {
  const root = findProjectRoot();
  const cfgPath = configPath(root);
  if (!fs.existsSync(cfgPath)) {
    return null;
  }
  const raw = fs.readFileSync(cfgPath, "utf-8");
  return JSON.parse(raw) as BacklogConfig;
}

export function saveConfig(config: BacklogConfig): void {
  const root = findProjectRoot();
  const dir = path.join(root, CONFIG_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath(root), JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}
