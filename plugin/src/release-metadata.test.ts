import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const paths = [
  "plugin/package.json", "plugin/package-lock.json", "plugin/.claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json", "CHANGELOG.md", "README.md",
  "plugin/skills/backlog-issue/reference.md", "plugin/skills/project-info/SKILL.md",
  "plugin/skills/project-info/reference.md", "plugin/commands/sync.md",
];
type Snapshot = Record<string, string>;
const snapshot: Snapshot = Object.fromEntries(paths.map(path => [path, readFileSync(resolve(root, path), "utf8")]));

function section(text: string, heading: string): string {
  const lines = text.split("\n");
  const start = lines.indexOf(heading);
  if (start === -1) return "";
  const depth = heading.match(/^#+/)![0].length;
  const body: string[] = [];
  let fenced = false;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("```")) fenced = !fenced;
    if (!fenced && new RegExp(`^#{1,${depth}} `).test(line)) break;
    body.push(line);
  }
  return body.join("\n");
}

/** This is a preparation gate. Passing it does not prove a tag or release exists. */
function validateReleasePreparation(files: Snapshot): string[] {
  const errors: string[] = [];
  const json = (path: string) => {
    try { return JSON.parse(files[path]); }
    catch { errors.push(`${path}: invalid or missing JSON`); return {}; }
  };
  const pkg = json("plugin/package.json");
  const lock = json("plugin/package-lock.json");
  const manifest = json("plugin/.claude-plugin/plugin.json");
  const marketplace = json(".claude-plugin/marketplace.json");
  const entry = marketplace.plugins?.filter((item: { name: string }) => item.name === pkg.name);
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version ?? "")) errors.push("package.json: invalid project version");
  for (const [label, version] of [
    ["package-lock.json version", lock.version], ["package-lock.json root package", lock.packages?.[""]?.version],
    ["plugin.json", manifest.version], ["marketplace.json", entry?.[0]?.version],
  ]) {
    if (version !== pkg.version) errors.push(`${label}: version must match package.json (${pkg.version})`);
  }
  if (manifest.name !== pkg.name || lock.packages?.[""]?.name !== pkg.name || entry?.length !== 1 || entry[0].source !== "./plugin") {
    errors.push("package/plugin/marketplace identity or source is inconsistent");
  }
  const changelog = files["CHANGELOG.md"] ?? "";
  const latest = changelog.match(/^## \[([0-9][^\]]*)\] - (\d{4}-\d{2}-\d{2})$/m);
  if (!latest || latest[1] !== pkg.version) errors.push("CHANGELOG.md: latest dated version must match package.json");
  if (latest && (!Number.isFinite(Date.parse(latest[2])) || new Date(latest[2]).toISOString().slice(0,10) !== latest[2])) {
    errors.push("CHANGELOG.md: release date must be a valid calendar date");
  }
  if (!changelog.includes("## [Unreleased]\n")) errors.push("CHANGELOG.md: retain Unreleased for future work");
  if (latest && !/^\s*- .+/m.test(section(changelog, latest[0]))) errors.push("CHANGELOG.md: current version needs change notes");

  // Check the public option tables, not a stray mention elsewhere in the docs.
  const tableHas = (body: string, name: string) => body.split("\n").some(line => line.startsWith("| ") && line.split("|")[1].trim() === `\`${name}\``);
  const issueRef = files["plugin/skills/backlog-issue/reference.md"] ?? "";
  for (const [heading, option] of [
    ["### issue create", "--custom-fields"], ["### issue update", "--custom-fields"],
    ["### issue search", "--custom-field-filters"], ["### sync（トップレベルコマンド）", "--custom-field-filters"],
  ]) {
    if (!tableHas(section(issueRef, heading), option)) errors.push(`backlog-issue/reference.md: ${heading} option table missing ${option}`);
  }
  const projectSkill = files["plugin/skills/project-info/SKILL.md"] ?? "";
  if (!tableHas(section(projectSkill, "## 利用可能なタイプ"), "custom-fields")) errors.push("project-info/SKILL.md: custom-fields missing from metadata types");
  if (!section(files["plugin/skills/project-info/reference.md"] ?? "", "### custom-fields")) errors.push("project-info/reference.md: custom-fields response example missing");
  if (!tableHas(section(files["plugin/commands/sync.md"] ?? "", "## フィルタオプション（引数直接指定時の参考）"), "--custom-field-filters <JSON>")) errors.push("commands/sync.md: custom field filter option missing");

  const readme = files["README.md"] ?? "";
  const customReadme = section(readme, "### カスタムフィールド（カスタム属性）");
  if (!customReadme.includes("project-info custom-fields") || !customReadme.includes("--custom-fields '") || !customReadme.includes("--custom-field-filters '")) {
    errors.push("README.md: custom field discovery/write/filter examples missing");
  }
  for (const path of ["README.md", "plugin/skills/backlog-issue/reference.md", "plugin/skills/project-info/reference.md", "plugin/commands/sync.md"]) {
    const text = files[path] ?? "";
    const snippets = [...text.matchAll(/```json\s*\n([\s\S]*?)```/g)].map(match => match[1]);
    const flags: string[] = [];
    for (const block of text.matchAll(/```(?:bash|sh)\s*\n([\s\S]*?)```/g)) {
      for (const argument of block[1].matchAll(/--custom-field(?:s|-filters)\s+([^\n]*)/g)) {
        const quoted = argument[1].match(/^'([^']*)'(?:\s|$)/);
        if (!quoted) errors.push(`${path}: custom field shell example needs a complete quoted JSON argument`);
        else flags.push(quoted[1]);
      }
    }
    for (const example of [...snippets, ...flags]) {
      try { JSON.parse(example); } catch { errors.push(`${path}: invalid JSON example`); }
    }
  }
  const projectExample = section(files["plugin/skills/project-info/reference.md"] ?? "", "### custom-fields");
  try {
    const definitions = JSON.parse(projectExample.match(/```json\s*\n([\s\S]*?)```/)?.[1] ?? "null");
    if (!Array.isArray(definitions) || definitions.length === 0 || !definitions.every(field =>
      Number.isInteger(field.id) && Number.isInteger(field.typeId) && field.typeId >= 1 && field.typeId <= 8 &&
      typeof field.required === "boolean" && Array.isArray(field.applicableIssueTypes))) {
      errors.push("project-info/reference.md: custom-fields must include a typed definition JSON example");
    }
  } catch { errors.push("project-info/reference.md: invalid custom-fields definition example"); }
  const responseSection = section(issueRef, "### BacklogIssue（get / search / create / update の出力）");
  try {
    const example = JSON.parse(responseSection.match(/```json\s*\n([\s\S]*?)```/)?.[1] ?? "{}");
    if (!Array.isArray(example.customFields) || !example.customFields.some((field: any) => Number.isInteger(field.id) && Number.isInteger(field.fieldTypeId) && Object.hasOwn(field,"value"))) {
      errors.push("backlog-issue/reference.md: issue JSON must demonstrate typed customFields values");
    }
  } catch { /* The JSON example validator above reports this. */ }
  return errors;
}

