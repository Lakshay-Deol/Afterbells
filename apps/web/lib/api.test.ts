import { describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

describe("api client", () => {
  it("rejects the wrong backend health contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ service: "afterbells-api", mockMode: true }),
        ),
    );
    await expect(api("/health")).rejects.toThrow(
      "Backend fingerprint mismatch",
    );
    vi.unstubAllGlobals();
  });
  it("prefixes /api and parses JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const out = await api<{ ok: boolean }>("/status");
    expect(out.ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/status");
    vi.unstubAllGlobals();
  });

  it("throws ApiError with server detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            new Response(JSON.stringify({ detail: "boom" }), { status: 502 }),
          ),
        ),
    );
    await expect(api("/x")).rejects.toBeInstanceOf(ApiError);
    await expect(api("/x")).rejects.toMatchObject({
      status: 502,
      message: "boom",
    });
    vi.unstubAllGlobals();
  });
});
