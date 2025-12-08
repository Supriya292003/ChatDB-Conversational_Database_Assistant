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
} from "../shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Chat session operations
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSessions(): Promise<ChatSession[]>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  updateChatSessionTitle(id: string, title: string): Promise<ChatSession>;
  deleteChatSession(id: string): Promise<void>;
  
  // Chat message operations
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(sessionId?: string): Promise<ChatMessage[]>;
  clearChatHistory(sessionId?: string): Promise<void>;
  
  // Database operations
  createDatabase(database: InsertDatabase): Promise<Database>;
  getDatabases(): Promise<Database[]>;
  getDatabase(id: string): Promise<Database | undefined>;
  deleteDatabase(id: string): Promise<void>;
  
  // Database table operations
  createTable(table: InsertDatabaseTable): Promise<DatabaseTable>;
  getTables(databaseId?: string): Promise<DatabaseTable[]>;
  getTable(id: string): Promise<DatabaseTable | undefined>;
  updateTable(id: string, columns: any): Promise<DatabaseTable>;
  updateTablePositions(id: string, positions: any): Promise<DatabaseTable>;
  addColumn(tableId: string, column: any): Promise<DatabaseTable>;
  updateColumn(tableId: string, columnName: string, updates: any): Promise<DatabaseTable>;
  removeColumn(tableId: string, columnName: string): Promise<DatabaseTable>;
  deleteTable(id: string): Promise<void>;
  
  // Row operations
  insertRow(row: InsertTableRow): Promise<TableRow>;
  getRows(tableId: string): Promise<TableRow[]>;
  updateRow(id: string, data: any): Promise<TableRow>;
  deleteRow(id: string): Promise<void>;
  
  // Document operations
  uploadDocument(doc: InsertUploadedDocument): Promise<UploadedDocument>;
  getDocuments(): Promise<UploadedDocument[]>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, ChatSession> = new Map();
  private messages: Map<string, ChatMessage> = new Map();
  private databases: Map<string, Database> = new Map();
  private tables: Map<string, DatabaseTable> = new Map();
  private rows: Map<string, TableRow> = new Map();
  private documents: Map<string, UploadedDocument> = new Map();

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const chatSession: ChatSession = {
      id,
      title: session.title,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(id, chatSession);
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
    return session;
  }

  async deleteChatSession(id: string): Promise<void> {
    this.sessions.delete(id);
    Array.from(this.messages.values())
      .filter(m => m.sessionId === id)
      .forEach(m => this.messages.delete(m.id));
  }

  async clearChatHistory(sessionId?: string): Promise<void> {
    if (sessionId) {
      Array.from(this.messages.values())
        .filter(m => m.sessionId === sessionId)
        .forEach(m => this.messages.delete(m.id));
    } else {
      this.messages.clear();
    }
  }

  async createDatabase(database: InsertDatabase): Promise<Database> {
    const id = randomUUID();
    const db: Database = {
      id,
      name: database.name,
      description: database.description || null,
      createdAt: new Date(),
    };
    this.databases.set(id, db);
    return db;
  }

  async getDatabases(): Promise<Database[]> {
    return Array.from(this.databases.values());
  }

  async getDatabase(id: string): Promise<Database | undefined> {
    return this.databases.get(id);
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
    
    if (message.sessionId) {
      const session = this.sessions.get(message.sessionId);
      if (session) {
        session.updatedAt = new Date();
        this.sessions.set(message.sessionId, session);
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
    return dbTable;
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
    return table;
  }

  async updateTablePositions(id: string, positions: any): Promise<DatabaseTable> {
    const table = this.tables.get(id);
    if (!table) throw new Error("Table not found");
    (table as any).positions = positions;
    this.tables.set(id, table);
    return table;
  }

  async addColumn(tableId: string, column: any): Promise<DatabaseTable> {
    const table = this.tables.get(tableId);
    if (!table) throw new Error("Table not found");
    if (!Array.isArray(table.columns)) table.columns = [];
    table.columns.push(column);
    this.tables.set(tableId, table);
    return table;
  }

  async updateColumn(tableId: string, columnName: string, updates: any): Promise<DatabaseTable> {
    const table = this.tables.get(tableId);
    if (!table) throw new Error("Table not found");
    const col = (table.columns as any[]).find(c => c.name === columnName);
    if (!col) throw new Error("Column not found");
    Object.assign(col, updates);
    this.tables.set(tableId, table);
    return table;
  }

  async removeColumn(tableId: string, columnName: string): Promise<DatabaseTable> {
    const table = this.tables.get(tableId);
    if (!table) throw new Error("Table not found");
    table.columns = (table.columns as any[]).filter(c => c.name !== columnName);
    this.tables.set(tableId, table);
    return table;
  }

  async deleteTable(id: string): Promise<void> {
    this.tables.delete(id);
    Array.from(this.rows.values())
      .filter(r => r.tableId === id)
      .forEach(r => this.rows.delete(r.id));
  }

  async insertRow(row: InsertTableRow): Promise<TableRow> {
    // Check for primary key duplicates
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
    return tableRow;
  }

  async getRows(tableId: string): Promise<TableRow[]> {
    return Array.from(this.rows.values()).filter(r => r.tableId === tableId);
  }

  async deleteRow(id: string): Promise<void> {
    this.rows.delete(id);
  }

  async updateRow(id: string, data: any): Promise<TableRow> {
    const row = this.rows.get(id);
    if (!row) throw new Error("Row not found");
    row.data = { ...row.data, ...data };
    this.rows.set(id, row);
    return row;
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
    return document;
  }

  async getDocuments(): Promise<UploadedDocument[]> {
    return Array.from(this.documents.values());
  }
}

export const storage = new MemStorage();
