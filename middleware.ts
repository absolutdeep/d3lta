// API trust boundary — root middleware for /api routes.
//
// Threat model: this is a local dashboard. Local/loopback requests stay
// friction-free. When the operator exports a D3LTA_API_TOKEN, any request
// arriving through a non-loopback host (i.e. hitting the machine on its LAN
// IP / hostname) must present `x-d3lta-token: <token>`, otherwise it gets a
// 401. This prevents an unauthenticated browser on the network from reading
// sensitive endpoints (/api/system, /api/agents, /api/logs writes, etc.).
//
// With no D3LTA_API_TOKEN set, nothing is enforced (dev default) — the app
// behaves exactly as before. This keeps the dashboard usable locally without
// friction until the owner chooses to enable the boundary.
import { NextRequest, NextResponse } from "next/server";

const TOKEN_ENV = "D3LTA_API_TOKEN";
const HEADER = "x-d3lta-token";

function isLoopbackHost(host: string): boolean {
  const h = host.split(":")[0].replace(/^\[|\]$/g, ""); // strip port + brackets
  return (
    h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0"
  );
}

// Constant-time comparison (no early-exit on mismatch) so a remote timing
// probe can't extract the token length/bytes. Pure JS — safe in the Edge
// middleware runtime where node:crypto is unavailable.
function constantEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const token = process.env[TOKEN_ENV];
  if (!token) return NextResponse.next(); // boundary off — dev mode

  // Loopback requests are trusted (the browser talking to its own machine).
  const host = req.headers.get("host") ?? "";
  if (isLoopbackHost(host)) return NextResponse.next();

  // Non-loopback: require the token.
  const presented = req.headers.get(HEADER) ?? "";
  if (constantEqual(presented.trim(), token)) return NextResponse.next();

  return NextResponse.json(
    { error: "Unauthorized — provide x-d3lta-token" },
    { status: 401 },
  );
}

export const config = {
  matcher: ["/api/:path*"],
};
