import { GoogleGenAI } from "@google/genai";
import * as XLSX from "xlsx";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface ExtractedTable {
  name: string;
  columns: { name: string; type: string }[];
  rows: Record<string, any>[];
}

interface ExtractedData {
  tables: ExtractedTable[];
  textContent?: string;
}

function inferColumnType(values: any[]): string {
  const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== "");
  if (nonEmptyValues.length === 0) return "text";
  
  const allNumbers = nonEmptyValues.every(v => !isNaN(Number(v)));
  if (allNumbers) return "integer";
  
  const allDates = nonEmptyValues.every(v => !isNaN(Date.parse(String(v))));
  if (allDates) return "date";
  
  return "text";
}

export async function extractDataFromFile(buffer: Buffer, ext: string, mimetype: string): Promise<ExtractedData> {
  try {
    if (ext === ".xlsx" || ext === ".xls") {
      return extractFromExcel(buffer);
    } else if (ext === ".csv") {
      return extractFromCSV(buffer);
    } else if (ext === ".pdf") {
      return await extractFromPDF(buffer);
    } else if ([".png", ".jpg", ".jpeg"].includes(ext)) {
      return await extractFromImage(buffer, mimetype);
    }
    
    return { tables: [] };
  } catch (error) {
    console.error("Error extracting data:", error);
    return { tables: [] };
  }
}

function extractFromExcel(buffer: Buffer): ExtractedData {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const tables: ExtractedTable[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) continue;
    
    const headers = jsonData[0].map((h: any) => String(h || "column").toLowerCase().replace(/\s+/g, "_"));
    const dataRows = jsonData.slice(1);
    
    const columns = headers.map((name: string, idx: number) => {
      const colValues = dataRows.map(row => row[idx]);
      return { name, type: inferColumnType(colValues) };
    });
    
    const rows = dataRows.map(row => {
      const rowData: Record<string, any> = {};
      headers.forEach((header: string, idx: number) => {
        rowData[header] = row[idx] !== undefined ? row[idx] : null;
      });
      return rowData;
    }).filter(row => Object.values(row).some(v => v !== null && v !== ""));
    
    tables.push({
      name: sheetName.toLowerCase().replace(/\s+/g, "_"),
      columns,
      rows
    });
  }
  
  return { tables };
}

