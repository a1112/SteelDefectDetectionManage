import { useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Search,
  Filter,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Download,
} from "lucide-react";
import type { SteelPlate } from "../types/app.types";
import {
  defectTypes,
  defectAccentColors,
} from "../utils/defects";
import { getLevelText } from "../utils/steelPlates";

interface DefectReportProps {
  data: { type: string; count: number }[];
  steelPlates: SteelPlate[];
  accentColors?: Record<string, string>;
}

export function DefectReport({
  data,
  steelPlates,
  accentColors,
}: DefectReportProps) {
  const getColor = (type: string) =>
    accentColors?.[type] ??
    defectAccentColors[type] ??
    "#6366f1";
  // 查询和筛选状态
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string[]>([]);
  const [filterDefectRange, setFilterDefectRange] = useState<{
    min?: number;
    max?: number;
  }>({});
  const [sortField, setSortField] =
    useState<string>("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    "desc",
  );
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedPlateId, setSelectedPlateId] = useState<
    string | null
  >(null);

  // 模拟钢板缺陷数据（实际应该从后端获取）
  const enrichedPlates = steelPlates.map((plate) => {
    const defects: { [key: string]: number } = {};
    defectTypes.forEach((type) => {
      defects[type] = Math.floor(Math.random() * 5); // 模拟数据
    });
    return { ...plate, defects };
  });

  // 筛选和搜索逻辑
  const filteredPlates = enrichedPlates.filter((plate) => {
    // 搜索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !plate.serialNumber.toLowerCase().includes(query) &&
        !plate.plateId.toLowerCase().includes(query) &&
        !plate.steelGrade.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // 级别筛选
    if (
      filterLevel.length > 0 &&
      !filterLevel.includes(plate.level)
    ) {
      return false;
    }

    // 缺陷数量筛选
    if (
      filterDefectRange.min !== undefined &&
      plate.defectCount < filterDefectRange.min
    ) {
      return false;
    }
    if (
      filterDefectRange.max !== undefined &&
      plate.defectCount > filterDefectRange.max
    ) {
      return false;
    }

    return true;
  });

  // 排序逻辑
  const sortedPlates = [...filteredPlates].sort((a, b) => {
    let comparison = 0;

    if (sortField === "timestamp") {
      comparison =
        a.timestamp.getTime() - b.timestamp.getTime();
    } else if (sortField === "serialNumber") {
      comparison = a.serialNumber.localeCompare(b.serialNumber);
    } else if (sortField === "plateId") {
      comparison = a.plateId.localeCompare(b.plateId);
    } else if (sortField === "level") {
      comparison = a.level.localeCompare(b.level);
    } else if (sortField === "defectCount") {
      comparison = a.defectCount - b.defectCount;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleExport = () => {
    alert("导出Excel功能");
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterLevel([]);
    setFilterDefectRange({});
  };

  return (
    <div className="bg-card border border-border p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-lg">
          缺陷类型统计 / DEFECT TYPE DISTRIBUTION
        </h3>
        <button
          onClick={handleExport}
          className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          EXPORT REPORT
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-muted/30 border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">
            总检测数 / TOTAL INSPECTIONS
          </div>
          <div className="text-3xl font-mono">
            {data.reduce((sum, item) => sum + item.count, 0)}
          </div>
        </div>
        <div className="bg-muted/30 border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">
            缺陷类型 / DEFECT TYPES
          </div>
          <div className="text-3xl font-mono">
            {data.length}
          </div>
        </div>
        <div className="bg-muted/30 border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">
            最高频率 / MAX FREQUENCY
          </div>
          <div className="text-3xl font-mono">
            {Math.max(...data.map((d) => d.count))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Chart */}
        <div className="bg-muted/20 border border-border p-4">
          <h4 className="text-sm font-medium mb-4">
            缺陷分布图表 / DEFECT DISTRIBUTION CHART
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#333"
              />
              <XAxis
                dataKey="type"
                tick={{ fill: "#888", fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: "#888", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="count" name="数量">
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getColor(entry.type)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="bg-muted/20 border border-border p-4">
          <h4 className="text-sm font-medium mb-4">
            缺陷详细列表 / DEFECT DETAIL LIST
          </h4>
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {data.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-card/50 border border-border/50 hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{
                      backgroundColor: getColor(item.type),
                    }}
                  ></div>
                  <span className="text-sm font-mono">
                    {item.type}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono text-muted-foreground">
                    {item.count} 次
                  </span>
                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${(item.count / Math.max(...data.map((d) => d.count))) * 100}%`,
                        backgroundColor: getColor(item.type),
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Excel-like Table */}
      <div className="bg-muted/20 border border-border flex-1 flex flex-col min-h-0">
        {/* Table Header with Search and Filter */}
        <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h4 className="text-sm font-medium">
            钢板缺陷统计表 / STEEL PLATE DEFECT STATISTICS
          </h4>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索流水号/钢板号/钢种"
                className="w-64 px-3 py-1.5 pl-8 bg-background border border-border text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Filter Button */}
            <div className="relative">
              <button
                onClick={() =>
                  setShowFilterPanel(!showFilterPanel)
                }
                className={`px-3 py-1.5 text-xs border transition-colors flex items-center gap-1.5 ${
                  filterLevel.length > 0 ||
                  filterDefectRange.min !== undefined ||
                  filterDefectRange.max !== undefined
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "bg-card border-border text-foreground hover:bg-accent"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                筛选
              </button>

              {/* Filter Panel */}
              {showFilterPanel && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border-2 border-primary shadow-2xl shadow-primary/20 z-50">
                  <div className="bg-primary/20 border-b-2 border-primary px-3 py-2 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      筛选条件
                    </h4>
                    <button
                      onClick={() => setShowFilterPanel(false)}
                      className="text-xs hover:text-primary"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-3 space-y-3">
                    {/* Level Filter */}
                    <div>
                      <label className="block text-xs text-muted-foreground mb-2">
                        质量级别
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {["A", "B", "C", "D"].map((level) => (
                          <button
                            key={level}
                            onClick={() => {
                              setFilterLevel((prev) =>
                                prev.includes(level)
                                  ? prev.filter(
                                      (l) => l !== level,
                                    )
                                  : [...prev, level],
                              );
                            }}
                            className={`px-2 py-1.5 text-xs border transition-colors ${
                              filterLevel.includes(level)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:bg-accent"
                            }`}
                          >
                            {getLevelText(level as any)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Defect Count Range */}
                    <div>
                      <label className="block text-xs text-muted-foreground mb-2">
                        缺陷数量范围
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="最小"
                          value={filterDefectRange.min || ""}
                          onChange={(e) =>
                            setFilterDefectRange((prev) => ({
                              ...prev,
                              min: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            }))
                          }
                          className="flex-1 px-2 py-1.5 bg-background border border-border text-xs focus:outline-none focus:border-primary"
                        />
                        <span className="text-xs text-muted-foreground">
                          -
                        </span>
                        <input
                          type="number"
                          placeholder="最大"
                          value={filterDefectRange.max || ""}
                          onChange={(e) =>
                            setFilterDefectRange((prev) => ({
                              ...prev,
                              max: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            }))
                          }
                          className="flex-1 px-2 py-1.5 bg-background border border-border text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handleResetFilters}
                        className="flex-1 px-3 py-1.5 bg-muted border border-border text-xs hover:bg-accent transition-colors"
                      >
                        重置
                      </button>
                      <button
                        onClick={() =>
                          setShowFilterPanel(false)
                        }
                        className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors"
                      >
                        应用
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reset */}
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-card border border-border text-xs hover:bg-accent transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>

            {/* Results Count */}
            <span className="text-xs text-muted-foreground">
              {sortedPlates.length}/{enrichedPlates.length}{" "}
              条记录
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b-2 border-border sticky top-0 z-10">
              <tr>
                <th
                  onClick={() => handleSort("serialNumber")}
                  className="px-3 py-2 text-left font-bold cursor-pointer hover:bg-accent/30 transition-colors border-r border-border"
                >
                  <div className="flex items-center gap-1">
                    流水号
                    {sortField === "serialNumber" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("plateId")}
                  className="px-3 py-2 text-left font-bold cursor-pointer hover:bg-accent/30 transition-colors border-r border-border"
                >
                  <div className="flex items-center gap-1">
                    钢板号
                    {sortField === "plateId" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="px-3 py-2 text-left font-bold border-r border-border">
                  钢种
                </th>
                <th className="px-3 py-2 text-left font-bold border-r border-border">
                  规格(mm)
                </th>
                <th
                  onClick={() => handleSort("timestamp")}
                  className="px-3 py-2 text-left font-bold cursor-pointer hover:bg-accent/30 transition-colors border-r border-border"
                >
                  <div className="flex items-center gap-1">
                    检测时间
                    {sortField === "timestamp" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                {defectTypes.map((type) => (
                  <th
                    key={type}
                    className="px-3 py-2 text-center font-bold border-r border-border"
                    title={type}
                  >
                    {type.substring(0, 2)}
                  </th>
                ))}
                <th
                  onClick={() => handleSort("defectCount")}
                  className="px-3 py-2 text-center font-bold cursor-pointer hover:bg-accent/30 transition-colors border-r border-border"
                >
                  <div className="flex items-center justify-center gap-1">
                    总数
                    {sortField === "defectCount" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("level")}
                  className="px-3 py-2 text-center font-bold cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    级别
                    {sortField === "level" &&
                      (sortOrder === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPlates.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    没有找到匹配的记录
                  </td>
                </tr>
              ) : (
                sortedPlates.map((plate, index) => (
                  <tr
                    key={plate.plateId}
                    onClick={() =>
                      setSelectedPlateId(
                        selectedPlateId === plate.serialNumber
                          ? null
                          : plate.serialNumber,
                      )
                    }
                    className={`border-b border-border cursor-pointer transition-all ${
                      selectedPlateId === plate.serialNumber
                        ? "bg-primary/20 border-primary shadow-lg shadow-primary/10"
                        : index % 2 === 0
                          ? "bg-muted/10 hover:bg-accent/30"
                          : "bg-background hover:bg-accent/30"
                    }`}
                  >
                    <td className="px-3 py-2 font-mono border-r border-border">
                      {plate.serialNumber}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold border-r border-border">
                      {plate.plateId}
                    </td>
                    <td className="px-3 py-2 font-mono border-r border-border">
                      {plate.steelGrade}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] border-r border-border">
                      {plate.dimensions.length}×
                      {plate.dimensions.width}×
                      {plate.dimensions.thickness}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] border-r border-border">
                      {plate.timestamp.toLocaleString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    {defectTypes.map((type) => (
                      <td
                        key={type}
                        className="px-3 py-2 text-center font-mono border-r border-border"
                        style={{
                          backgroundColor: plate.defects?.[type]
                            ? `${getColor(type)}15`
                            : "transparent",
                        }}
                      >
                        {plate.defects?.[type] || 0}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-mono font-bold border-r border-border">
                      {plate.defectCount}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm border text-[10px] ${
                          plate.level === "A"
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : plate.level === "B"
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                              : plate.level === "C"
                                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                                : "bg-red-500/10 border-red-500/30 text-red-400"
                        }`}
                      >
                        {getLevelText(plate.level)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
