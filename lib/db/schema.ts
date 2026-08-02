// Drizzle ORM schema for d3lta dashboard
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Themes table — stores imported tweakcn themes
export const themes = sqliteTable("themes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sourceType: text("source_type").notNull().default("manual"), // 'tweakcn_url' | 'json_file' | 'manual'
  sourceUrl: text("source_url"),
  themeData: text("theme_data").notNull(), // JSON string of the theme schema
  isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// User preferences table — per-user settings
export const userPreferences = sqliteTable("user_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(), // e.g. 'theme_mode', 'sidebar_collapsed'
  value: text("value").notNull(), // JSON string
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Audit logs table — error tracking and user actions
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  severity: text("severity").notNull(), // 'info' | 'warn' | 'error' | 'critical'
  source: text("source").notNull(), // e.g. 'theme-service', 'theme-dropzone'
  message: text("message").notNull(),
  details: text("details"), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Schema exports for type inference
export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Reminders table — basic CRUD for user reminders
export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  notes: text("notes"),
  dueAt: integer("due_at", { mode: "timestamp" }),
  completed: integer("completed", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Tasks table — basic CRUD for user tasks
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "in_progress", "done"] })
    .default("pending")
    .notNull(),
  dueAt: integer("due_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
