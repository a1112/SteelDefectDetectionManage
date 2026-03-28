import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { ReportsPage } from "../components/pages/ReportsPage";
import { useSteelPlates } from "../hooks/useSteelPlates";
import type { DetectionRecord } from "../types/app.types";

export default function ReportsRoute() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<DetectionRecord[]>([]);
  const [selectedPlateId, setSelectedPlateId] = useState<string | null>(null);
  const { steelPlates } = useSteelPlates(
    selectedPlateId,
    setSelectedPlateId,
    history,
    setHistory,
  );

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all group"
            title="返回主界面"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold tracking-tighter">
              返回
            </span>
          </button>
          <div className="h-6 w-[1px] bg-border mx-1" />
          <div className="flex flex-col justify-center">
            <span className="text-[13px] font-black tracking-tighter leading-none flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              报表中心
            </span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-70">
              Reports / Analytics
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <ReportsPage history={history} steelPlates={steelPlates} />
      </div>
    </div>
  );
}
