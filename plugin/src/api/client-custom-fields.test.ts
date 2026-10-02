import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BacklogApiClient, BacklogClientError } from "./client";
const defs = [
  { id: 1, typeId: 1, name: "Text", required: false, applicableIssueTypes: [] },
  { id: 2, typeId: 3, name: "Number", required: false, applicableIssueTypes: [] },
  { id: 3, typeId: 6, name: "List", required: false, applicableIssueTypes: [], items: [{id:11,name:"A"},{id:12,name:"B"}] },
];
const client = () => new BacklogApiClient({space:"test-space",apiKey:"synthetic-test-key",projectKey:"PROJ"});
let fetchSpy: ReturnType<typeof vi.fn>;
const ok = (value: unknown) => new Response(JSON.stringify(value), {status:200,headers:{"Content-Type":"application/json"}});
beforeEach(() => { fetchSpy = vi.fn(); vi.stubGlobal("fetch",fetchSpy); });
afterEach(() => { vi.unstubAllGlobals(); });
describe("custom field API integration", () => {
  it("gets custom field definitions for a safely encoded project", async () => {
    fetchSpy.mockResolvedValueOnce(ok(defs));
    expect(await client().getCustomFields("A/B")).toEqual(defs);
    expect(new URL(fetchSpy.mock.calls[0][0]).pathname).toBe("/api/v2/projects/A%2FB/customFields");
  });
  it("POST preserves built-in arrays and encodes custom lists with explicit indexes", async () => {
    fetchSpy.mockResolvedValueOnce(ok(defs)).mockResolvedValueOnce(ok({issueKey:"PROJ-1"}));
    await client().addIssue({projectId:1,summary:"test",issueTypeId:1,priorityId:3,categoryId:[9,10],customFields:{1:"日本語 &=",2:0,3:[11,12]}});
    const [url, init] = fetchSpy.mock.calls[1];
    const body = new URLSearchParams(init.body);
    expect(init.method).toBe("POST"); expect(url).toContain("/issues?");
    expect(body.get("customField_1")).toBe("日本語 &="); expect(body.get("customField_2")).toBe("0");
    expect(body.get("customField_3[0]")).toBe("11"); expect(body.get("customField_3[1]")).toBe("12");
    expect(body.getAll("categoryId[]")).toEqual(["9","10"]); expect(body.has("customFields")).toBe(false);
  });
  it("PATCH validates using target issue project and updated issue type", async () => {
    fetchSpy.mockResolvedValueOnce(ok({projectId:42,issueType:{id:1}})).mockResolvedValueOnce(ok(defs)).mockResolvedValueOnce(ok({}));
    await client().updateIssue("OTHER-1",{issueTypeId:2,customFields:{1:""}});
    expect(fetchSpy.mock.calls[1][0]).toContain("/projects/42/customFields?");
    expect(fetchSpy.mock.calls[2][1].method).toBe("PATCH");
    expect(new URLSearchParams(fetchSpy.mock.calls[2][1].body).get("customField_1")).toBe("");
  });
  it("does not mutate on validation or definition-access errors", async () => {
    fetchSpy.mockResolvedValueOnce(ok(defs));
    await expect(client().addIssue({projectId:1,summary:"x",issueTypeId:1,priorityId:3,customFields:{99:"x"}})).rejects.toThrow(/99/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({errors:[{code:4,message:"No access",moreInfo:""}]}),{status:403}));
    await expect(client().getCustomFields("PROJ")).rejects.toBeInstanceOf(BacklogClientError);
  });
  it.each(["searchIssues","countIssues","getIssues"] as const)("%s sends validated custom field filters", async method => {
    fetchSpy.mockResolvedValueOnce(ok(defs)).mockResolvedValueOnce(ok(method==="countIssues"?{count:0}:[]));
    await client()[method](1,{customFieldFilters:{1:"hello",2:{min:0},3:[11,12]}});
    const params = new URL(fetchSpy.mock.calls[1][0]).searchParams;
    expect(params.get("customField_2_min")).toBe("0"); expect(params.get("customField_3[1]")).toBe("12");
  });
  it("keeps filters on subsequent pages and fetches definitions once", async () => {
    fetchSpy.mockResolvedValueOnce(ok(defs)).mockResolvedValueOnce(ok(Array.from({length:100},()=>({id:1})))).mockResolvedValueOnce(ok([]));
    await client().getIssues(1,{customFieldFilters:{1:"hello"}});
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(new URL(fetchSpy.mock.calls[2][0]).searchParams.get("customField_1")).toBe("hello");
    expect(new URL(fetchSpy.mock.calls[2][0]).searchParams.get("offset")).toBe("100");
  });
  it("does not add requests when custom fields are omitted", async () => {
    fetchSpy.mockResolvedValue(ok({}));
    await client().updateIssue("PROJ-1",{summary:"unchanged flow"});
    expect(fetchSpy).toHaveBeenCalledTimes(1); expect(fetchSpy.mock.calls[0][1].method).toBe("PATCH");
  });
});

