import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Database, Plus, Trash2, Link2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Column {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
}

interface DatabaseTable {
  id: string;
  name: string;
  columns: Column[];
  positions?: Record<string, { x: number; y: number }>;
}

export default function ERDiagram() {
  const [activeTab, setActiveTab] = useState("schema");
  const [scale, setScale] = useState(1);
  const [erScale, setErScale] = useState(1);
  const [draggedEntity, setDraggedEntity] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showAddAttr, setShowAddAttr] = useState<string | null>(null);
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrType, setNewAttrType] = useState("text");
  const [editingKey, setEditingKey] = useState<{ table: string; col: string } | null>(null);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["/api/tables"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/tables");
      return Array.isArray(result) ? result : [];
    },
  });

  const { mutate: updatePositions } = useMutation({
    mutationFn: (params: { tableId: string; positions: any }) =>
      apiRequest("PATCH", `/api/tables/${params.tableId}/positions`, params.positions),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tables"] }),
  });

  const { mutate: addColumn } = useMutation({
    mutationFn: (params: { tableId: string; column: any }) =>
      apiRequest("POST", `/api/tables/${params.tableId}/columns`, params.column),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setShowAddAttr(null);
      setNewAttrName("");
    },
  });

  const { mutate: removeColumn } = useMutation({
    mutationFn: (params: { tableId: string; colName: string }) =>
      apiRequest("DELETE", `/api/tables/${params.tableId}/columns/${params.colName}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tables"] }),
  });

  const { mutate: updateColumn } = useMutation({
    mutationFn: (params: { tableId: string; colName: string; updates: any }) =>
      apiRequest("PATCH", `/api/tables/${params.tableId}/columns/${params.colName}`, params.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setEditingKey(null);
    },
  });

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];
  const getColor = (idx: number) => colors[idx % colors.length];

  const handleEntityMouseDown = (e: React.MouseEvent, tableId: string) => {
    if ((e.target as any).closest("button")) return;
    setDraggedEntity(tableId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedEntity) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const table = Array.isArray(tables) && tables.find(t => t.id === draggedEntity);
      if (table) {
        const pos = (table as any).positions || {};
        const newPos = {
          ...pos,
          [draggedEntity]: {
            x: (pos[draggedEntity]?.x || 100) + deltaX,
            y: (pos[draggedEntity]?.y || 100) + deltaY,
          },
        };
        updatePositions({ tableId: draggedEntity, positions: newPos });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!Array.isArray(tables) || tables.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No tables yet. Create tables using chat.</p>
        </div>
      </div>
    );
  }

  const entities = Array.isArray(tables)
    ? tables.map((table, idx) => {
        const pos = (table as any).positions?.[table.id];
        let x, y;
        if (pos) {
          x = pos.x;
          y = pos.y;
        } else {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          x = 50 + col * 900;
          y = 50 + row * 550;
        }
        return { ...table, x, y, color: getColor(idx) };
      })
    : [];

  const renderSchemaDiagram = () => (
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b border-border bg-card">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg font-bold">Schema Diagram</h1>
          <div className="flex gap-2 text-xs">
            <span>Zoom: {(scale * 100).toFixed(0)}%</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-24"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Drag entities to move. Click + to add attributes. Click keys to mark primary/foreign</p>
      </div>

      <div
        className="flex-1 bg-muted/20 overflow-auto relative"
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDraggedEntity(null)}
        onMouseLeave={() => setDraggedEntity(null)}
        onWheel={(e) => {
          e.preventDefault();
          setScale(Math.max(0.5, Math.min(3, scale - e.deltaY * 0.001)));
        }}
        style={{ cursor: draggedEntity ? "grabbing" : "grab" }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
            transition: draggedEntity ? "none" : "transform 0.2s",
            minWidth: "3000px",
            minHeight: "2000px",
          }}
        >
          <svg className="absolute w-full h-full" style={{ pointerEvents: "none" }}>
            {entities.flatMap((entity) =>
              (entity.columns as Column[]).flatMap((col) => {
                if (col.foreignKeyTable) {
                  const targetEntity = entities.find(e => e.name === col.foreignKeyTable);
                  if (!targetEntity) return [];
                  return (
                    <line
                      key={`rel-${entity.id}-${col.name}`}
                      x1={entity.x + 130}
                      y1={entity.y + 80}
                      x2={targetEntity.x + 130}
                      y2={targetEntity.y + 20}
                      stroke="#000000"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                }
                return [];
              })
            )}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#000000" />
              </marker>
            </defs>
          </svg>

          {entities.map((entity) => (
            <div
              key={entity.id}
              onMouseDown={(e) => handleEntityMouseDown(e, entity.id)}
              style={{
                position: "absolute",
                left: entity.x,
                top: entity.y,
                cursor: "grab",
              }}
            >
              <Card className="w-64 p-3 border-2" style={{ borderColor: entity.color }}>
                <div className="font-bold text-sm mb-2 p-1 bg-muted rounded text-center">
                  {entity.name.toUpperCase()}
                </div>

                <div className="space-y-1 mb-2 max-h-48 overflow-y-auto">
                  {(entity.columns as Column[]).map((col) => (
                    <div key={col.name} className="flex justify-between items-center text-xs p-1 bg-background rounded group">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          {col.isPrimaryKey && <Key className="w-3 h-3 text-yellow-500" />}
                          {col.foreignKeyTable && <Link2 className="w-3 h-3 text-blue-500" />}
                          <span className={col.isPrimaryKey ? "font-bold underline" : ""}>
                            {col.name}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">{col.type}</div>
                        {col.foreignKeyTable && (
                          <div className="text-blue-600 text-xs">-&gt; {col.foreignKeyTable}.{col.foreignKeyColumn}</div>
                        )}
                      </div>
                      <div className="flex gap-0.5 invisible group-hover:visible">
                        <button
                          onClick={() => setEditingKey({ table: entity.id, col: col.name })}
                          className="p-1 hover:bg-muted rounded"
                          title="Set primary/foreign key"
                        >
                          <Key className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeColumn({ tableId: entity.id, colName: col.name })}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowAddAttr(entity.id)}
                  className="w-full p-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90"
                >
                  <Plus className="w-3 h-3 inline mr-1" /> Add Attribute
                </button>
              </Card>

              {showAddAttr === entity.id && (
                <Card className="absolute top-full mt-2 w-64 p-3 z-50 border-primary border-2">
                  <input
                    placeholder="Column name"
                    value={newAttrName}
                    onChange={(e) => setNewAttrName(e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded mb-2"
                  />
                  <select
                    value={newAttrType}
                    onChange={(e) => setNewAttrType(e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded mb-2"
                  >
                    <option>text</option>
                    <option>integer</option>
                    <option>boolean</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (newAttrName) addColumn({ tableId: entity.id, column: { name: newAttrName, type: newAttrType } });
                      }}
                      className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddAttr(null)}
                      className="flex-1 px-2 py-1 text-xs bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </Card>
              )}

              {editingKey?.table === entity.id && (
                <Card className="absolute top-full mt-2 w-72 p-3 z-50 border-primary border-2">
                  <div className="text-xs font-bold mb-2">Edit Key: {editingKey.col}</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(entity.columns as Column[]).find(c => c.name === editingKey.col)?.isPrimaryKey || false}
                        onChange={(e) =>
                          updateColumn({
                            tableId: entity.id,
                            colName: editingKey.col,
                            updates: { isPrimaryKey: e.target.checked },
                          })
                        }
                      />
                      <span>Primary Key</span>
                    </label>

                    <div>
                      <label className="text-xs">Foreign Key References:</label>
                      <select
                        defaultValue={(entity.columns as Column[]).find(c => c.name === editingKey.col)?.foreignKeyTable || ""}
                        onChange={(e) => {
                          const targetTable = e.target.value;
                          if (targetTable) {
                            const targetEntity = entities.find(t => t.name === targetTable);
                            updateColumn({
                              tableId: entity.id,
                              colName: editingKey.col,
                              updates: {
                                foreignKeyTable: targetTable,
                                foreignKeyColumn: (targetEntity?.columns as Column[])[0]?.name,
                              },
                            });
                          } else {
                            updateColumn({
                              tableId: entity.id,
                              colName: editingKey.col,
                              updates: { foreignKeyTable: null, foreignKeyColumn: null },
                            });
                          }
                        }}
                        className="w-full px-2 py-1 text-xs border rounded"
                      >
                        <option value="">None</option>
                        {entities
                          .filter(e => e.id !== entity.id)
                          .map(e => (
                            <option key={e.id} value={e.name}>
                              {e.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <button
                      onClick={() => setEditingKey(null)}
                      className="w-full px-2 py-1 text-xs bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Done
                    </button>
                  </div>
                </Card>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-border bg-card text-xs space-y-1">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-yellow-500" /> Primary Key
          </div>
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-500" /> Foreign Key
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gray-400 border-dashed" /> Relationship
          </div>
        </div>
      </div>
    </div>
  );

  const renderTraditionalERDiagram = () => {
    const erEntities = entities.map((entity, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      return {
        ...entity,
        erX: 150 + col * 500,
        erY: 150 + row * 400,
      };
    });

    return (
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-border bg-card">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-bold">ER Diagram (Chen Notation)</h1>
            <div className="flex gap-2 text-xs">
              <span>Zoom: {(erScale * 100).toFixed(0)}%</span>
              <input
                type="range"
                min="0.3"
                max="2"
                step="0.1"
                value={erScale}
                onChange={(e) => setErScale(parseFloat(e.target.value))}
                className="w-24"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Traditional ER diagram with rectangles for entities and ovals for attributes
          </p>
        </div>

        <div
          className="flex-1 bg-muted/20 overflow-auto relative"
          onWheel={(e) => {
            e.preventDefault();
            setErScale(Math.max(0.3, Math.min(2, erScale - e.deltaY * 0.001)));
          }}
        >
          <div
            style={{
              transform: `scale(${erScale})`,
              transformOrigin: "0 0",
              transition: "transform 0.2s",
              minWidth: "2500px",
              minHeight: "2000px",
              position: "relative",
            }}
          >
            <svg className="absolute w-full h-full" style={{ pointerEvents: "none" }}>
              {erEntities.map((entity) => {
                const cols = entity.columns as Column[];
                const entityCenterX = entity.erX + 70;
                const entityCenterY = entity.erY + 25;

                return cols.map((col, colIdx) => {
                  const angle = (colIdx / cols.length) * Math.PI * 2 - Math.PI / 2;
                  const radius = 120;
                  const attrX = entityCenterX + Math.cos(angle) * radius;
                  const attrY = entityCenterY + Math.sin(angle) * radius;

                  return (
                    <line
                      key={`attr-line-${entity.id}-${col.name}`}
                      x1={entityCenterX}
                      y1={entityCenterY}
                      x2={attrX}
                      y2={attrY}
                      stroke="#666"
                      strokeWidth="1"
                    />
                  );
                });
              })}

              {erEntities.flatMap((entity) =>
                (entity.columns as Column[]).flatMap((col) => {
                  if (col.foreignKeyTable) {
                    const targetEntity = erEntities.find(e => e.name === col.foreignKeyTable);
                    if (!targetEntity) return [];
                    
                    const midX = (entity.erX + 70 + targetEntity.erX + 70) / 2;
                    const midY = (entity.erY + 25 + targetEntity.erY + 25) / 2;

                    return (
                      <g key={`rel-${entity.id}-${col.name}`}>
                        <line
                          x1={entity.erX + 70}
                          y1={entity.erY + 25}
                          x2={midX}
                          y2={midY}
                          stroke="#333"
                          strokeWidth="2"
                        />
                        <line
                          x1={midX}
                          y1={midY}
                          x2={targetEntity.erX + 70}
                          y2={targetEntity.erY + 25}
                          stroke="#333"
                          strokeWidth="2"
                        />
                        <polygon
                          points={`${midX},${midY - 20} ${midX + 30},${midY} ${midX},${midY + 20} ${midX - 30},${midY}`}
                          fill="#fff"
                          stroke="#333"
                          strokeWidth="2"
                        />
                        <text
                          x={midX}
                          y={midY + 4}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#333"
                        >
                          references
                        </text>
                      </g>
                    );
                  }
                  return [];
                })
              )}
            </svg>

            {erEntities.map((entity) => {
              const cols = entity.columns as Column[];
              const entityCenterX = entity.erX + 70;
              const entityCenterY = entity.erY + 25;

              return (
                <div key={entity.id}>
                  <div
                    style={{
                      position: "absolute",
                      left: entity.erX,
                      top: entity.erY,
                      width: "140px",
                      height: "50px",
                      backgroundColor: entity.color,
                      border: "3px solid #333",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "14px",
                      color: "white",
                      textTransform: "uppercase",
                    }}
                  >
                    {entity.name}
                  </div>

                  {cols.map((col, colIdx) => {
                    const angle = (colIdx / cols.length) * Math.PI * 2 - Math.PI / 2;
                    const radius = 120;
                    const attrX = entityCenterX + Math.cos(angle) * radius - 50;
                    const attrY = entityCenterY + Math.sin(angle) * radius - 18;

                    return (
                      <div
                        key={`attr-${entity.id}-${col.name}`}
                        style={{
                          position: "absolute",
                          left: attrX,
                          top: attrY,
                          width: "100px",
                          height: "36px",
                          backgroundColor: col.isPrimaryKey ? "#fef08a" : "#fff",
                          border: col.isPrimaryKey ? "2px solid #ca8a04" : "2px solid #666",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          textAlign: "center",
                          padding: "2px",
                        }}
                      >
                        <span style={{ textDecoration: col.isPrimaryKey ? "underline" : "none" }}>
                          {col.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-t border-border bg-card text-xs space-y-1">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-5 bg-blue-500 border-2 border-black" />
              <span>Entity (Rectangle)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 bg-white border-2 border-gray-600 rounded-full" />
              <span>Attribute (Oval)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 bg-yellow-200 border-2 border-yellow-600 rounded-full" />
              <span>Primary Key (Underlined)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-white border-2 border-gray-600" style={{ transform: "rotate(45deg)" }} />
              <span>Relationship (Diamond)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border px-4">
          <TabsList className="h-12">
            <TabsTrigger value="schema" className="px-6">Schema Diagram</TabsTrigger>
            <TabsTrigger value="er" className="px-6">ER Diagram</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="schema" className="flex-1 flex flex-col m-0">
          {renderSchemaDiagram()}
        </TabsContent>
        <TabsContent value="er" className="flex-1 flex flex-col m-0">
          {renderTraditionalERDiagram()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
