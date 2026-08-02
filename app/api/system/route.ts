// GET /api/system — live system statistics
import { NextResponse } from "next/server";
import { getSystemStats } from "@/lib/system-stats";
import { serverLog } from "@/lib/error-handling";

const SOURCE = "api/system";

// Stats change every second; never cache the response.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getSystemStats();
    return NextResponse.json(stats);
  } catch (error) {
    serverLog("error", SOURCE, "failed to gather system stats", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to load system statistics" },
      { status: 500 },
    );
  }
}
