import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTNAMES = [
  "i.scdn.co",
  "mosaic.scdn.co",
  "thisis-images.spotifycdn.com",
  "image-cdn-ak.spotifycdn.com",
  "image-cdn-fa.spotifycdn.com",
];

function isAllowed(hostname: string): boolean {
  return ALLOWED_HOSTNAMES.includes(hostname) || hostname.endsWith(".supabase.co");
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (!isAllowed(hostname)) {
    return NextResponse.json({ error: "domain not allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 502 });

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "proxy error" }, { status: 500 });
  }
}