function extractFromCSV(buffer: Buffer): ExtractedData {
  const content = buffer.toString("utf-8");
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) return { tables: [] };
  
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/"/g, ""));
  const dataRows = lines.slice(1);
  
  const columns = headers.map((name, idx) => {
    const colValues = dataRows.map(row => {
      const cells = row.split(",");
      return cells[idx]?.trim().replace(/"/g, "");
    });
    return { name, type: inferColumnType(colValues) };
  });
  
  const rows = dataRows.map(line => {
    const cells = line.split(",").map(c => c.trim().replace(/"/g, ""));
    const rowData: Record<string, any> = {};
    headers.forEach((header, idx) => {
      rowData[header] = cells[idx] || null;
    });
    return rowData;
  }).filter(row => Object.values(row).some(v => v !== null && v !== ""));
  
  return {
    tables: [{
      name: "imported_csv",
      columns,
      rows
    }]
  };
}

async function extractFromPDF(buffer: Buffer): Promise<ExtractedData> {
  try {
    const data = await pdfParse(buffer);
    const text = data.text;
    
    const tables = extractTablesFromText(text);
    
    return {
      tables,
      textContent: text
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    return { tables: [] };
  }
}

function extractTablesFromText(text: string): ExtractedTable[] {
  const tables: ExtractedTable[] = [];
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  
  let tableData: string[][] = [];
  let inTable = false;
  
  for (const line of lines) {
    const cells = line.split(/\s{2,}|\t/).map(c => c.trim()).filter(c => c);
    
    if (cells.length >= 2) {
      if (!inTable) {
        inTable = true;
        tableData = [];
      }
      tableData.push(cells);
    } else if (inTable && tableData.length >= 2) {
      const table = createTableFromData(tableData, tables.length);
      if (table) tables.push(table);
      tableData = [];
      inTable = false;
    }
  }
  
  if (inTable && tableData.length >= 2) {
    const table = createTableFromData(tableData, tables.length);
    if (table) tables.push(table);
  }
  
  return tables;
}

function createTableFromData(data: string[][], tableIndex: number): ExtractedTable | null {
  if (data.length < 2) return null;
  
  const headers = data[0].map(h => h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const dataRows = data.slice(1);
  
  const columns = headers.map((name, idx) => {
    const colValues = dataRows.map(row => row[idx] || "");
    return { name: name || `col_${idx}`, type: inferColumnType(colValues) };
  });
  
  const rows = dataRows.map(row => {
    const rowData: Record<string, any> = {};
    headers.forEach((header, idx) => {
      rowData[header || `col_${idx}`] = row[idx] || null;
    });
    return rowData;
  });
  
  return {
    name: `pdf_table_${tableIndex + 1}`,
    columns,
    rows
  };
}

async function extractFromImage(buffer: Buffer, mimetype: string): Promise<ExtractedData> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { tables: [], textContent: "Gemini API key not configured for image processing" };
    }
    
    const base64Image = buffer.toString("base64");
    
    const prompt = `Analyze this image and extract any tabular data you can find. 
    Return the data in this exact JSON format:
    {
      "tables": [
        {
          "name": "table_name",
          "columns": [{"name": "column1", "type": "text"}, {"name": "column2", "type": "integer"}],
          "rows": [{"column1": "value1", "column2": 123}]
        }
      ]
    }
    
    If no tabular data is found, return: {"tables": []}
    Only return valid JSON, no other text.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimetype, data: base64Image } }
        ]
      }]
    });
    
    let responseText = "";
    if (typeof response.text === "function") {
      responseText = response.text();
    } else if (response.text) {
      responseText = String(response.text);
    } else if (response.response?.text) {
      responseText = typeof response.response.text === "function" 
        ? response.response.text() 
        : String(response.response.text);
    }
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        tables: parsed.tables || [],
        textContent: "Extracted from image using AI"
      };
    }
    
    return { tables: [] };
  } catch (error) {
    console.error("Image extraction error:", error);
    return { tables: [] };
  }
}

const greetingPatterns = [
  { pattern: /^(hi|hello|hey|hola|howdy)[\s!.,?]*$/i, response: "Hi there! What can I help you with today? I can help you create and manage database tables." },
  { pattern: /^(hi|hello|hey|hola|howdy)\s+(there|everyone|friend)[\s!.,?]*$/i, response: "Hello! How can I assist you today? I can help you with database operations." },
  { pattern: /how\s+(are|r)\s+(you|u)[\s?!]*$/i, response: "I'm doing great, thank you for asking! I'm here to help you manage your databases. How can I assist you today?" },
  { pattern: /^(what'?s\s+up|sup|wassup)[\s?!]*$/i, response: "Not much! Just here to help you with your database needs. What would you like to do?" },
  { pattern: /^(good\s+morning|morning)[\s!.,?]*$/i, response: "Good morning! Ready to help you with your database tasks. What can I do for you?" },
  { pattern: /^(good\s+afternoon|afternoon)[\s!.,?]*$/i, response: "Good afternoon! How can I help you with your database today?" },
  { pattern: /^(good\s+evening|evening)[\s!.,?]*$/i, response: "Good evening! What database operations would you like to perform?" },
  { pattern: /^(good\s+night|night)[\s!.,?]*$/i, response: "Good night! Before you go, is there anything you'd like me to help you with?" },
  { pattern: /^(thank\s*you|thanks|thx|ty)[\s!.,?]*$/i, response: "You're welcome! Let me know if you need anything else with your database." },
  { pattern: /^(bye|goodbye|see\s+you|cya)[\s!.,?]*$/i, response: "Goodbye! Feel free to come back anytime you need help with your database." },
  { pattern: /what\s+can\s+you\s+do[\s?!]*$/i, response: "I can help you with database operations! You can:\n• Create tables: 'create a table student with id, name, email'\n• Insert data: 'insert into student values 101, John, john@email.com'\n• View tables: 'show student table' or 'show all tables'\n• Delete tables: 'delete table student'\n• And more!" },
  { pattern: /^help[\s!.,?]*$/i, response: "I'm here to help! Here are some things you can ask me:\n• 'create a table student with id, name, email'\n• 'insert into student values 101, John, john@email.com'\n• 'show student table'\n• 'show all tables'\n• 'delete table student'\nJust type your command in natural language!" },
  { pattern: /who\s+(are|r)\s+(you|u)[\s?!]*$/i, response: "I'm ChatDB, your AI database assistant! I help you create and manage database tables using natural language. Just tell me what you need!" },
  { pattern: /^(nice|cool|awesome|great|perfect)[\s!.,?]*$/i, response: "Glad you think so! Is there anything else you'd like me to help you with?" },
];

export async function processNaturalLanguageCommand(userMessage: string): Promise<{ action: string; details: any }> {
  const msg = userMessage.toLowerCase().trim();

  for (const { pattern, response } of greetingPatterns) {
    if (pattern.test(userMessage.trim())) {
      return { action: "conversation", details: { response } };
    }
  }

  // INSERT: "insert into student table values 101, Asha, asha@gmail.com" or "insert student 101, Asha, asha@gmail.com"
  if (msg.includes("insert")) {
    const insertMatch = userMessage.match(/insert\s+(?:into\s+)?(?:table\s+)?(\w+)\s+(?:table\s+)?(?:values?\s+)?(.+)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const valuesStr = insertMatch[2];
      const values = valuesStr.split(",").map(v => v.trim());
      return { action: "insert_row", details: { tableName, values } };
    }
  }

  // UPDATE: "update student table set name = Ana where id = 102"
  if (msg.includes("update")) {
    const updateMatch = userMessage.match(/update\s+(?:table\s+)?(\w+)\s+(?:table\s+)?set\s+(.+?)\s+where\s+(.+)/i);
    if (updateMatch) {
      return {
        action: "update_row",
        details: { tableName: updateMatch[1], set: updateMatch[2], where: updateMatch[3] }
      };
    }
  }

  // DELETE: "delete from student where id = 101" or "delete student where id = 101"
  if (msg.includes("delete")) {
    const deleteMatch = userMessage.match(/delete\s+(?:from\s+)?(?:table\s+)?(\w+)\s+(?:table\s+)?where\s+(.+)/i);
    if (deleteMatch) {
      return { action: "delete_row", details: { tableName: deleteMatch[1], where: deleteMatch[2] } };
    }
  }

  // CREATE DATABASE: "create database school" or "create a database called school"
  if (msg.includes("create") && msg.includes("database") && !msg.includes("table")) {
    const dbMatch = userMessage.match(/create\s+(?:a\s+)?database\s+(?:called\s+|named\s+)?(\w+)/i);
    if (dbMatch) {
      return { action: "create_database", details: { name: dbMatch[1] } };
    }
  }

  // CREATE TABLE IN DATABASE: "create table student with id, name in database school"
  if (msg.includes("create") && (msg.includes("table") || msg.includes("tables"))) {
    const tableMatch = userMessage.match(/(?:create\s+(?:a\s+)?table\s+)(\w+)/i);
    const columnsMatch = userMessage.match(/(?:table\s+\w+\s+(?:with\s+)?)(.*?)(?:\s+in\s+database\s+|$)/i);
    const dbMatch = userMessage.match(/in\s+(?:database\s+)?(\w+)\s*$/i);

    if (tableMatch) {
      const tableName = tableMatch[1];
      const columnsText = columnsMatch ? columnsMatch[1] : "";
      const databaseName = dbMatch ? dbMatch[1] : null;
      const columnsList = columnsText
        .split(",")
        .map(c => c.trim().toLowerCase())
        .filter(c => c && c !== "in")
        .map(col => {
          if (col.includes("email")) return { name: col, type: "text" };
          if (col.includes("id")) return { name: col, type: "integer" };
          if (col.includes("age") || col.includes("count") || col.includes("number") || col.includes("phone")) return { name: col, type: "integer" };
          return { name: col, type: "text" };
        });

      if (columnsList.length > 0) {
        return { action: "create_table", details: { name: tableName, columns: columnsList, databaseName } };
      }
    }
  }

  // DELETE DATABASE
  if ((msg.includes("delete") || msg.includes("drop")) && msg.includes("database") && !msg.includes("table")) {
    const dbMatch = userMessage.match(/(?:delete|drop)\s+(?:database\s+)?(\w+)/i);
    if (dbMatch) {
      return { action: "delete_database", details: { databaseName: dbMatch[1] } };
    }
  }

  // SHOW ALL DATABASES
  if (msg.includes("show") && (msg.includes("database") || msg.includes("databases")) && !msg.includes("table")) {
    return { action: "show_databases", details: {} };
  }

  // DELETE TABLE
  if ((msg.includes("delete") || msg.includes("drop")) && msg.includes("table")) {
    const tableMatch = userMessage.match(/(?:delete|drop)\s+(?:table\s+)?(\w+)/i);
    if (tableMatch) {
      return { action: "delete_table", details: { tableName: tableMatch[1] } };
    }
  }

  // SHOW SPECIFIC TABLE: "show student table" or "show table student" or "show all columns of student table"
  if (msg.includes("show")) {
    const tableMatch = userMessage.match(/show\s+(?:(?:all\s+columns\s+of\s+)?)?(?:table\s+)?(\w+)(?:\s+table)?/i);
    if (tableMatch && !msg.includes("all table") && !msg.includes("all tables")) {
      return { action: "show_table", details: { tableName: tableMatch[1] } };
    }
  }

  // SHOW ALL TABLES
  if (msg.includes("show") && (msg.includes("all table") || msg.includes("all tables"))) {
    return { action: "show_tables", details: { message: userMessage } };
  }

  // DEFAULT
  return { action: "query", details: { message: userMessage } };
}

export function generateChatResponse(action: string, details: any, result?: any): string {
  if (action === "show_table" && result) {
    const table = result.table;
    const rows = result.rows || [];
    if (!table) return `❌ Table not found`;
    
    // Build table header
    const cols = table.columns || [];
    const header = cols.map((c: any) => c.name).join(" | ");
    const separator = cols.map(() => "---").join("-+-");
    
    // Build table rows
    let tableStr = `📋 TABLE: ${table.name}\n\n${header}\n${separator}\n`;
    if (rows.length === 0) {
      tableStr += "(no rows)";
    } else {
      tableStr += rows.map((row: any) => cols.map((c: any) => String(row.data?.[c.name] || "")).join(" | ")).join("\n");
    }
    return tableStr;
  }

  const responses: { [key: string]: string } = {
    create_table: `✓ Created table "${details.name}" with columns: ${details.columns?.map((c: any) => `${c.name}(${c.type})`).join(", ")}`,
    delete_table: `✓ Deleted table "${details.tableName}"`,
    insert_row: `✓ Inserted row into "${details.tableName}" with values: ${details.values?.join(", ")}`,
    update_row: `✓ Updated rows in "${details.tableName}"`,
    delete_row: `✓ Deleted rows from "${details.tableName}"`,
    show_tables: `📊 Showing all tables in database`,
    query: `Processing: ${details.message || "your request"}`
  };

  return String(responses[action] || `Done: ${details.message || "operation complete"}`);
}

export async function extractTablesFromDocument(text: string): Promise<any[]> {
  const lines = text.split("\n");
  const tables: any[] = [];
  let currentTable: any = null;
  let headerRow: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes("|") && line.includes("-")) {
      if (headerRow.length > 0 && currentTable) {
        currentTable.columns = headerRow.map(h => ({ name: h.trim(), type: "text" }));
        tables.push(currentTable);
        currentTable = null;
        headerRow = [];
      }
    } else if (line.includes("|")) {
      const cells = line.split("|").map(c => c.trim()).filter(c => c);
      
      if (headerRow.length === 0 && cells.length > 0) {
        headerRow = cells;
        currentTable = {
          name: `table_${tables.length + 1}`,
          columns: cells.map(c => ({ name: c.toLowerCase().replace(/\s+/g, "_"), type: "text" })),
          rows: []
        };
      } else if (currentTable && cells.length > 0) {
        const row: any = {};
        cells.forEach((cell, idx) => {
          if (headerRow[idx]) {
            row[headerRow[idx].toLowerCase().replace(/\s+/g, "_")] = cell;
          }
        });
        currentTable.rows.push(row);
      }
    }
  }

  if (currentTable && currentTable.columns) {
    tables.push(currentTable);
  }

  return tables;
}
