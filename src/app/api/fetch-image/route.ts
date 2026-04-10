import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route to fetch a remote image server-side, bypassing CORS restrictions.
 * Usage: GET /api/fetch-image?url=<encoded_url>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  // Only allow Firebase Storage URLs for security
  const allowed = [
    "https://firebasestorage.googleapis.com",
    "https://storage.googleapis.com",
  ];
  const isAllowed = allowed.some((domain) => imageUrl.startsWith(domain));
  if (!isAllowed) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
