// GET /api/preferences — read user preferences
// POST /api/preferences — upsert a preference (key/value)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";
import { dbError, serverLog } from "@/lib/error-handling";

const SOURCE = "api/preferences";

// Only these persisted preference keys are accepted. Keep in sync with the
// `partialize` allowlist in store/use-theme-store.ts.
const ALLOWED_KEYS = new Set([
  "currentTheme",
  "themeLibrary",
  "activeThemeId",
  "sidebarCollapsed",
]);

const prefSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
});

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(userPreferences);
    const prefs: Record<string, string> = {};
    for (const row of rows) {
      prefs[row.key] = row.value;
    }
    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    dbError(SOURCE, "list", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = prefSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid preference payload" },
        { status: 400 },
      );
    }
    const { key, value } = parsed.data;

    // Reject unknown keys so clients can't write arbitrary rows.
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json(
        { error: "Unknown preference key" },
        { status: 400 },
      );
    }

    const db = await getDb();
    const existing = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.key, key));

    if (existing.length) {
      await db
        .update(userPreferences)
        .set({
          value: JSON.stringify(value),
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.key, key));
    } else {
      await db.insert(userPreferences).values({
        key,
        value: JSON.stringify(value),
      });
    }

    serverLog("info", SOURCE, "Preference saved", { key });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    dbError(SOURCE, "upsert", error);
    return NextResponse.json(
      { error: "Failed to save preference" },
      { status: 500 },
    );
  }
}
