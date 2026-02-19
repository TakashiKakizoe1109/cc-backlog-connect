import * as fs from "node:fs";
import * as path from "node:path";
import { findProjectRoot } from "../config/loader";

export type MetadataType =
  | "statuses"
  | "issue-types"
  | "priorities"
  | "resolutions"
  | "users"
  | "categories"
  | "versions"
  | "project";

export type ResolvableMetadataType = Exclude<MetadataType, "project">;

export interface CachedMetadata<T = unknown> {
  cachedAt: string;
  data: T[];
}

function cacheDir(): string {
  return path.join(findProjectRoot(), ".cc-backlog");
}

function cachePath(type: MetadataType): string {
  return path.join(cacheDir(), `${type}.json`);
}

export function readCache<T = unknown>(type: MetadataType): CachedMetadata<T> | null {
  const filePath = cachePath(type);
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.cachedAt !== "string" ||
      !Array.isArray(parsed.data)
    ) {
      return null;
    }
    return parsed as CachedMetadata<T>;
  } catch {
    return null;
  }
}

export function writeCache<T = unknown>(type: MetadataType, data: T[]): void {
  const dir = cacheDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const content: CachedMetadata<T> = {
    cachedAt: new Date().toISOString(),
    data,
  };
  fs.writeFileSync(cachePath(type), JSON.stringify(content, null, 2) + "\n", {
    mode: 0o600,
  });
}

export function resolveNameToId(
  type: ResolvableMetadataType,
  name: string
): number | undefined {
  const cached = readCache<{ id: number; name: string; userId?: string | null }>(type);
  if (!cached) return undefined;

  const lowerName = name.toLowerCase();

  // First: exact match
  const exact = cached.data.find(
    (item) =>
      item.name.toLowerCase() === lowerName ||
      (type === "users" && item.userId != null && item.userId.toLowerCase() === lowerName)
  );
  if (exact) return exact.id;

  // Second: partial match (only if exactly one result)
  const partials = cached.data.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerName) ||
      (type === "users" && item.userId != null && item.userId.toLowerCase().includes(lowerName))
  );
  if (partials.length === 1) return partials[0].id;

  return undefined;
}
