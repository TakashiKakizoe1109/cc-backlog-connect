import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, utimesSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const installer = readFileSync(resolve(__dirname, "../../scripts/smart-install.sh"), "utf8");
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, {recursive:true,force:true}); });

function fixture(marker?: string) {
  const root = mkdtempSync(join(tmpdir(), "backlog-install-test-"));
  roots.push(root);
  for (const dir of ["scripts","src","dist","node_modules","bin"]) mkdirSync(join(root,dir));
  writeFileSync(join(root,"scripts/smart-install.sh"),installer);
  writeFileSync(join(root,"package.json"),JSON.stringify({version:"0.5.0"}));
  writeFileSync(join(root,"src/index.ts"),"new source");
  writeFileSync(join(root,"dist/index.js"),"stale bundle");
  for (const file of ["src/index.ts","dist/index.js"]) utimesSync(join(root,file),1700000000,1700000000);
  if (marker !== undefined) writeFileSync(join(root,".install-version"),marker+"\n");
  const fakeNpm = '#!/bin/sh\necho npm >> "$CALLS"\n[ "$FAIL_INSTALL" != 1 ]\n';
  const fakeNpx = '#!/bin/sh\necho npx >> "$CALLS"\nif [ "$FAIL_BUILD" = 1 ]; then\n  [ "$PARTIAL_OUTPUT" != 1 ] || echo partial > dist/index.js\n  exit 1\nfi\necho rebuilt > dist/index.js\n';
  for (const [name,body] of [["npm",fakeNpm],["npx",fakeNpx]]) {
    writeFileSync(join(root,"bin",name),body); chmodSync(join(root,"bin",name),0o755);
  }
  return {
    root,
    run: (extra: Record<string,string> = {}) => spawnSync("bash",[join(root,"scripts/smart-install.sh")],{
      env:{PATH:join(root,"bin")+":/usr/bin:/bin",HOME:root,CALLS:join(root,"calls"),...extra},encoding:"utf8",
    }),
    calls: () => existsSync(join(root,"calls")) ? readFileSync(join(root,"calls"),"utf8").trim().split("\n") : [],
    marker: () => existsSync(join(root,".install-version")) ? readFileSync(join(root,".install-version"),"utf8").trim() : undefined,
  };
}

describe("smart installer release freshness", () => {
  it.each([undefined,"0.4.0"])("rebuilds after a fresh/version install despite equal timestamps (%s)", marker => {
    const f = fixture(marker);
    expect(f.run().status).toBe(0);
    expect(f.calls()).toEqual(["npm","npx"]);
    expect(readFileSync(join(f.root,"dist/index.js"),"utf8")).toContain("rebuilt");
    expect(f.marker()).toBe("0.5.0");
    expect(f.run().status).toBe(0);
    expect(f.calls()).toEqual(["npm","npx"]);
  });
  it("does no work when version and source are unchanged", () => {
    const f = fixture("0.5.0");
    expect(f.run().status).toBe(0);
    expect(f.calls()).toEqual([]);
  });
  it("rebuilds missing output without reinstalling dependencies", () => {
    const f = fixture("0.5.0"); rmSync(join(f.root,"dist/index.js"));
    expect(f.run().status).toBe(0); expect(f.calls()).toEqual(["npx"]);
  });
  it("rebuilds newer source without reinstalling dependencies", () => {
    const f = fixture("0.5.0"); utimesSync(join(f.root,"src/index.ts"),1700000001,1700000001);
    expect(f.run().status).toBe(0); expect(f.calls()).toEqual(["npx"]);
  });
  it("does not advance the marker on install failure", () => {
    const f = fixture("0.4.0");
    expect(f.run({FAIL_INSTALL:"1"}).status).not.toBe(0);
    expect(f.marker()).toBeUndefined(); expect(f.calls()).toEqual(["npm"]);
  });
  it("does not mark a failed build as installed and retries it next time", () => {
    const f = fixture("0.4.0"); utimesSync(join(f.root,"src/index.ts"),1700000001,1700000001);
    expect(f.run({FAIL_BUILD:"1"}).status).not.toBe(0);
    expect(f.marker()).toBeUndefined();
    // Simulate equal timestamps on retry: the incomplete install must still force a build.
    utimesSync(join(f.root,"src/index.ts"),1700000000,1700000000);
    expect(f.run().status).toBe(0);
    expect(f.calls()).toEqual(["npm","npx","npm","npx"]);
    expect(f.marker()).toBe("0.5.0");
  });
});

it("retries a source-only failed build even if the compiler emitted newer output", () => {
  const f = fixture("0.5.0");
  utimesSync(join(f.root,"src/index.ts"),1700000001,1700000001);
  expect(f.run({FAIL_BUILD:"1",PARTIAL_OUTPUT:"1"}).status).not.toBe(0);
  expect(readFileSync(join(f.root,"dist/index.js"),"utf8")).toContain("partial");
  expect(f.marker()).toBeUndefined();
  expect(f.run().status).toBe(0);
  expect(f.calls()).toEqual(["npx","npm","npx"]);
  expect(readFileSync(join(f.root,"dist/index.js"),"utf8")).toContain("rebuilt");
});