it("PATCH honors a changed issue type before writing", async () => {
  fetchSpy.mockResolvedValueOnce(ok({projectId:42,issueType:{id:1}}))
    .mockResolvedValueOnce(ok([{...defs[0],applicableIssueTypes:[1]}]));
  await expect(client().updateIssue("OTHER-1",{issueTypeId:2,customFields:{1:"x"}})).rejects.toThrow(/issue type/);
  expect(fetchSpy).toHaveBeenCalledTimes(2);
});
it("rejects unsafe field keys without making any request", async () => {
  await expect(client().addIssue({projectId:1,summary:"x",issueTypeId:1,priorityId:3,customFields:{"apiKey":"x"}})).rejects.toThrow(/positive integer/);
  expect(fetchSpy).not.toHaveBeenCalled();
});
it("preserves API invalid-request errors and does not retry failed writes", async () => {
  fetchSpy.mockResolvedValueOnce(ok(defs)).mockResolvedValueOnce(new Response(JSON.stringify({errors:[{code:7,message:"Field is required",moreInfo:"customField_1"}]}),{status:400}));
  await expect(client().addIssue({projectId:1,summary:"x",issueTypeId:1,priorityId:3,customFields:{1:"x"}})).rejects.toThrow(/InvalidRequestError.*Field is required/);
  expect(fetchSpy).toHaveBeenCalledTimes(2);
});

it("does not write when the target issue lacks a trustworthy project ID", async () => {
  fetchSpy.mockResolvedValueOnce(ok({issueType:{id:1}}));
  await expect(client().updateIssue("P-1",{customFields:{1:"x"}})).rejects.toThrow(/target issue project/);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});
it.each(["addIssue","updateIssue"] as const)("%s with empty custom fields follows the legacy single request path", async method => {
  fetchSpy.mockResolvedValueOnce(ok({}));
  if (method === "addIssue") await client().addIssue({projectId:1,summary:"x",issueTypeId:1,priorityId:3,customFields:{}});
  else await client().updateIssue("P-1",{summary:"x",customFields:{}});
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});
it("retries 429 with an identical custom-field body and only one definition read", async () => {
  vi.useFakeTimers();
  try {
    fetchSpy.mockResolvedValueOnce(ok(defs))
      .mockResolvedValueOnce(new Response("",{status:429,headers:{"X-RateLimit-Reset":String(Math.floor(Date.now()/1000))}}))
      .mockResolvedValueOnce(ok({}));
    const pending = client().addIssue({projectId:1,summary:"x",issueTypeId:1,priorityId:3,customFields:{3:[11,12]}});
    await vi.runAllTimersAsync(); await pending;
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy.mock.calls[1][1].body).toBe(fetchSpy.mock.calls[2][1].body);
  } finally { vi.useRealTimers(); }
});
