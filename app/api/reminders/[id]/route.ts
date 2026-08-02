// PUT /api/reminders/:id — update a reminder
// DELETE /api/reminders/:id — delete a reminder
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { reminders } from "@/lib/db/schema";
import { dbError, serverLog } from "@/lib/error-handling";

const SOURCE = "api/reminders/[id]";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const themeId = idSchema.safeParse(id);
    if (!themeId.success) {
      return NextResponse.json(
        { error: "Invalid reminder id" },
        { status: 400 },
      );
    }
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reminder payload" },
        { status: 400 },
      );
    }
    const { title, notes, dueAt, completed } = parsed.data;

    const db = await getDb();
    const result = await db
      .update(reminders)
      .set({
        ...(title !== undefined ? { title } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(dueAt !== undefined
          ? { dueAt: dueAt ? new Date(dueAt) : null }
          : {}),
        ...(completed !== undefined ? { completed } : {}),
      })
      .where(eq(reminders.id, themeId.data))
      .returning();

    if (!result.length) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 },
      );
    }
    serverLog("info", SOURCE, "Reminder updated", { id: themeId.data });
    return NextResponse.json({ reminder: result[0] });
  } catch (error) {
    dbError(SOURCE, "update", error);
    return NextResponse.json(
      { error: "Failed to update reminder" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const themeId = idSchema.safeParse(id);
    if (!themeId.success) {
      return NextResponse.json(
        { error: "Invalid reminder id" },
        { status: 400 },
      );
    }
    const db = await getDb();
    await db.delete(reminders).where(eq(reminders.id, themeId.data));
    serverLog("info", SOURCE, "Reminder deleted", { id: themeId.data });
    return NextResponse.json({ success: true });
  } catch (error) {
    dbError(SOURCE, "delete", error);
    return NextResponse.json(
      { error: "Failed to delete reminder" },
      { status: 500 },
    );
  }
}
