// GET /api/reminders — list all reminders
// POST /api/reminders — create a reminder
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { asc, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { reminders } from "@/lib/db/schema";
import { dbError, serverLog } from "@/lib/error-handling";

const SOURCE = "api/reminders";

const reminderSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  completed: z.boolean().optional(),
});

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(reminders)
      .orderBy(asc(reminders.sortOrder), desc(reminders.createdAt));
    return NextResponse.json({ reminders: rows });
  } catch (error) {
    dbError(SOURCE, "list", error);
    return NextResponse.json(
      { error: "Failed to list reminders" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = reminderSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reminder payload" },
        { status: 400 },
      );
    }
    const { title, notes, dueAt, completed } = parsed.data;

    const db = await getDb();
    // New reminders land at the top of the sortable list (lowest sort_order).
    const [{ minSort }] = await db
      .select({
        minSort: sql<number>`COALESCE(MIN(${reminders.sortOrder}), 0)`,
      })
      .from(reminders);
    const result = await db
      .insert(reminders)
      .values({
        title,
        notes: notes ?? null,
        dueAt: dueAt ? new Date(dueAt) : null,
        completed: completed ?? false,
        sortOrder: minSort - 1,
      })
      .returning();

    serverLog("info", SOURCE, "Reminder created", { id: result[0]?.id });
    return NextResponse.json({ reminder: result[0] }, { status: 201 });
  } catch (error) {
    dbError(SOURCE, "create", error);
    return NextResponse.json(
      { error: "Failed to create reminder" },
      { status: 500 },
    );
  }
}
