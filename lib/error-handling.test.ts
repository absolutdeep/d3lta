import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Logger } from "@/lib/error-handling";

// The Logger is a private-singleton with a non-clearable internal buffer, so
// reset the module between tests to get a fresh buffer each time.
let logger: Logger;

beforeEach(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.resetModules();
  logger = (await import("@/lib/error-handling")).logger;
});

describe("logger (error-handling)", () => {
  it("info() appends an info entry to the buffer", () => {
    logger.info("src", "msg");
    const buf = logger.getBuffer();
    expect(buf).toHaveLength(1);
    expect(buf[0].severity).toBe("info");
    expect(buf[0].source).toBe("src");
    expect(buf[0].message).toBe("msg");
    expect(buf[0].timestamp).toBeTruthy();
  });

  it("warn/error set the correct severity", () => {
    logger.warn("w", "x");
    logger.error("e", "y");
    const buf = logger.getBuffer();
    expect(buf[0].severity).toBe("warn");
    expect(buf[1].severity).toBe("error");
  });

  it("buffer caps at MAX_BUFFER (100), dropping the oldest", () => {
    for (let i = 0; i < 105; i++) {
      logger.info("src", `m${i}`);
    }
    const buf = logger.getBuffer();
    expect(buf).toHaveLength(100);
    // Oldest (m0) was dropped; newest (m104) is present.
    expect(buf[0].message).toBe("m5");
    expect(buf[buf.length - 1].message).toBe("m104");
  });

  it("critical() in non-production does NOT call fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      () => Promise.resolve(new Response()) as never,
    );
    logger.critical("c", "boom");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("flushBuffer POSTs buffered entries individually to /api/logs", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => Promise.resolve(new Response()) as never);
    logger.info("a", "one");
    logger.error("b", "two");
    // Access the private flush via the production code path: temporarily force
    // the timer fire by calling the public surface that triggers a flush loop.
    // Since startFlushTimer is production-only, invoke the method directly.
    const inst = logger as unknown as {
      flushBuffer: () => Promise<void>;
    };
    await inst.flushBuffer();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/logs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          severity: "info",
          source: "a",
          message: "one",
          details: undefined,
        }),
      }),
    );
    expect(logger.getBuffer()).toHaveLength(0);
  });
});
