// Next.js instrumentation — runs once in the Node server process when the app
// starts (dev + start). We use it to boot the local browser-webshell PTY bridge
// on the loopback interface so `pnpm dev` / `pnpm start` immediately exposes
// working terminal sessions without a separate process.
export async function register() {
  if (
    typeof window === "undefined" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    // node-pty / node:crypto are Node-only: never attempt the webshell bridge
    // in Next's edge runtime (it would only log a load failure).
    process.env.NEXT_RUNTIME !== "edge"
  ) {
    try {
      const { startSshServer } = await import("./lib/ssh/terminal-server");
      startSshServer();
    } catch (err) {
      // Never let a webshell boot failure crash the dashboard. Log and continue.
      console.error(
        "[d3lta:ERROR][ssh] instrumentation failed to start webshell server",
        err,
      );
    }
  }
}
