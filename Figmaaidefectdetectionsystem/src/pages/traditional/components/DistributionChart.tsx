import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DistributionChartProps {
  defects: any[];
  defectTypeOptions: Array<{ label: string; color: string }>;
  width?: number;
  height?: number;
}

/**
 * 缺陷分布图组件
 *
 * 显示缺陷类型的统计分布
 */
export function DistributionChart({
  defects,
  defectTypeOptions,
  width = 300,
  height = 150,
}: DistributionChartProps) {
  const chartData = useMemo(() => {
    if (!defects || !defects.length) return [];
    const counts: Record<string, number> = {};
    defects.forEach((d) => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });
    return defectTypeOptions
      .map((t) => ({
        name: t.label,
        count: counts[t.label] || 0,
        color: t.color,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [defects, defectTypeOptions]);

  if (!chartData.length) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground/50 text-xs"
        style={{ width, height }}
      >
        暂无缺陷数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width={width} height={height}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#8b949e", fontSize: 10 }}
          stroke="#8b949e"
        />
        <YAxis
          tick={{ fill: "#8b949e", fontSize: 10 }}
          stroke="#8b949e"
          width={30}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1c2128",
            border: "1px solid #30363d",
            borderRadius: "6px",
          }}
          labelStyle={{ color: "#c9d1d9" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
