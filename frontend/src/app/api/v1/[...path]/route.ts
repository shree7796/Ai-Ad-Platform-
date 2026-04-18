import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_ORIGIN =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

function buildTargetUrl(req: NextRequest, pathSegments: string[]): string {
  const subpath = pathSegments.join('/');
  const u = new URL(req.url);
  return `${BACKEND_ORIGIN}/api/v1/${subpath}${u.search}`;
}

function forwardHeaders(req: NextRequest): Headers {
  const out = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      out.set(key, value);
    }
  });
  return out;
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const subpath = pathSegments.join('/');
  const dest = buildTargetUrl(req, pathSegments);

  const headers = forwardHeaders(req);
  let body: BodyInit | undefined;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(dest, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    });

    const outHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        outHeaders.set(key, value);
      }
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[api proxy] Error details:', {
      method: req.method,
      dest,
      message,
      error: e,
    });
    const usesDockerHost = /:\/\/api(:\d+)?(\/|$)/.test(BACKEND_ORIGIN);
    const hint = usesDockerHost
      ? ' The hostname `api` only works inside Docker Compose. If you run `npm run dev` on your computer, use BACKEND_INTERNAL_URL=http://127.0.0.1:8000 (see frontend/.env.development). If you use Docker, start the API: `docker compose up api` (or full stack) and wait until it is healthy.'
      : ' Start the API (e.g. `cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`) or set BACKEND_INTERNAL_URL to the correct origin.';
    return NextResponse.json(
      {
        detail: `Cannot reach the API backend at ${BACKEND_ORIGIN}.${hint} (${message})`,
      },
      { status: 502 }
    );
  }
}

type RouteCtx = { params: { path: string[] } };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export async function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}
