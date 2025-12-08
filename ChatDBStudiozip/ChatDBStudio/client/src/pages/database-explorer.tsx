import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Plus, Edit2, Database, ChevronDown, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Column {
  name: string;
  type: string;
}

interface DatabaseType {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

interface DatabaseTable {
  id: string;
  databaseId: string | null;
  name: string;
  columns: Column[];
  createdAt: string;
}

interface TableRowData {
  id: string;
  tableId: string;
  data: any;
  createdAt: string;
}

export default function DatabaseExplorer() {
  const { toast } = useToast();
  const [expandedDatabase, setExpandedDatabase] = useState<string | null>(null);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [newRowData, setNewRowData] = useState<Record<string, Record<string, string>>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [newDbName, setNewDbName] = useState("");
  const [showCreateDb, setShowCreateDb] = useState(false);

  const { data: databases = [], isLoading: loadingDatabases } = useQuery<DatabaseType[]>({
    queryKey: ["/api/databases"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/databases");
      return Array.isArray(result) ? result : [];
    },
  });

  const { data: tables = [], isLoading: loadingTables } = useQuery<DatabaseTable[]>({
    queryKey: ["/api/tables"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/tables");
      return Array.isArray(result) ? result : [];
    },
  });

  const { data: rows = {} } = useQuery({
    queryKey: ["/api/rows"],
    queryFn: async () => {
      const rowsData: Record<string, TableRowData[]> = {};
      for (const table of Array.isArray(tables) ? tables : []) {
        try {
          const tableRows = await apiRequest("GET", `/api/rows/${table.id}`);
          rowsData[table.id] = Array.isArray(tableRows) ? tableRows : [];
        } catch (e) {
          rowsData[table.id] = [];
        }
      }
      return rowsData;
    },
    enabled: Array.isArray(tables) && tables.length > 0,
  });

  const { mutate: createDatabase } = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/databases", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/databases"] });
      setNewDbName("");
      setShowCreateDb(false);
      toast({ description: "Database created" });
    },
  });

  const { mutate: deleteDatabase } = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/databases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/databases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rows"] });
      toast({ description: "Database deleted" });
    },
  });

  const { mutate: deleteTable } = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rows"] });
      toast({ description: "Table deleted" });
    },
  });

  const { mutate: insertRow } = useMutation({
    mutationFn: (params: { tableId: string; data: any }) =>
      apiRequest("POST", "/api/rows", { tableId: params.tableId, data: params.data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rows"] });
      toast({ description: "Row inserted" });
    },
  });

  const { mutate: updateRow } = useMutation({
    mutationFn: (params: { rowId: string; data: any }) =>
      apiRequest("PATCH", `/api/rows/${params.rowId}`, { data: params.data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rows"] });
      setEditingRowId(null);
      toast({ description: "Row updated" });
    },
  });

  const { mutate: deleteRow } = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/rows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rows"] });
      toast({ description: "Row deleted" });
    },
  });

  const handleInsertRow = (tableId: string, columns: Column[]) => {
    const data: any = {};
    columns.forEach(col => {
      data[col.name] = newRowData[tableId]?.[col.name] || "";
    });
    insertRow({ tableId, data });
    setNewRowData({ ...newRowData, [tableId]: {} });
  };

  const getTablesForDatabase = (databaseId: string | null) => {
    return tables.filter(t => t.databaseId === databaseId);
  };

  const standaloneTables = tables.filter(t => !t.databaseId);

  const isLoading = loadingDatabases || loadingTables;

  const renderTable = (table: DatabaseTable) => {
    const tableRows = Array.isArray(rows[table.id]) ? rows[table.id] : [];
    const isExpanded = expandedTable === table.id;

    return (
      <Card key={table.id} className="p-4 ml-4 border-l-4 border-l-blue-500">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1">
            <h3 className="text-md font-semibold">{table.name}</h3>
            <p className="text-xs text-muted-foreground">{tableRows.length} rows</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedTable(isExpanded ? null : table.id)}
            >
              {isExpanded ? "Hide" : "Show"} Data
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteTable(table.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            <Table className="border">
              <TableHeader>
                <TableRow>
                  {table.columns?.map((col, idx) => (
                    <TableHead key={idx} className="text-xs">{col.name}</TableHead>
                  ))}
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={(table.columns?.length || 0) + 1}
                      className="text-center text-sm text-muted-foreground py-4"
                    >
                      No rows yet
                    </TableCell>
                  </TableRow>
                ) : (
                  tableRows.map((row: TableRowData) =>
                    editingRowId === row.id ? (
                      <TableRow key={row.id}>
                        {table.columns?.map((col, idx) => (
                          <TableCell key={idx} className="p-1">
                            <Input
                              size={30}
                              value={editData[col.name] || ""}
                              onChange={(e) =>
                                setEditData({ ...editData, [col.name]: e.target.value })
                              }
                              className="text-xs h-7"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="space-x-1">
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs h-6"
                            onClick={() => updateRow({ rowId: row.id, data: editData })}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6"
                            onClick={() => setEditingRowId(null)}
                          >
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={row.id}>
                        {table.columns?.map((col, idx) => (
                          <TableCell key={idx} className="text-xs">
                            {String(row.data[col.name] || "-")}
                          </TableCell>
                        ))}
                        <TableCell className="space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2"
                            onClick={() => {
                              setEditingRowId(row.id);
                              setEditData(row.data);
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-6 px-2"
                            onClick={() => deleteRow(row.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
                <TableRow className="bg-muted/30">
                  {table.columns?.map((col, idx) => (
                    <TableCell key={idx} className="p-1">
                      <Input
                        placeholder={col.name}
                        size={20}
                        value={newRowData[table.id]?.[col.name] || ""}
                        onChange={(e) =>
                          setNewRowData({
                            ...newRowData,
                            [table.id]: {
                              ...(newRowData[table.id] || {}),
                              [col.name]: e.target.value,
                            },
                          })
                        }
                        className="text-xs h-7"
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => handleInsertRow(table.id, table.columns || [])}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-background p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Database Explorer</h1>
        <p className="text-muted-foreground">View and manage your databases, tables, and rows</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : databases.length === 0 && standaloneTables.length === 0 ? (
        <div className="flex flex-col justify-center items-center flex-1">
          <div className="text-center mb-6">
            <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No databases yet. Create one to get started!</p>
          </div>
          {showCreateDb ? (
            <Card className="p-4 w-80">
              <Input
                placeholder="Database name"
                value={newDbName}
                onChange={(e) => setNewDbName(e.target.value)}
                className="mb-3"
              />
              <div className="flex gap-2">
                <Button onClick={() => newDbName && createDatabase(newDbName)} className="flex-1">
                  Create
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDb(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </Card>
          ) : (
            <Button onClick={() => setShowCreateDb(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Database
            </Button>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            Or use the chat to say "create database school"
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Databases</h2>
            {showCreateDb ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Database name"
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                  className="w-40"
                />
                <Button size="sm" onClick={() => newDbName && createDatabase(newDbName)}>
                  Create
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCreateDb(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setShowCreateDb(true)}>
                <Plus className="w-4 h-4 mr-2" /> New Database
              </Button>
            )}
          </div>

          {databases.map((db) => {
            const dbTables = getTablesForDatabase(db.id);
            const isExpanded = expandedDatabase === db.id;

            return (
              <Card key={db.id} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={() => setExpandedDatabase(isExpanded ? null : db.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <Database className="w-5 h-5 text-blue-500" />
                    <div>
                      <h2 className="text-lg font-semibold">{db.name}</h2>
                      <p className="text-xs text-muted-foreground">{dbTables.length} tables</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteDatabase(db.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="space-y-4 mt-4">
                    {dbTables.length === 0 ? (
                      <p className="text-sm text-muted-foreground ml-4">
                        No tables yet. Use chat to say "create table student with id, name in database {db.name}"
                      </p>
                    ) : (
                      dbTables.map(renderTable)
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {standaloneTables.length > 0 && (
            <>
              <h2 className="text-xl font-semibold mt-8">Standalone Tables</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Tables not associated with any database
              </p>
              <div className="space-y-4">
                {standaloneTables.map(renderTable)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
