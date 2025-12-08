import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Column {
  name: string;
  type: string;
}

interface DatabaseTable {
  id: string;
  name: string;
  columns: Column[];
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function Charts() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["/api/tables"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/tables");
      return Array.isArray(result) ? result : [];
    },
  });

  const selectedTableData = Array.isArray(tables) && tables.find((t: DatabaseTable) => t.id === selectedTable);

  // Demo data for visualization
  const demoData = [
    { name: "Jan", value: 400 },
    { name: "Feb", value: 300 },
    { name: "Mar", value: 500 },
    { name: "Apr", value: 450 },
    { name: "May", value: 600 },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Chart Generator</h1>
        <p className="text-muted-foreground">Create visualizations from your database</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !Array.isArray(tables) || tables.length === 0 ? (
        <div className="flex justify-center items-center flex-1">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No tables available. Create tables first.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6 flex-1">
          {/* Config Panel */}
          <Card className="col-span-1 p-4 h-fit">
            <h3 className="font-semibold mb-4 text-sm">Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-2 block">Table</label>
                <select
                  value={selectedTable || ""}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full px-2 py-1 border border-border rounded text-sm"
                >
                  <option value="">Select table...</option>
                  {Array.isArray(tables) &&
                    tables.map((t: DatabaseTable) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium mb-2 block">Chart Type</label>
                <div className="space-y-2">
                  {(["bar", "line", "pie"] as const).map((type) => (
                    <Button
                      key={type}
                      variant={chartType === type ? "default" : "outline"}
                      className="w-full text-xs"
                      onClick={() => setChartType(type)}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedTableData && (
                <div>
                  <label className="text-xs font-medium mb-2 block">Columns</label>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {Array.isArray(selectedTableData.columns) &&
                      selectedTableData.columns.map((col: Column) => (
                        <label key={col.name} className="flex items-center text-xs">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          {col.name}
                        </label>
                      ))}
                  </div>
                </div>
              )}

              <Button className="w-full text-xs" disabled={!selectedTable}>
                Generate Chart
              </Button>
            </div>
          </Card>

          {/* Chart Display */}
          <div className="col-span-3 bg-card rounded-lg p-6 flex items-center justify-center">
            {!selectedTable ? (
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <p>Select a table and click generate</p>
              </div>
            ) : chartType === "bar" ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={demoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : chartType === "line" ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={demoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie data={demoData} cx="50%" cy="50%" labelLine={false} label outerRadius={120} fill="#8884d8" dataKey="value">
                    {demoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
