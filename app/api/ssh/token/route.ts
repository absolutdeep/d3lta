import { NextResponse, type NextRequest } from "next/server";
import { sshToken } from "@/lib/ssh/token";
import { getSshConfig } from "@/lib/ssh/config";

// Resolve loopback-only hostnames. The webshell bridge binds to 127.0.0.1 and
// the token is only ever served to a same-origin page on this machine — never
// to a request coming in over a non-loopback Host header.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (!LOCAL_HOST.test(host)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const cfg = getSshConfig();
  return NextResponse.json({
    host: cfg.host,
    port: cfg.port,
    token: sshToken(),
  });
}
