import type { NextRequest } from "next/server";
import { parseNaturalLanguagePlan } from "@afterbells/core";

const apiBase = () => process.env.AFTERBELLS_API ?? "http://localhost:8000";
// Only the pure, deterministic draft parser can run locally. The core file
// database contains synthetic seed records and must never supply financial
// observations, wallet balances, orders or saved user plans to this workspace.

async function proxyOrHandle(req: NextRequest, path: string[]) {
  const pathname = `/api/${path.join("/")}`;
  const fullPath = pathname + req.nextUrl.search;
  const method = req.method;
  const raw =
    method === "GET" || method === "HEAD" ? undefined : await req.text();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const upstream = await fetch(apiBase() + fullPath, {
      method,
      headers: {
        "content-type": req.headers.get("content-type") ?? "application/json",
      },
      body: raw,
      cache: "no-store",
      signal: controller.signal,
    });
    if (
      upstream.status === 404 &&
      path.join("/") === "plans/parse-intent" &&
      method === "POST"
    ) {
      const body = JSON.parse(raw ?? "{}");
      if (
        typeof body.text !== "string" ||
        !body.text.trim() ||
        body.text.length > 2000
      ) {
        return Response.json(
          {
            detail:
              "A nonempty instruction of at most 2000 characters is required.",
          },
          { status: 422 },
        );
      }
      return Response.json(parseNaturalLanguagePlan(body.text));
    }
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return Response.json(
      {
        detail:
          error instanceof SyntaxError
            ? "Invalid JSON request"
            : "AfterBells API unavailable. Check the configured backend and retry; no fallback data was substituted.",
      },
      { status: error instanceof SyntaxError ? 400 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
type Ctx = { params: Promise<{ path: string[] }> };
export async function GET(req: NextRequest, ctx: Ctx) {
  return proxyOrHandle(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxyOrHandle(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxyOrHandle(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxyOrHandle(req, (await ctx.params).path);
}
