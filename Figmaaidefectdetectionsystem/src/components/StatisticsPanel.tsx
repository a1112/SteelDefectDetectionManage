import {
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DetectionRecord } from "../types/app.types";

interface StatisticsPanelProps {
  history: DetectionRecord[];
}

export function StatisticsPanel({
  history,
}: StatisticsPanelProps) {
  const totalDetections = history.length;
  const passCount = history.filter(
    (r) => r.status === "pass",
  ).length;
  const warningCount = history.filter(
    (r) => r.status === "warning",
  ).length;
  const failCount = history.filter(
    (r) => r.status === "fail",
  ).length;
  const passRate =
    totalDetections > 0
      ? Math.round((passCount / totalDetections) * 100)
      : 0;

  const defectCounts = history.reduce(
    (acc, record) => {
      record.defects.forEach((d) => {
        acc[d.type] = (acc[d.type] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>,
  );

  const chartData = Object.entries(defectCounts).map(
    ([name, value]) => ({ name, value }),
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-card border border-border p-4 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <TrendingUp className="w-16 h-16" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Total Scans
          </p>
          <p className="text-2xl font-bold text-foreground mt-1 font-mono">
            {totalDetections}
          </p>
        </div>
        <div className="h-1 w-full bg-secondary mt-4">
          <div className="h-full bg-blue-500 w-full"></div>
        </div>
      </div>

      <div className="bg-card border border-border p-4 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <CheckCircle className="w-16 h-16" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Passed
          </p>
          <p className="text-2xl font-bold text-green-500 mt-1 font-mono">
            {passCount}
          </p>
        </div>
        <div className="h-1 w-full bg-secondary mt-4">
          <div
            className="h-full bg-green-500"
            style={{
              width: `${(passCount / totalDetections) * 100 || 0}%`,
            }}
          ></div>
        </div>
      </div>

      <div className="bg-card border border-border p-4 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <AlertCircle className="w-16 h-16" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Warnings
          </p>
          <p className="text-2xl font-bold text-yellow-500 mt-1 font-mono">
            {warningCount}
          </p>
        </div>
        <div className="h-1 w-full bg-secondary mt-4">
          <div
            className="h-full bg-yellow-500"
            style={{
              width: `${(warningCount / totalDetections) * 100 || 0}%`,
            }}
          ></div>
        </div>
      </div>

      <div className="bg-card border border-border p-4 flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Activity className="w-16 h-16" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Yield Rate
          </p>
          <p className="text-2xl font-bold text-primary mt-1 font-mono">
            {passRate}%
          </p>
        </div>
        <div className="h-1 w-full bg-secondary mt-4">
          <div
            className="h-full bg-primary"
            style={{ width: `${passRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}