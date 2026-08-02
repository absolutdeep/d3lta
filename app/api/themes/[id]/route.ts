// GET/PUT/DELETE /api/themes/:id — manage a single theme
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { themes } from "@/lib/db/schema";
import { dbError } from "@/lib/error-handling";

const SOURCE = "api/themes/[id]";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Validate the id is a positive integer before querying. A non-numeric id
// (e.g. "abc") would otherwise become NaN and turn into a 500 at the DB layer.
function parseThemeId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const themeId = parseThemeId(id);
    if (themeId === null) {
      return NextResponse.json({ error: "Invalid theme id" }, { status: 400 });
    }
    const db = await getDb();
    const rows = await db.select().from(themes).where(eq(themes.id, themeId));

    if (!rows.length) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    return NextResponse.json({ theme: rows[0] });
  } catch (error) {
    dbError(SOURCE, "get", error);
    return NextResponse.json({ error: "Failed to get theme" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const themeId = parseThemeId(id);
    if (themeId === null) {
      return NextResponse.json({ error: "Invalid theme id" }, { status: 400 });
    }
    const db = await getDb();
    await db.delete(themes).where(eq(themes.id, themeId));
    return NextResponse.json({ success: true });
  } catch (error) {
    dbError(SOURCE, "delete", error);
    return NextResponse.json(
      { error: "Failed to delete theme" },
      { status: 500 },
    );
  }
}