function withJsonChange(path: string, mutate: (data: any) => void): Snapshot {
  const files = { ...snapshot };
  const value = JSON.parse(files[path]); mutate(value); files[path] = JSON.stringify(value);
  return files;
}

describe("release preparation gate", () => {
  it("keeps project metadata, changelog and public interface examples consistent", () => {
    expect(validateReleasePreparation(snapshot)).toEqual([]);
  });
  it.each([
    ["plugin/package.json", (data: any) => { data.version = "0.0.0"; }],
    ["plugin/package-lock.json", (data: any) => { data.version = "0.0.0"; }],
    ["plugin/package-lock.json", (data: any) => { data.packages[""].version = "0.0.0"; }],
    ["plugin/.claude-plugin/plugin.json", (data: any) => { data.version = "0.0.0"; }],
    [".claude-plugin/marketplace.json", (data: any) => { data.plugins[0].version = "0.0.0"; }],
  ] as const)("rejects an independently stale version in %s", (path, mutate) => {
    expect(validateReleasePreparation(withJsonChange(path, mutate))).toContainEqual(expect.stringContaining("version"));
  });
  it("rejects missing/invalid metadata and a wrong marketplace source", () => {
    expect(validateReleasePreparation({...snapshot,"plugin/package.json":"{"})).toContainEqual(expect.stringContaining("invalid"));
    expect(validateReleasePreparation(withJsonChange(".claude-plugin/marketplace.json", data => { data.plugins[0].source = "./wrong"; }))).toContainEqual(expect.stringContaining("identity or source"));
  });
  it("rejects missing or undated current-version changelog entries", () => {
    const version = JSON.parse(snapshot["plugin/package.json"]).version;
    for (const replacement of ["## [Unreleased feature]",`## [${version}]`]) {
      const files = {...snapshot,"CHANGELOG.md":snapshot["CHANGELOG.md"].replace(new RegExp(`## \\[${version.replace(/\./g,"\\.")}\\] - \\d{4}-\\d{2}-\\d{2}`),replacement)};
      expect(validateReleasePreparation(files)).toContainEqual(expect.stringContaining("latest dated version"));
    }
  });
  it.each(["### issue create","### issue update","### issue search","### sync（トップレベルコマンド）"])("rejects missing options in %s even if detailed docs still mention them", heading => {
    const path = "plugin/skills/backlog-issue/reference.md";
    const body = section(snapshot[path],heading);
    const changed = body.split("\n").filter(line=>!line.startsWith("| `--custom-field")).join("\n");
    expect(changed).not.toBe(body);
    expect(validateReleasePreparation({...snapshot,[path]:snapshot[path].replace(body,changed)})).toContainEqual(expect.stringContaining("option table missing"));
  });
  it.each(["README.md","plugin/skills/project-info/reference.md","plugin/commands/sync.md"])("rejects missing feature documentation: %s", path => {
    expect(validateReleasePreparation({...snapshot,[path]:""})).not.toEqual([]);
  });
  it("rejects a malformed JSON example and an issue response without customFields", () => {
    const path = "plugin/skills/backlog-issue/reference.md";
    const invalid = snapshot[path].replace('"actualHours": 3,','"actualHours": nope,');
    expect(validateReleasePreparation({...snapshot,[path]:invalid})).toContainEqual(expect.stringContaining("invalid JSON example"));
    const missing = snapshot[path].replace('"customFields": [','"omittedFields": [');
    expect(validateReleasePreparation({...snapshot,[path]:missing})).toContainEqual(expect.stringContaining("typed customFields"));
  });
});

it("ignores headings inside fenced examples when inspecting Markdown sections", () => {
  expect(section("### Example\n```bash\n# comment\necho hello\n```\n### Next\ntext","### Example")).toContain("echo hello");
});

it.each([
  ["README.md", "--custom-fields '{\"102\":5}'", "--custom-fields '{\"102\":5'"],
  ["README.md", "--custom-fields '{\"102\":5}'", "--custom-fields '{\"102\":5}"],
])("rejects malformed shell JSON even without an outer brace or closing quote", (path, original, broken) => {
  expect(snapshot[path]).toContain(original);
  expect(validateReleasePreparation({...snapshot,[path]:snapshot[path].replace(original,broken)})).not.toEqual([]);
});
it("rejects prose-only or wrongly typed project custom-field examples", () => {
  const path = "plugin/skills/project-info/reference.md";
  const body = section(snapshot[path],"### custom-fields");
  for (const invalid of ["Definitions are listed here.\n",'```json\n[{"id":101,"typeId":"text","required":false,"applicableIssueTypes":[]}]\n```\n']) {
    expect(validateReleasePreparation({...snapshot,[path]:snapshot[path].replace(body,invalid)})).toContainEqual(expect.stringContaining("typed definition"));
  }
});
