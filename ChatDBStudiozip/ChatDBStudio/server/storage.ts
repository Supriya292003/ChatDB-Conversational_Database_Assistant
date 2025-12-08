import { 
  type ChatMessage, 
  type InsertChatMessage,
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

export interface IStorage {
  // Chat operations
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(): Promise<ChatMessage[]>;
  
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
  private messages: Map<string, ChatMessage> = new Map();
  private databases: Map<string, Database> = new Map();
  private tables: Map<string, DatabaseTable> = new Map();
  private rows: Map<string, TableRow> = new Map();
  private documents: Map<string, UploadedDocument> = new Map();

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
      content: message.content,
      role: message.role,
      createdAt: new Date(),
    };
    this.messages.set(id, chatMessage);
    return chatMessage;
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    return Array.from(this.messages.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
