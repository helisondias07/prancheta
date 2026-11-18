import { describe, expect, it, vi, beforeEach } from "vitest";
import { emptyStore } from "./types";

const getUser = vi.fn();
const from = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser }, from }) }));
import { GET, PUT, DELETE } from "../app/api/conta/snapshot/route";

describe("snapshot session and input gates", () => {
  beforeEach(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"; process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "fixture"; getUser.mockReset(); from.mockReset(); });
  it("rejects unsigned requests for every operation", async () => {
    for (const handler of [GET, PUT, DELETE]) expect((await handler(new Request("https://example.test/api", { method: "GET" }))).status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
  });
  it("rejects an unverified token before database access", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
    expect((await GET(new Request("https://example.test/api", { headers: { authorization: "Bearer invalid" } }))).status).toBe(401);
  });
  it("treats an auth provider exception as an invalid session", async () => {
    getUser.mockRejectedValue(new Error("provider unavailable"));
    const response = await GET(new Request("https://example.test/api", { headers: { authorization: "Bearer fixture" } }));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects malformed and oversized snapshots before database access", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "fixture" } }, error: null });
    const req = (body: string) => new Request("https://example.test/api", { method: "PUT", headers: { authorization: "Bearer fixture" }, body });
    expect((await PUT(req(JSON.stringify({ revision: null, data: {} })))).status).toBe(400);
    expect((await PUT(req("x".repeat(5_300_001)))).status).toBe(413);
  });
  it("returns 409 when an optimistic update finds no row at the requested revision", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const update = vi.fn(() => ({ eq, select }));
    from.mockReturnValue({ update });
    const response = await PUT(new Request("https://example.test/api", {
      method: "PUT", headers: { authorization: "Bearer fixture" },
      body: JSON.stringify({ data: emptyStore(), revision: 3 }),
    }));
    expect(response.status).toBe(409);
    expect(update).toHaveBeenCalledOnce();
    expect(eq.mock.calls).toEqual([["user_id", "user-a"], ["revision", 3]]);
  });
  it("reports an insert uniqueness race as a conflict", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = vi.fn(() => ({ maybeSingle }));
    const insert = vi.fn(() => ({ select }));
    from.mockReturnValue({ insert });
    const response = await PUT(new Request("https://example.test/api", {
      method: "PUT", headers: { authorization: "Bearer fixture" },
      body: JSON.stringify({ data: emptyStore(), revision: null }),
    }));
    expect(response.status).toBe(409);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-a" }));
  });
  it("maps a database write failure to a generic 500 without exposing provider details", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { code: "XX000", message: "private provider detail" } });
    const select = vi.fn(() => ({ maybeSingle }));
    const update = vi.fn(() => ({ eq: vi.fn().mockReturnThis(), select }));
    from.mockReturnValue({ update });
    const response = await PUT(new Request("https://example.test/api", {
      method: "PUT", headers: { authorization: "Bearer fixture" },
      body: JSON.stringify({ data: emptyStore(), revision: 1 }),
    }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private provider detail");
  });
});
