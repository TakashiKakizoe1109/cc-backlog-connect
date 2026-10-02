import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueCommand } from "./issue";
import { syncCommand } from "./sync";
import * as loader from "../config/loader";
import * as cache from "../cache/metadata";
import * as fs from "node:fs";

// Real command, validation, formatter and API client. Only I/O is mocked.
vi.mock("../config/loader");
vi.mock("../cache/metadata");
vi.mock("node:fs");

const config = { space: "synthetic", apiKey: "synthetic-key", projectKey: "P", mode: "write" as const };
const definitions = [
  { id: 101, typeId: 1, name: "Customer", description: "", required: true, applicableIssueTypes: [1] },
  { id: 102, typeId: 3, name: "Points", description: "", required: false, applicableIssueTypes: [], min: 0, max: 10 },
  { id: 103, typeId: 6, name: "Environments", description: "", required: false, applicableIssueTypes: [], items: [{id:11,name:"A"},{id:12,name:"B"}] },
];
const issue = {
  id: 1, issueKey: "P-1", projectId: 10, summary: "Fixture issue", description: "Fixture only",
  status: {id:1,name:"Open"}, issueType: {id:1,name:"Task"}, priority: {id:3,name:"Normal"},
  assignee: null, createdUser: {id:1,name:"Fixture",userId:"fixture"},
  created: "2026-10-02", updated: "2026-10-02", dueDate: null, estimatedHours: null, actualHours: null,
  customFields: [{id:102,fieldTypeId:3,name:"Points",value:0},{id:103,fieldTypeId:6,name:"Environments",value:[{id:11,name:"A"},{id:12,name:"B"}]}],
};
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status,headers:{"Content-Type":"application/json"}});
let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;
let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loader.loadConfig).mockReturnValue(config);
  vi.mocked(loader.findProjectRoot).mockReturnValue("/tmp/synthetic-backlog-tests");
  vi.mocked(cache.readCache).mockReturnValue(null);
  vi.mocked(fs.existsSync).mockReturnValue(false);
  fetchMock = vi.fn().mockImplementation(async (raw: string, init?: RequestInit) => {
    const url = new URL(raw);
    const method = init?.method ?? "GET";
    if (url.pathname === "/api/v2/projects/P") return response({id:10,projectKey:"P",name:"Fixture"});
    if (url.pathname === "/api/v2/projects/10/customFields") return response(definitions);
    if (url.pathname === "/api/v2/issues/P-1" && method === "GET") return response(issue);
    if (url.pathname === "/api/v2/issues/P-1/attachments" || url.pathname === "/api/v2/issues/P-1/comments") return response([]);
    if (url.pathname === "/api/v2/issues/count") return response({count:1});
    if (url.pathname === "/api/v2/issues") return response(method === "GET" ? [issue] : issue);
    if (url.pathname === "/api/v2/issues/P-1" && method === "PATCH") return response(issue);
    throw new Error(`Unexpected synthetic request: ${method} ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  exitSpy = vi.spyOn(process,"exit").mockImplementation((() => {throw new Error("exit");}) as never);
  errorSpy = vi.spyOn(console,"error").mockImplementation(() => {});
  logSpy = vi.spyOn(console,"log").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const writes = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST" || init?.method === "PATCH");

describe("CLI to mocked Backlog HTTP", () => {
  it("creates with JSON values and emits exactly one correctly encoded POST", async () => {
    await issueCommand(["create","--summary","Fixture issue","--type-id","1","--priority-id","3","--custom-fields",'{"101":"日本語 &=","102":0,"103":[11,12]}']);
    expect(writes()).toHaveLength(1);
    const body = new URLSearchParams(writes()[0][1].body);
    expect(body.get("projectId")).toBe("10");
    expect(body.get("customField_101")).toBe("日本語 &=");
    expect(body.get("customField_102")).toBe("0");
    expect(body.get("customField_103[0]")).toBe("11");
    expect(body.get("customField_103[1]")).toBe("12");
    expect(logSpy).toHaveBeenCalledWith("Created P-1: Fixture issue");
  });
  it("updates only the supplied custom field without copying other current values", async () => {
    await issueCommand(["update","P-1","--custom-fields",'{"102":5}']);
    expect(writes()).toHaveLength(1);
    const body = new URLSearchParams(writes()[0][1].body);
    expect([...body.entries()]).toEqual([["customField_102","5"]]);
  });
  it.each(["create","update"])("blocks %s in read mode before any HTTP call", async action => {
    vi.mocked(loader.loadConfig).mockReturnValue({...config,mode:"read"});
    const args = action === "create"
      ? ["create","--summary","Fixture issue","--type-id","1","--priority-id","3"]
      : ["update","P-1"];
    await expect(issueCommand([...args,"--custom-fields",'{"102":0}'])).rejects.toThrow("exit");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("write mode"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
  it.each(['{"101":""}', '{"102":"5"}', '{"103":[999]}', '{"102":null}', '{"103":[]}'])("rejects invalid JSON values without a write: %s", async input => {
    await expect(issueCommand(["update","P-1","--custom-fields",input])).rejects.toThrow("exit");
    expect(writes()).toHaveLength(0);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(logSpy).not.toHaveBeenCalled();
  });
  it("preserves metadata HTTP 403 failure and prevents mutation", async () => {
    const handler = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (raw: string, init?: RequestInit) => new URL(raw).pathname === "/api/v2/projects/10/customFields"
      ? response({errors:[{code:4,message:"Access denied",moreInfo:""}]},403)
      : handler(raw,init));
    await expect(issueCommand(["update","P-1","--custom-fields",'{"102":0}'])).rejects.toThrow("exit");
    expect(writes()).toHaveLength(0);
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("AccessDeniedError"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[1][0]).pathname).toBe("/api/v2/projects/10/customFields");
  });
  it("preserves validation errors returned by Backlog after successful preflight", async () => {
    const handler = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (raw: string, init?: RequestInit) => init?.method === "PATCH"
      ? response({errors:[{code:7,message:"Definition changed",moreInfo:"customField_102"}]},400)
      : handler(raw,init));
    await expect(issueCommand(["update","P-1","--custom-fields",'{"102":0}'])).rejects.toThrow("exit");
    expect(writes()).toHaveLength(1);
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Definition changed"));
    expect(logSpy).not.toHaveBeenCalled();
  });
  it("uses equivalent filters for search, count and sync and renders synced values", async () => {
    const raw = '{"101":"example","102":{"min":0,"max":10},"103":[11,12]}';
    await issueCommand(["search","--custom-field-filters",raw]);
    await issueCommand(["count","--custom-field-filters",raw]);
    await syncCommand({all:true,force:true,dryRun:false,customFieldFilters:JSON.parse(raw)});
    const requests = fetchMock.mock.calls.map(([url])=>new URL(url)).filter(url=>["/api/v2/issues","/api/v2/issues/count"].includes(url.pathname));
    expect(requests).toHaveLength(3);
    const filters = requests.map(url=>[...url.searchParams.entries()].filter(([key])=>key.startsWith("customField_")));
    const expected = [
      ["customField_101","example"], ["customField_102_min","0"], ["customField_102_max","10"],
      ["customField_103[0]","11"], ["customField_103[1]","12"],
    ];
    for (const filter of filters) expect(filter).toEqual(expected);
    expect(writes()).toHaveLength(0);
    expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining("/P-1/issue.md"),expect.stringContaining("**Points** (102): 0"));
    expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining("/P-1/issue.md"),expect.stringContaining("A, B"));
  });
  it("returns raw customFields on issue get", async () => {
    await issueCommand(["get","P-1"]);
    expect(JSON.parse(logSpy.mock.calls[0][0]).customFields).toEqual(issue.customFields);
  });
});
