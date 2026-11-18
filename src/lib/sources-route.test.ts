import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchGreenhouseBoard } = vi.hoisted(() => ({ fetchGreenhouseBoard: vi.fn() }));
vi.mock("@/lib/sources", () => ({
  classifyUrlOrToken: (input: string) => input === "fixture-board" ? { kind: "greenhouse", board: input } : { kind: "blocked", reason: "Fonte bloqueada." },
  fetchAshbyBoard: vi.fn(),
  fetchGreenhouseBoard,
  fetchLeverBoard: vi.fn(),
  fetchRemotar: vi.fn(),
}));
import { POST } from "../app/api/fontes/route";

describe("POST /api/fontes input boundary", () => {
  beforeEach(() => fetchGreenhouseBoard.mockReset().mockResolvedValue({ jobs: [], total: 0, capped: false }));

  it("rejects oversized streamed bodies without relying on Content-Length", async () => {
    const body = JSON.stringify({ input: "x".repeat(5000) });
    const response = await POST(new Request("https://app.example/api/fontes", { method: "POST", body }));
    expect(response.status).toBe(413);
    expect(fetchGreenhouseBoard).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("https://app.example/api/fontes", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(fetchGreenhouseBoard).not.toHaveBeenCalled();
  });

  it.each(["string", "null", "[]", "{\"input\":[]}", "{\"input\":1}"]) (
    "rejects non-text input body %s without throwing",
    async (body) => {
      const response = await POST(new Request("https://app.example/api/fontes", { method: "POST", body }));
      expect(response.status).toBe(400);
      expect(fetchGreenhouseBoard).not.toHaveBeenCalled();
    },
  );

  it("preserves supported source behavior after validation", async () => {
    const response = await POST(new Request("https://app.example/api/fontes", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "fixture-board" }),
    }));
    expect(response.status).toBe(200);
    expect(fetchGreenhouseBoard).toHaveBeenCalledWith("fixture-board");
  });
});
