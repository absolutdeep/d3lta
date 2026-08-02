// POST /api/logs — receive client-side error logs
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import { dbError, serverLog } from "@/lib/error-handling";

const SOURCE = "api/logs";

const logSchema = z.object({
  message: z.string().min(1).max(2000),
  severity: z.enum(["info", "warn", "error", "critical"]).default("info"),
  source: z.string().max(100).default("unknown"),
  details: z
    .record(z.string(), z.unknown())
    .refine(
      (o) => Object.keys(o).length <= 50,
      "details may have at most 50 keys",
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = logSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid log payload" },
        { status: 400 },
      );
    }
    const { message, severity, source, details } = parsed.data;

    const db = await getDb();
    await db.insert(auditLogs).values({
      severity,
      source,
      message,
      details: details ? JSON.stringify(details) : null,
    });

    serverLog("info", SOURCE, "Log persisted", {
      severity,
      source,
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    dbError(SOURCE, "create", error);
    return NextResponse.json(
      { error: "Failed to persist log" },
      { status: 500 },
    );
  }
}
