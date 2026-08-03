// GET /api/tasks — list all tasks
// POST /api/tasks — create a task
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { asc, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { dbError, serverLog } from "@/lib/error-handling";

const SOURCE = "api/tasks";

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["pending", "in_progress", "done"]).default("pending"),
  dueAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(tasks)
      .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt));
    return NextResponse.json({ tasks: rows });
  } catch (error) {
    dbError(SOURCE, "list", error);
    return NextResponse.json(
      { error: "Failed to list tasks" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = taskSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid task payload" },
        { status: 400 },
      );
    }
    const { title, description, status, dueAt } = parsed.data;

    const db = await getDb();
    // New tasks land at the top of the sortable list (lowest sort_order).
    const [{ minSort }] = await db
      .select({ minSort: sql<number>`COALESCE(MIN(${tasks.sortOrder}), 0)` })
      .from(tasks);
    const result = await db
      .insert(tasks)
      .values({
        title,
        description: description ?? null,
        status,
        dueAt: dueAt ? new Date(dueAt) : null,
        sortOrder: minSort - 1,
      })
      .returning();

    serverLog("info", SOURCE, "Task created", { id: result[0]?.id });
    return NextResponse.json({ task: result[0] }, { status: 201 });
  } catch (error) {
    dbError(SOURCE, "create", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
