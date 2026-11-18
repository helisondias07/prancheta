import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ getUser: vi.fn(), signIn: vi.fn(), deleteUser: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: (_url: string, key: string) => key === "fixture-admin" ? { auth: { admin: { deleteUser: mock.deleteUser } } } : { auth: { getUser: mock.getUser, signInWithPassword: mock.signIn } } }));
import { POST } from "../app/api/conta/excluir/route";

const request = (body: unknown, token = "fixture") => new Request("https://example.test/api", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
const verified = { id: "owner-id", email: "fixture@example.invalid", factors: [] };
describe("account deletion", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.supabase.co"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-public"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fixture-admin");
    vi.clearAllMocks(); mock.getUser.mockResolvedValue({ data: { user: verified }, error: null }); mock.signIn.mockResolvedValue({ data: { user: { id: "owner-id" } }, error: null }); mock.deleteUser.mockResolvedValue({ error: null });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("deletes only the verified and reauthenticated identity, ignoring a supplied id", async () => {
    const response = await POST(request({ confirmation: "EXCLUIR", password: "fixture-password", user_id: "other-id" }));
    expect(response.status).toBe(200); expect(mock.getUser).toHaveBeenCalledWith("fixture"); expect(mock.signIn).toHaveBeenCalledWith({ email: verified.email, password: "fixture-password" }); expect(mock.deleteUser).toHaveBeenCalledExactlyOnceWith("owner-id");
  });
  it("rejects missing confirmation, missing or invalid token, wrong password and another identity", async () => {
    expect((await POST(request({ confirmation: "no", password: "fixture" }))).status).toBe(400);
    expect((await POST(new Request("https://example.test/api", { method: "POST", body: "{}" }))).status).toBe(401);
    mock.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("invalid") });
    expect((await POST(request({ confirmation: "EXCLUIR", password: "fixture" }))).status).toBe(401);
    mock.signIn.mockResolvedValueOnce({ data: { user: null }, error: new Error("wrong") });
    expect((await POST(request({ confirmation: "EXCLUIR", password: "fixture" }))).status).toBe(401);
    mock.signIn.mockResolvedValueOnce({ data: { user: { id: "other" } }, error: null });
    expect((await POST(request({ confirmation: "EXCLUIR", password: "fixture" }))).status).toBe(401);
    expect(mock.deleteUser).not.toHaveBeenCalled();
  });
  it("fails closed for MFA, missing configuration, and reports uncertain admin errors", async () => {
    mock.getUser.mockResolvedValueOnce({ data: { user: { ...verified, factors: [{ status: "verified" }] } }, error: null });
    expect((await POST(request({ confirmation: "EXCLUIR", password: "fixture" }))).status).toBe(403);
    expect(mock.deleteUser).not.toHaveBeenCalled();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", ""); expect((await POST(request({ confirmation: "EXCLUIR", password: "fixture" }))).status).toBe(503);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fixture-admin"); mock.deleteUser.mockResolvedValueOnce({ error: new Error("network") });
    expect((await POST(request({ confirmation: "EXCLUIR", password: "fixture" }))).status).toBe(500);
    mock.deleteUser.mockRejectedValueOnce(new Error("network"));
    expect((await POST(request({ confirmation: "EXCLUIR", password: "fixture" }))).status).toBe(500);
  });
});
