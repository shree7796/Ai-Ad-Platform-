import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOST_SUFFIXES = [
  'fal.media',
  'fal.run',
  'fal.ai',
  'replicate.delivery',
  'amazonaws.com',
  'cloudfront.net',
  'storage.googleapis.com',
  'blob.core.windows.net',
  'unsplash.com',
  'picsum.photos',
];

function isLocalLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h.endsWith('.localhost') || h === '127.0.0.1' || h === '[::1]';
}

function isAllowedMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const h = u.hostname.toLowerCase();
    if (isLocalLoopbackHost(h)) return true;
    // Docker / internal MinIO hostname (browser uses public URL; server-side fetch may use this)
    if (h === 'minio') return true;
    return ALLOWED_HOST_SUFFIXES.some((suffix) => h === suffix || h.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

/**
 * When the app runs in Docker, STORAGE_PUBLIC_URL is often http://localhost:9000 for the browser.
 * The Next.js route runs in the frontend container; fetch(localhost:9000) hits the wrong host.
 * Rewrite to the internal MinIO origin (e.g. http://minio:9000) for server-side fetch only.
 */
function resolveFetchUrl(browserUrl: string): string {
  const internalBase = process.env.STORAGE_INTERNAL_FETCH_URL?.trim();
  if (!internalBase) return browserUrl;
  try {
    const u = new URL(browserUrl);
    if (!isLocalLoopbackHost(u.hostname)) return browserUrl;
    const base = new URL(internalBase.endsWith('/') ? internalBase.slice(0, -1) : internalBase);
    return `${base.origin}${u.pathname}${u.search}`;
  } catch {
    return browserUrl;
  }
}

function safeFilename(name: string | null, fallback: string): string {
  if (!name) return fallback;
  const trimmed = name.trim().slice(0, 180);
  const base = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || fallback;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  const nameParam = request.nextUrl.searchParams.get('filename');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!isAllowedMediaUrl(target.toString())) {
    return NextResponse.json({ error: 'URL host not allowed' }, { status: 403 });
  }

  const pathLower = target.pathname.toLowerCase();
  const fallback =
    pathLower.endsWith('.mp4') || pathLower.endsWith('.webm') ? 'klypse-output.mp4' : 'klypse-output.png';

  const filename = safeFilename(nameParam, fallback);

  const fetchUrl = resolveFetchUrl(target.toString());
  const upstream = await fetch(fetchUrl, {
    headers: { Accept: '*/*' },
    redirect: 'follow',
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 502 });
  }

  const contentType =
    upstream.headers.get('content-type') || 'application/octet-stream';

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
