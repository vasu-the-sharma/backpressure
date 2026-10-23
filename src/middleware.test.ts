import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

/** What the middleware passed on to the page, and the cookies it set or cleared. */
function run(opts: {
  country?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  const headers = new Headers(opts.headers);
  if (opts.country) headers.set("x-vercel-ip-country", opts.country);
  const cookie = Object.entries(opts.cookies ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  if (cookie) headers.set("cookie", cookie);
  const res = middleware(new NextRequest("https://example.com/pricing", { headers }));
  const passed = (name: string) => res.headers.get(`x-middleware-request-${name}`);
  const set = res.cookies.getAll().map((c) => ({ name: c.name, value: c.value, path: c.path }));
  return { vid: passed("x-bp-vid"), arm: passed("x-bp-arm"), consent: passed("x-bp-consent"), set };
}

describe("price test middleware", () => {
  it("puts a visitor outside Europe in the test, with cookies", () => {
    const r = run({ country: "US" });
    expect(r.vid).toMatch(/^[0-9a-f-]{36}$/);
    expect(["a", "b", "c"]).toContain(r.arm);
    expect(r.consent).toBeNull();
    expect(r.set.map((c) => c.name).sort()).toEqual(["bp_arm", "bp_vid"]);
  });

  it("keeps a returning visitor's id and price", () => {
    const r = run({ country: "IN", cookies: { bp_vid: "v-1", bp_arm: "c" } });
    expect(r).toMatchObject({ vid: "v-1", arm: "c", set: [] });
  });

  it("asks in Europe first: middle price, no id, no cookies", () => {
    const r = run({ country: "DE" });
    expect(r).toMatchObject({ vid: null, arm: "b", consent: "ask", set: [] });
  });

  it("runs the test in Europe after a yes", () => {
    const r = run({ country: "FR", cookies: { bp_consent: "yes" } });
    expect(r.vid).not.toBeNull();
    expect(r.consent).toBeNull();
  });

  it("honours a no anywhere and clears old test cookies at the root path", () => {
    const r = run({ country: "US", cookies: { bp_consent: "no", bp_vid: "v-1", bp_arm: "a" } });
    expect(r).toMatchObject({ vid: null, arm: "b", consent: "declined" });
    expect(r.set).toEqual([
      { name: "bp_vid", value: "", path: "/" },
      { name: "bp_arm", value: "", path: "/" },
    ]);
  });

  it("ignores test headers a client sends", () => {
    const r = run({ country: "GB", headers: { "x-bp-vid": "forged", "x-bp-arm": "a" } });
    expect(r).toMatchObject({ vid: null, arm: "b" });
  });
});
