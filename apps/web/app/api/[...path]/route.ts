import type { NextRequest } from "next/server";
import { handleApiRequest } from "@afterbells/core";

const apiBase = () => process.env.AFTERBELLS_API ?? "http://localhost:8000";

async function proxyOrHandle(req: NextRequest, path: string[]) {
  const pathname = `/api/${path.join("/")}`;
  const fullPathWithSearch = `${pathname}${req.nextUrl.search}`;
  const method = req.method;

  let body: any = null;
  if (method !== "GET" && method !== "HEAD") {
    try {
      const text = await req.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
    } catch {
      // empty body
    }
  }

  // First try upstream proxy if AFTERBELLS_API is explicitly set or if port 8000 answers
  try {
    const upstreamUrl = `${apiBase()}${fullPathWithSearch}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const upstream = await fetch(upstreamUrl, {
      method,
      headers: {
        "content-type": req.headers.get("content-type") ?? "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (upstream.status !== 404 && upstream.status !== 502) {
      return new Response(await upstream.arrayBuffer(), {
        status: upstream.status,
        headers: {
          "content-type":
            upstream.headers.get("content-type") ?? "application/json",
        },
      });
    }
  } catch {
    // Upstream not reached, proceed to direct core handling
  }

  // Handle directly using @afterbells/core
  try {
    const response = await handleApiRequest(method, fullPathWithSearch, body);
    return Response.json(response.data, { status: response.status });
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Failed to process request" },
      { status: 500 }
    );
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
