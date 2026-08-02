// GET /api/themes — list all saved themes
// POST /api/themes — save a theme
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { themes } from "@/lib/db/schema";
import { dbError, serverLog } from "@/lib/error-handling";

const SOURCE = "api/themes";

const themeSchema = z.object({
  name: z.string().min(1).max(200),
  sourceType: z.enum(["tweakcn_url", "json_file", "manual"]).default("manual"),
  sourceUrl: z.string().url().max(500).optional().nullable(),
  themeData: z.unknown(), // validated structurally by theme-service on import
  isActive: z.boolean().default(false),
});

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(themes).orderBy(desc(themes.createdAt));
    return NextResponse.json({ themes: rows });
  } catch (error) {
    dbError(SOURCE, "list", error);
    return NextResponse.json(
      { error: "Failed to list themes" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = themeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid theme payload" },
        { status: 400 },
      );
    }
    const { name, sourceType, sourceUrl, themeData, isActive } = parsed.data;

    const db = await getDb();
    const result = await db
      .insert(themes)
      .values({
        name,
        sourceType,
        sourceUrl: sourceUrl ?? null,
        themeData: JSON.stringify(themeData),
        isActive,
      })
      .returning();

    serverLog("info", SOURCE, "Theme saved", {
      id: result[0]?.id,
      name,
    });
    return NextResponse.json({ theme: result[0] }, { status: 201 });
  } catch (error) {
    dbError(SOURCE, "create", error);
    return NextResponse.json(
      { error: "Failed to save theme" },
      { status: 500 },
    );
  }
}

// DELETE /api/themes/:id — handled in [id]/route.ts
export async function DELETE() {
  return NextResponse.json({ error: "Specify a theme id" }, { status: 400 });
}
