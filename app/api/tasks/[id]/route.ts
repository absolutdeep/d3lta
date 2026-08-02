// PUT /api/tasks/:id — update a task
// DELETE /api/tasks/:id — delete a task
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { dbError, serverLog } from "@/lib/error-handling";

const SOURCE = "api/tasks/[id]";

const idSchema = z.coerce.number().int().positive();

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["pending", "in_progress", "done"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const taskId = idSchema.safeParse(id);
    if (!taskId.success) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid task payload" },
        { status: 400 },
      );
    }
    const { title, description, status, dueAt } = parsed.data;

    const db = await getDb();
    const result = await db
      .update(tasks)
      .set({
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(dueAt !== undefined
          ? { dueAt: dueAt ? new Date(dueAt) : null }
          : {}),
      })
      .where(eq(tasks.id, taskId.data))
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    serverLog("info", SOURCE, "Task updated", { id: taskId.data });
    return NextResponse.json({ task: result[0] });
  } catch (error) {
    dbError(SOURCE, "update", error);
    return NextResponse.json(
      { error: "Failed to update task" },
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
    const taskId = idSchema.safeParse(id);
    if (!taskId.success) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }
    const db = await getDb();
    await db.delete(tasks).where(eq(tasks.id, taskId.data));
    serverLog("info", SOURCE, "Task deleted", { id: taskId.data });
    return NextResponse.json({ success: true });
  } catch (error) {
    dbError(SOURCE, "delete", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
