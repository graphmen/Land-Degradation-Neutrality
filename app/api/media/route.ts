import { NextRequest, NextResponse } from "next/server";

const KOBO_USER = process.env.KOBO_USERNAME || "vegris2020";
const KOBO_PASS = process.env.KOBO_PASSWORD || "musasa2020";
const AUTH = Buffer.from(`${KOBO_USER}:${KOBO_PASS}`).toString("base64");

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mediaUrl = searchParams.get("url");

  if (!mediaUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Security check: Only allow http/https media URLs
  if (!mediaUrl.startsWith("http://") && !mediaUrl.startsWith("https://")) {
    return new NextResponse("Invalid media URL", { status: 400 });
  }

  const isKobo = mediaUrl.includes("kobotoolbox.org");
  const headers: Record<string, string> = {};
  if (isKobo) {
    headers["Authorization"] = `Basic ${AUTH}`;
  }

  try {
    const res = await fetch(mediaUrl, { headers });

    if (!res.ok) {
      return new NextResponse(`Failed to fetch media from upstream: ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error: any) {
    return new NextResponse(`Error proxying media: ${error.message}`, { status: 500 });
  }
}
