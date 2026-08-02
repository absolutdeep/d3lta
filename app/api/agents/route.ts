// GET /api/agents — list Hermes agents on the system (profiles + last session)
import { NextResponse } from "next/server";
import { getAgents } from "@/lib/agents";
import { serverLog } from "@/lib/error-handling";

const SOURCE = "api/agents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const agents = await getAgents();
    // Redact internal-only fields before responding. baseUrl may embed
    // credentials and configPath/sessionsDir expose local filesystem layout.
    const sanitized = {
      timestamp: agents.timestamp,
      profiles: agents.profiles.map((p) => ({
        kind: p.kind,
        name: p.name,
        model: p.model,
        provider: p.provider,
        sessionCount: p.sessionCount,
        running: p.running,
        lastSession: p.lastSession,
      })),
    };
    return NextResponse.json(sanitized);
  } catch (error) {
    serverLog("error", SOURCE, "failed to gather agents", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to load agents" },
      { status: 500 },
    );
  }
}
