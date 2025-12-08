import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Databases (container for tables)
export const databases = pgTable("databases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Database Tables (created via chat)
export const databaseTables = pgTable("database_tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  databaseId: varchar("database_id").references(() => databases.id),
  name: varchar("name").notNull(),
  columns: json("columns").notNull(), // [{name, type, nullable, isPrimaryKey, foreignKeyTable, foreignKeyColumn}]
  positions: json("positions").default("{}"), // {entityId: {x, y}} for ER diagram
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table Data Rows
export const tableRows = pgTable("table_rows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: varchar("table_id").notNull().references(() => databaseTables.id),
  data: json("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Uploaded Documents
export const uploadedDocuments = pgTable("uploaded_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename").notNull(),
  content: text("content").notNull(),
  extractedTables: json("extracted_tables").notNull(), // Array of tables extracted
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  content: true,
  role: true,
});

export const insertDatabaseSchema = createInsertSchema(databases).pick({
  name: true,
  description: true,
});

export const insertDatabaseTableSchema = createInsertSchema(databaseTables).pick({
  databaseId: true,
  name: true,
  columns: true,
});

export const insertTableRowSchema = createInsertSchema(tableRows).pick({
  tableId: true,
  data: true,
});

export const insertUploadedDocumentSchema = createInsertSchema(uploadedDocuments).pick({
  filename: true,
  content: true,
  extractedTables: true,
});

// Types
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type Database = typeof databases.$inferSelect;
export type InsertDatabase = z.infer<typeof insertDatabaseSchema>;

export type DatabaseTable = typeof databaseTables.$inferSelect;
export type InsertDatabaseTable = z.infer<typeof insertDatabaseTableSchema>;

export type TableRow = typeof tableRows.$inferSelect;
export type InsertTableRow = z.infer<typeof insertTableRowSchema>;

export type UploadedDocument = typeof uploadedDocuments.$inferSelect;
export type InsertUploadedDocument = z.infer<typeof insertUploadedDocumentSchema>;
