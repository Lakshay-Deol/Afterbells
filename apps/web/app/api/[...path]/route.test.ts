import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
const core = vi.hoisted(() => vi.fn());
vi.mock("@afterbells/core", () => ({ parseNaturalLanguagePlan: core }));
import { GET, POST } from "./route";
const request = (method: string): NextRequest =>
  ({
    method,
    nextUrl: { search: "" },
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => '{"text":"Buy $10 of NVDA","mode":"live"}',
  }) as unknown as NextRequest;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("API evidence boundary", () => {
  it("preserves upstream live failures without substituting core data", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { detail: "Live provider unavailable" },
            { status: 502 },
          ),
        ),
    );
    const response = await POST(request("POST"), {
      params: Promise.resolve({ path: ["decisions"] }),
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      detail: "Live provider unavailable",
    });
    expect(core).not.toHaveBeenCalled();
  });
  it("reports connectivity failure rather than using another backend", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await GET(request("GET"), {
      params: Promise.resolve({ path: ["health"] }),
    });
    expect(response.status).toBe(502);
    expect(core).not.toHaveBeenCalled();
  });
  it("never substitutes synthetic core plans for unsupported persistence", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ detail: "Not found" }, { status: 404 }),
        ),
    );
    const response = await GET(request("GET"), {
      params: Promise.resolve({ path: ["plans"] }),
    });
    expect(response.status).toBe(404);
    expect(core).not.toHaveBeenCalled();
  });
  it("can interpret a draft with the existing pure parser", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ detail: "Not found" }, { status: 404 }),
        ),
    );
    core.mockReturnValue({ ticker: "NVDA" });
    const response = await POST(request("POST"), {
      params: Promise.resolve({ path: ["plans", "parse-intent"] }),
    });
    expect(response.status).toBe(200);
    expect(core).toHaveBeenCalledWith("Buy $10 of NVDA");
  });
  it("never dispatches transaction submission after upstream 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ detail: "Not found" }, { status: 404 }),
        ),
    );
    const response = await POST(request("POST"), {
      params: Promise.resolve({ path: ["orders", "execute-now"] }),
    });
    expect(response.status).toBe(404);
    expect(core).not.toHaveBeenCalled();
  });
});
