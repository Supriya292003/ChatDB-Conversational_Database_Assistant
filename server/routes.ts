import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./file-storage";
import { insertChatMessageSchema, insertChatSessionSchema, insertDatabaseSchema, insertDatabaseTableSchema, insertTableRowSchema, insertUploadedDocumentSchema } from "@shared/schema";
import { processNaturalLanguageCommand, generateChatResponse, extractTablesFromDocument, extractDataFromFile } from "./gemini";
import multer from "multer";
import path from "path";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  let broadcastClients = new Set<any>();

  wss.on("connection", (ws) => {
    broadcastClients.add(ws);
    ws.on("close", () => broadcastClients.delete(ws));
  });

  function broadcast(data: any) {
    const message = JSON.stringify(data);
    broadcastClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  // Chat session routes
  app.post("/api/chat/sessions", async (req, res) => {
    try {
      const validated = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(validated);
      broadcast({ type: "session_created", session });
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid session" });
    }
  });

  app.get("/api/chat/sessions", async (req, res) => {
    const sessions = await storage.getChatSessions();
    res.json(sessions);
  });

  app.get("/api/chat/sessions/:id", async (req, res) => {
    const session = await storage.getChatSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  });

  app.patch("/api/chat/sessions/:id", async (req, res) => {
    try {
      const { title } = req.body;
      const session = await storage.updateChatSessionTitle(req.params.id, title);
      broadcast({ type: "session_updated", session });
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Update failed" });
    }
  });

  app.delete("/api/chat/sessions/:id", async (req, res) => {
    await storage.deleteChatSession(req.params.id);
    broadcast({ type: "session_deleted", sessionId: req.params.id });
    res.json({ success: true });
  });

  // Chat message routes
  app.post("/api/chat/message", async (req, res) => {
    try {
      const validated = insertChatMessageSchema.parse(req.body);
      
      // Save user message
      const userMessage = await storage.addChatMessage(validated);
      broadcast({ type: "chat", message: userMessage });

      // Process command
      const { action, details } = await processNaturalLanguageCommand(validated.content);
      console.log("Action:", action, "Details:", details);

      let result: any = null;
      let responseText = "";

      // Execute the action
      if (action === "create_database" && details.name) {
        try {
          result = await storage.createDatabase({ name: details.name });
          responseText = `✓ Created database "${details.name}" successfully! You can now add tables to it by saying "create table student with id, name in database ${details.name}"`;
          broadcast({ type: "database_created", database: result });
        } catch (error: any) {
          responseText = `❌ Error creating database: ${error.message}`;
        }
      } else if (action === "delete_database" && details.databaseName) {
        try {
          const databases = await storage.getDatabases();
          const dbToDelete = databases.find(d => d.name.toLowerCase() === details.databaseName.toLowerCase());
          if (dbToDelete) {
            await storage.deleteDatabase(dbToDelete.id);
            responseText = `✓ Deleted database "${details.databaseName}" and all its tables`;
            broadcast({ type: "database_deleted", databaseId: dbToDelete.id });
          } else {
            responseText = `❌ Database "${details.databaseName}" not found`;
          }
        } catch (error: any) {
          responseText = `❌ Error deleting database: ${error.message}`;
        }
      } else if (action === "show_databases") {
        const databases = await storage.getDatabases();
        if (databases.length === 0) {
          responseText = "📊 No databases found. Create one by saying 'create database school'";
        } else {
          const dbList = await Promise.all(databases.map(async (db) => {
            const tables = await storage.getTables(db.id);
            return `• ${db.name} (${tables.length} tables)`;
          }));
          responseText = `📊 Found ${databases.length} database(s):\n${dbList.join("\n")}`;
        }
      } else if (action === "create_table" && details.name && details.columns) {
        try {
          let databaseId = null;
          let dbName = "default";
          
          if (details.databaseName) {
            const databases = await storage.getDatabases();
            const db = databases.find(d => d.name.toLowerCase() === details.databaseName.toLowerCase());
            if (db) {
              databaseId = db.id;
              dbName = db.name;
            } else {
              responseText = `❌ Database "${details.databaseName}" not found. Create it first by saying "create database ${details.databaseName}"`;
              const aiMessage = await storage.addChatMessage({ sessionId: validated.sessionId, content: responseText, role: "assistant" });
              broadcast({ type: "chat", message: aiMessage });
              return res.json([userMessage, aiMessage]);
            }
          } else {
            const defaultDb = await storage.getOrCreateDefaultDatabase();
            databaseId = defaultDb.id;
            dbName = defaultDb.name;
            broadcast({ type: "database_created", database: defaultDb });
          }

          const existingTable = await storage.getTableByName(details.name, databaseId);
          if (existingTable) {
            responseText = `❌ Table "${details.name}" already exists in database "${dbName}". Use a different name or delete the existing table first.`;
            const aiMessage = await storage.addChatMessage({ sessionId: validated.sessionId, content: responseText, role: "assistant" });
            broadcast({ type: "chat", message: aiMessage });
            return res.json([userMessage, aiMessage]);
          }

          result = await storage.createTable({
            databaseId,
            name: details.name,
            columns: details.columns
          });
          responseText = `✓ Created table "${details.name}" in database "${dbName}" with columns: ${details.columns?.map((c: any) => `${c.name}(${c.type})`).join(", ")}`;
          broadcast({ type: "table_created", table: result });
        } catch (error: any) {
          responseText = `❌ Error creating table: ${error.message}`;
        }
      } else if (action === "delete_table" && details.tableName) {
        try {
          const tables = await storage.getTables();
          const tableToDelete = tables.find(t => t.name.toLowerCase() === details.tableName.toLowerCase());
          if (tableToDelete) {
            await storage.deleteTable(tableToDelete.id);
            responseText = String(generateChatResponse(action, details));
            broadcast({ type: "table_deleted", tableId: tableToDelete.id });
          } else {
            responseText = `❌ Table "${details.tableName}" not found`;
          }
        } catch (error: any) {
          responseText = `❌ Error deleting table: ${error.message}`;
        }
      } else if (action === "add_column" && details.tableName && details.columnName) {
        try {
          const tables = await storage.getTables();
          const table = tables.find(t => t.name.toLowerCase() === details.tableName.toLowerCase());
          if (table) {
            const newColumns = [...(table.columns || []), { name: details.columnName, type: details.columnType || "text" }];
            result = await storage.updateTable(table.id, newColumns);
            responseText = String(generateChatResponse(action, details));
            broadcast({ type: "table_updated", table: result });
          } else {
            responseText = `❌ Table "${details.tableName}" not found`;
          }
        } catch (error: any) {
          responseText = `❌ Error adding column: ${error.message}`;
        }
      } else if (action === "insert_row" && details.tableName && details.values) {
        try {
          const tables = await storage.getTables();
          const table = tables.find(t => t.name.toLowerCase() === details.tableName.toLowerCase());
          if (table) {
            const data: any = {};
            table.columns?.forEach((col, idx) => {
              data[col.name] = details.values[idx] || null;
            });
            const newRow = await storage.insertRow({ tableId: table.id, data });
            responseText = String(generateChatResponse(action, details));
            broadcast({ type: "row_inserted", row: newRow });
          } else {
            responseText = `❌ Table "${details.tableName}" not found`;
          }
        } catch (error: any) {
          responseText = `❌ Insert failed: ${error.message}`;
        }
      } else if (action === "update_row" && details.tableName) {
        try {
          const tables = await storage.getTables();
          const table = tables.find(t => t.name.toLowerCase() === details.tableName.toLowerCase());
          if (table) {
            const whereMatch = details.where?.match(/(\w+)\s*=\s*['"]?(\w+)['"]?/i);
            const setMatch = details.set?.match(/(\w+)\s*=\s*['"]?(.+?)['"]?$/i);
            
            if (whereMatch && setMatch) {
              const whereCol = whereMatch[1];
              const whereVal = whereMatch[2];
              const setCol = setMatch[1];
              const setVal = setMatch[2];
              
              const matchingRows = await storage.findRowsByCondition(table.id, { column: whereCol, value: whereVal });
              
              if (matchingRows.length > 0) {
                let updatedCount = 0;
                for (const row of matchingRows) {
                  await storage.updateRow(row.id, { [setCol]: setVal });
                  updatedCount++;
                }
                responseText = `✓ Updated ${updatedCount} row(s) in "${details.tableName}" - set ${setCol} = ${setVal} where ${whereCol} = ${whereVal}`;
                broadcast({ type: "row_updated" });
              } else {
                responseText = `❌ No rows found in "${details.tableName}" where ${whereCol} = ${whereVal}`;
              }
            } else {
              responseText = `❌ Could not parse update command. Use format: "update table_name set column = value where id = value"`;
            }
          } else {
            responseText = `❌ Table "${details.tableName}" not found`;
          }
        } catch (error: any) {
          responseText = `❌ Update failed: ${error.message}`;
        }
      } else if (action === "delete_row" && details.tableName) {
        try {
          const tables = await storage.getTables();
          const table = tables.find(t => t.name.toLowerCase() === details.tableName.toLowerCase());
          if (table) {
            const whereMatch = details.where?.match(/(\w+)\s*=\s*['"]?(\w+)['"]?/i);
            
            if (whereMatch) {
              const whereCol = whereMatch[1];
              const whereVal = whereMatch[2];
              
              const matchingRows = await storage.findRowsByCondition(table.id, { column: whereCol, value: whereVal });
              
              if (matchingRows.length > 0) {
                for (const row of matchingRows) {
                  await storage.deleteRow(row.id);
                }
                responseText = `✓ Deleted ${matchingRows.length} row(s) from "${details.tableName}" where ${whereCol} = ${whereVal}`;
                broadcast({ type: "row_deleted" });
              } else {
                responseText = `❌ No rows found in "${details.tableName}" where ${whereCol} = ${whereVal}`;
              }
            } else {
              responseText = `❌ Could not parse delete command. Use format: "delete from table_name where id = value"`;
            }
          } else {
            responseText = `❌ Table "${details.tableName}" not found`;
          }
        } catch (error: any) {
          responseText = `❌ Delete failed: ${error.message}`;
        }
      } else if (action === "show_table" && details.tableName) {
        try {
          const tables = await storage.getTables();
          const table = tables.find(t => t.name.toLowerCase() === details.tableName.toLowerCase());
          if (table) {
            const rows = await storage.getRows(table.id);
            responseText = String(generateChatResponse(action, details, { table, rows }));
          } else {
            responseText = `❌ Table "${details.tableName}" not found`;
          }
        } catch (error: any) {
          responseText = `❌ Error: ${error.message}`;
        }
      } else if (action === "show_tables") {
        const tables = await storage.getTables();
        if (tables.length === 0) {
          responseText = "📊 No tables found. Create one by saying 'create a table student with id, name, email'";
        } else {
          responseText = `📊 Found ${tables.length} table(s):\n${tables.map(t => `• ${t.name} (${t.columns?.length || 0} columns)`).join("\n")}`;
        }
      } else if (action === "conversation") {
        responseText = String(details.response || "I'm here to help!");
      } else {
        responseText = String(generateChatResponse(action, details));
      }

      // Save AI response
      const aiMessage = await storage.addChatMessage({
        sessionId: validated.sessionId,
        content: String(responseText || ""),
        role: "assistant"
      });
      broadcast({ type: "chat", message: aiMessage });

      res.json([userMessage, aiMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(400).json({ error: error.message || "Invalid message" });
    }
  });

  app.get("/api/chat/history", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const history = await storage.getChatHistory(sessionId);
    res.json(history);
  });

  // Database routes
  app.post("/api/databases", async (req, res) => {
    try {
      const validated = insertDatabaseSchema.parse(req.body);
      const database = await storage.createDatabase(validated);
      broadcast({ type: "database_created", database });
      res.json(database);
    } catch (error) {
      res.status(400).json({ error: "Invalid database" });
    }
  });

  app.get("/api/databases", async (req, res) => {
    const databases = await storage.getDatabases();
    res.json(databases);
  });

  app.get("/api/databases/:id", async (req, res) => {
    const database = await storage.getDatabase(req.params.id);
    if (!database) return res.status(404).json({ error: "Not found" });
    res.json(database);
  });

  app.delete("/api/databases/:id", async (req, res) => {
    await storage.deleteDatabase(req.params.id);
    broadcast({ type: "database_deleted", databaseId: req.params.id });
    res.json({ success: true });
  });

  app.get("/api/databases/:id/tables", async (req, res) => {
    const tables = await storage.getTables(req.params.id);
    res.json(tables);
  });

  // Database table routes
  app.post("/api/tables", async (req, res) => {
    try {
      const validated = insertDatabaseTableSchema.parse(req.body);
      const table = await storage.createTable(validated);
      broadcast({ type: "table_created", table });
      res.json(table);
    } catch (error) {
      res.status(400).json({ error: "Invalid table" });
    }
  });

  app.get("/api/tables", async (req, res) => {
    const tables = await storage.getTables();
    res.json(tables);
  });

  app.get("/api/tables/:id", async (req, res) => {
    const table = await storage.getTable(req.params.id);
    if (!table) return res.status(404).json({ error: "Not found" });
    res.json(table);
  });

  app.put("/api/tables/:id", async (req, res) => {
    try {
      const table = await storage.updateTable(req.params.id, req.body.columns);
      broadcast({ type: "table_updated", table });
      res.json(table);
    } catch (error) {
      res.status(400).json({ error: "Invalid update" });
    }
  });

  app.patch("/api/tables/:id/positions", async (req, res) => {
    try {
      const table = await storage.updateTablePositions(req.params.id, req.body);
      broadcast({ type: "table_updated", table });
      res.json(table);
    } catch (error) {
      res.status(400).json({ error: "Invalid update" });
    }
  });

  app.post("/api/tables/:id/columns", async (req, res) => {
    try {
      const table = await storage.addColumn(req.params.id, req.body);
      broadcast({ type: "table_updated", table });
      res.json(table);
    } catch (error) {
      res.status(400).json({ error: "Invalid column" });
    }
  });

  app.patch("/api/tables/:id/columns/:columnName", async (req, res) => {
    try {
      const table = await storage.updateColumn(req.params.id, req.params.columnName, req.body);
      broadcast({ type: "table_updated", table });
      res.json(table);
    } catch (error) {
      res.status(400).json({ error: "Invalid update" });
    }
  });

  app.delete("/api/tables/:id/columns/:columnName", async (req, res) => {
    try {
      const table = await storage.removeColumn(req.params.id, req.params.columnName);
      broadcast({ type: "table_updated", table });
      res.json(table);
    } catch (error) {
      res.status(400).json({ error: "Invalid delete" });
    }
  });

  app.delete("/api/tables/:id", async (req, res) => {
    await storage.deleteTable(req.params.id);
    broadcast({ type: "table_deleted", tableId: req.params.id });
    res.json({ success: true });
  });

  // Row routes
  app.post("/api/rows", async (req, res) => {
    try {
      const validated = insertTableRowSchema.parse(req.body);
      const row = await storage.insertRow(validated);
      broadcast({ type: "row_inserted", row });
      res.json(row);
    } catch (error) {
      res.status(400).json({ error: "Invalid row" });
    }
  });

  app.get("/api/rows/:tableId", async (req, res) => {
    const rows = await storage.getRows(req.params.tableId);
    res.json(rows);
  });

  app.patch("/api/rows/:id", async (req, res) => {
    try {
      const row = await storage.updateRow(req.params.id, req.body.data);
      broadcast({ type: "row_updated", row });
      res.json(row);
    } catch (error) {
      res.status(400).json({ error: "Invalid update" });
    }
  });

  app.delete("/api/rows/:id", async (req, res) => {
    await storage.deleteRow(req.params.id);
    broadcast({ type: "row_deleted", rowId: req.params.id });
    res.json({ success: true });
  });

  // File upload route for PDF, Excel, CSV, Images
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { originalname, buffer, mimetype } = req.file;
      const ext = path.extname(originalname).toLowerCase();
      
      const extractedData = await extractDataFromFile(buffer, ext, mimetype);
      
      if (extractedData.tables && extractedData.tables.length > 0) {
        const defaultDb = await storage.getOrCreateDefaultDatabase();
        const createdTables: any[] = [];
        
        for (const tableData of extractedData.tables) {
          const tableName = tableData.name || `imported_${Date.now()}`;
          
          const existingTable = await storage.getTableByName(tableName, defaultDb.id);
          if (existingTable) {
            continue;
          }
          
          const table = await storage.createTable({
            databaseId: defaultDb.id,
            name: tableName,
            columns: tableData.columns
          });
          
          for (const row of tableData.rows || []) {
            await storage.insertRow({
              tableId: table.id,
              data: row
            });
          }
          
          createdTables.push(table);
          broadcast({ type: "table_created", table });
        }
        
        const doc = await storage.uploadDocument({
          filename: originalname,
          content: extractedData.textContent || "",
          extractedTables: extractedData.tables
        });
        
        broadcast({ type: "document_uploaded", doc });
        
        res.json({ 
          success: true,
          filename: originalname,
          tablesCreated: createdTables.length,
          tables: createdTables,
          message: `Successfully imported ${createdTables.length} table(s) from ${originalname}`
        });
      } else {
        res.json({ 
          success: false,
          message: "No tabular data found in the file"
        });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(400).json({ error: error.message || "Upload failed" });
    }
  });

  // Document upload route (text-based)
  app.post("/api/documents/upload", async (req, res) => {
    try {
      const { filename, content } = req.body;
      const extractedTables = await extractTablesFromDocument(content);
      const doc = await storage.uploadDocument({
        filename,
        content,
        extractedTables,
      });
      broadcast({ type: "document_uploaded", doc });
      res.json({ doc, extractedTables });
    } catch (error) {
      res.status(400).json({ error: "Upload failed" });
    }
  });

  app.get("/api/documents", async (req, res) => {
    const docs = await storage.getDocuments();
    res.json(docs);
  });

  return httpServer;
}
