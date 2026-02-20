import {
  type ChatMessage,
  type InsertChatMessage,
  type ChatSession,
  type InsertChatSession,
  type Database,
  type InsertDatabase,
  type DatabaseTable,
  type InsertDatabaseTable,
  type TableRow,
  type InsertTableRow,
  type UploadedDocument,
  type InsertUploadedDocument,
} from "@shared/schema";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { IStorage } from "./storage";

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const DATABASES_FILE = path.join(DATA_DIR, "databases.json");
const TABLES_FILE = path.join(DATA_DIR, "tables.json");
const ROWS_FILE = path.join(DATA_DIR, "rows.json");
const DOCUMENTS_FILE = path.join(DATA_DIR, "documents.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadJson<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
  }
  return defaultValue;
}

function saveJson(filePath: string, data: any) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export class FileStorage implements IStorage {
  private sessions: Map<string, ChatSession>;
  private messages: Map<string, ChatMessage>;
  private databases: Map<string, Database>;
  private tables: Map<string, DatabaseTable>;
  private rows: Map<string, TableRow>;
  private documents: Map<string, UploadedDocument>;

  constructor() {
    const sessionsData = loadJson<Record<string, ChatSession>>(SESSIONS_FILE, {});
    const messagesData = loadJson<Record<string, ChatMessage>>(MESSAGES_FILE, {});
    const databasesData = loadJson<Record<string, Database>>(DATABASES_FILE, {});
    const tablesData = loadJson<Record<string, DatabaseTable>>(TABLES_FILE, {});
    const rowsData = loadJson<Record<string, TableRow>>(ROWS_FILE, {});
    const documentsData = loadJson<Record<string, UploadedDocument>>(DOCUMENTS_FILE, {});

    this.sessions = new Map(Object.entries(sessionsData));
    this.messages = new Map(Object.entries(messagesData));
    this.databases = new Map(Object.entries(databasesData));
    this.tables = new Map(Object.entries(tablesData));
    this.rows = new Map(Object.entries(rowsData));
    this.documents = new Map(Object.entries(documentsData));
  }

  private saveSessions() {
    saveJson(SESSIONS_FILE, Object.fromEntries(this.sessions));
  }

  private saveMessages() {
    saveJson(MESSAGES_FILE, Object.fromEntries(this.messages));
  }

  private saveDatabases() {
    saveJson(DATABASES_FILE, Object.fromEntries(this.databases));
  }

  private saveTables() {
    saveJson(TABLES_FILE, Object.fromEntries(this.tables));
  }

  private saveRows() {
    saveJson(ROWS_FILE, Object.fromEntries(this.rows));
  }

  private saveDocuments() {
    saveJson(DOCUMENTS_FILE, Object.fromEntries(this.documents));
  }

  // Chat Session operations
  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const chatSession: ChatSession = {
      id,
      title: session.title,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(id, chatSession);
    this.saveSessions();
    return chatSession;
  }

  async getChatSessions(): Promise<ChatSession[]> {
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.sessions.get(id);
  }

  async updateChatSessionTitle(id: string, title: string): Promise<ChatSession> {
    const session = this.sessions.get(id);
    if (!session) throw new Error("Session not found");
    session.title = title;
    session.updatedAt = new Date();
    this.sessions.set(id, session);
    this.saveSessions();
    return session;
  }

  async deleteChatSession(id: string): Promise<void> {
    this.sessions.delete(id);
    Array.from(this.messages.values())
      .filter(m => m.sessionId === id)
      .forEach(m => this.messages.delete(m.id));
    this.saveSessions();
    this.saveMessages();
  }

  async clearChatHistory(sessionId?: string): Promise<void> {
    if (sessionId) {
      Array.from(this.messages.values())
        .filter(m => m.sessionId === sessionId)
        .forEach(m => this.messages.delete(m.id));
    } else {
      this.messages.clear();
    }
    this.saveMessages();
  }

  async createDatabase(database: InsertDatabase): Promise<Database> {
    const existingDb = Array.from(this.databases.values()).find(
      d => d.name.toLowerCase() === database.name.toLowerCase()
    );
    if (existingDb) {
      throw new Error(`Database "${database.name}" already exists`);
    }

    const id = randomUUID();
    const db: Database = {
      id,
      name: database.name,
      description: database.description || null,
      createdAt: new Date(),
    };
    this.databases.set(id, db);
    this.saveDatabases();
    return db;
  }

  async getDatabases(): Promise<Database[]> {
    return Array.from(this.databases.values());
  }

  async getDatabase(id: string): Promise<Database | undefined> {
    return this.databases.get(id);
  }

  async getDatabaseByName(name: string): Promise<Database | undefined> {
    return Array.from(this.databases.values()).find(
      d => d.name.toLowerCase() === name.toLowerCase()
    );
  }

  async deleteDatabase(id: string): Promise<void> {
    this.databases.delete(id);
    Array.from(this.tables.values())
      .filter(t => t.databaseId === id)
      .forEach(t => {
        Array.from(this.rows.values())
          .filter(r => r.tableId === t.id)
          .forEach(r => this.rows.delete(r.id));
        this.tables.delete(t.id);
      });
    this.saveDatabases();
    this.saveTables();
    this.saveRows();
  }

  async getOrCreateDefaultDatabase(): Promise<Database> {
    let defaultDb = Array.from(this.databases.values()).find(
      d => d.name.toLowerCase() === "default"
    );
    if (!defaultDb) {
      defaultDb = await this.createDatabase({ name: "default", description: "Default database for tables" });
    }
    return defaultDb;
  }

  async addChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const chatMessage: ChatMessage = {
      id,
      sessionId: message.sessionId || null,
      content: message.content,
      role: message.role,
      createdAt: new Date(),
    };
    this.messages.set(id, chatMessage);
    this.saveMessages();

    if (message.sessionId) {
      const session = this.sessions.get(message.sessionId);
      if (session) {
        session.updatedAt = new Date();
        this.sessions.set(message.sessionId, session);
        this.saveSessions();
      }
    }

    return chatMessage;
  }

  async getChatHistory(sessionId?: string): Promise<ChatMessage[]> {
    let messages = Array.from(this.messages.values());
    if (sessionId) {
      messages = messages.filter(m => m.sessionId === sessionId);
    }
    return messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async createTable(table: InsertDatabaseTable): Promise<DatabaseTable> {
    const existingTable = Array.from(this.tables.values()).find(
      t => t.name.toLowerCase() === table.name.toLowerCase() &&
        t.databaseId === table.databaseId
    );
    if (existingTable) {
      throw new Error(`Table "${table.name}" already exists in this database`);
    }

    const id = randomUUID();
    const dbTable: DatabaseTable = {
      id,
      databaseId: table.databaseId || null,
      name: table.name,
      columns: table.columns,
      positions: {},
      createdAt: new Date(),
    };
    this.tables.set(id, dbTable);
    this.saveTables();
    return dbTable;
  }

  async getTableByName(name: string, databaseId?: string): Promise<DatabaseTable | undefined> {
    return Array.from(this.tables.values()).find(t => {
      const nameMatch = t.name.toLowerCase() === name.toLowerCase();
      if (databaseId) {
        return nameMatch && t.databaseId === databaseId;
      }
      return nameMatch;
    });
  }

  async getTables(databaseId?: string): Promise<DatabaseTable[]> {
    const allTables = Array.from(this.tables.values());
    if (databaseId) {
      return allTables.filter(t => t.databaseId === databaseId);
    }
    return allTables;
  }

  async getTable(id: string): Promise<DatabaseTable | undefined> {
    return this.tables.get(id);
  }

  async updateTable(id: string, columns: any): Promise<DatabaseTable> {
    const table = this.tables.get(id);
    if (!table) throw new Error("Table not found");
    table.columns = columns;
    this.tables.set(id, table);
    this.saveTables();
    return table;
  }

  async updateTablePositions(id: string, positions: any): Promise<DatabaseTable> {
    const table = this.tables.get(id);
    if (!table) throw new Error("Table not found");
    (table as any).positions = positions;
    this.tables.set(id, table);
    this.saveTables();
    return table;
  }

  async addColumn(tableId: string, column: any): Promise<DatabaseTable> {
    const table = this.tables.get(tableId);
    if (!table) throw new Error("Table not found");
    if (!Array.isArray(table.columns)) table.columns = [];
    table.columns.push(column);
    this.tables.set(tableId, table);
    this.saveTables();
    return table;
  }

  async updateColumn(tableId: string, columnName: string, updates: any): Promise<DatabaseTable> {
    const table = this.tables.get(tableId);
    if (!table) throw new Error("Table not found");
    const col = (table.columns as any[]).find(c => c.name === columnName);
    if (!col) throw new Error("Column not found");
    Object.assign(col, updates);
    this.tables.set(tableId, table);
    this.saveTables();
    return table;
  }

  async removeColumn(tableId: string, columnName: string): Promise<DatabaseTable> {
    const table = this.tables.get(tableId);
    if (!table) throw new Error("Table not found");
    table.columns = (table.columns as any[]).filter(c => c.name !== columnName);
    this.tables.set(tableId, table);
    this.saveTables();
    return table;
  }

  async deleteTable(id: string): Promise<void> {
    this.tables.delete(id);
    Array.from(this.rows.values())
      .filter(r => r.tableId === id)
      .forEach(r => this.rows.delete(r.id));
    this.saveTables();
    this.saveRows();
  }

  async insertRow(row: InsertTableRow): Promise<TableRow> {
    const table = this.tables.get(row.tableId);
    if (table) {
      const primaryKeyCol = (table.columns as any[]).find(c => c.isPrimaryKey);
      if (primaryKeyCol) {
        const pkValue = row.data[primaryKeyCol.name];
        const existingRows = Array.from(this.rows.values()).filter(r => r.tableId === row.tableId);
        const duplicate = existingRows.find(r => r.data[primaryKeyCol.name] === pkValue);
        if (duplicate) {
          throw new Error(`Primary key violation: ${primaryKeyCol.name} value '${pkValue}' already exists`);
        }
      }
    }

    const id = randomUUID();
    const tableRow: TableRow = {
      id,
      tableId: row.tableId,
      data: row.data,
      createdAt: new Date(),
    };
    this.rows.set(id, tableRow);
    this.saveRows();
    return tableRow;
  }

  async getRows(tableId: string): Promise<TableRow[]> {
    return Array.from(this.rows.values()).filter(r => r.tableId === tableId);
  }

  async deleteRow(id: string): Promise<void> {
    this.rows.delete(id);
    this.saveRows();
  }

  async updateRow(id: string, data: any): Promise<TableRow> {
    const row = this.rows.get(id);
    if (!row) throw new Error("Row not found");
    row.data = { ...row.data, ...data };
    this.rows.set(id, row);
    this.saveRows();
    return row;
  }

  async findRowsByCondition(tableId: string, condition: { column: string; value: any }): Promise<TableRow[]> {
    const rows = await this.getRows(tableId);
    return rows.filter(r => String(r.data[condition.column]) === String(condition.value));
  }

  async uploadDocument(doc: InsertUploadedDocument): Promise<UploadedDocument> {
    const id = randomUUID();
    const document: UploadedDocument = {
      id,
      filename: doc.filename,
      content: doc.content,
      extractedTables: doc.extractedTables,
      createdAt: new Date(),
    };
    this.documents.set(id, document);
    this.saveDocuments();
    return document;
  }

  async getDocuments(): Promise<UploadedDocument[]> {
    return Array.from(this.documents.values());
  }
}

export const storage = new FileStorage();
