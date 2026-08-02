// GET /api/themes/name?url=<tweakcn theme page or id>
// Server-side fetch of the tweakcn page <title> to resolve a friendly theme
// name. The browser cannot fetch tweakcn cross-origin (CORS), so this runs
// server-side.
import { NextRequest, NextResponse } from "next/server";
import { serverLog } from "@/lib/error-handling";
import { extractNameFromPage } from "@/lib/theme-service";

const SOURCE = "api/themes/name";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Only allow tweakcn URLs to avoid SSRF to arbitrary hosts.
  if (!/^https:\/\/tweakcn\.com\//i.test(url)) {
    return NextResponse.json(
      { error: "Only tweakcn URLs are allowed" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      return NextResponse.json({ name: null }, { status: 200 });
    }
    const html = await res.text();
    const name = extractNameFromPage(html);
    return NextResponse.json({ name });
  } catch (error) {
    serverLog("error", SOURCE, "failed to fetch theme name", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ name: null }, { status: 200 });
  }
}
