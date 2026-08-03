// POST /api/reminders/reorder — persist a new drag-and-drop order
// Body: { ids: number[] } — each id's sort_order is set to its index (top = 0).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { reminders } from "@/lib/db/schema";
import { dbError, serverLog } from "@/lib/error-handling";

const SOURCE = "api/reminders/reorder";

const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = reorderSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reorder payload" },
        { status: 400 },
      );
    }
    const { ids } = parsed.data;
    const uniqueIds = Array.from(new Set(ids));

    const db = await getDb();
    for (let i = 0; i < uniqueIds.length; i++) {
      await db
        .update(reminders)
        .set({ sortOrder: i })
        .where(eq(reminders.id, uniqueIds[i]));
    }

    serverLog("info", SOURCE, "Reminders reordered", {
      count: uniqueIds.length,
      first: uniqueIds[0],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    dbError(SOURCE, "reorder", error);
    return NextResponse.json(
      { error: "Failed to reorder reminders" },
      { status: 500 },
    );
  }
}
