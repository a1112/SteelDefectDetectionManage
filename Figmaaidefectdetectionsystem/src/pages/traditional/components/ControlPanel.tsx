import { Play, Pause, Square, RefreshCcw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";

interface ControlPanelProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onRefresh: () => void;
  refreshLimit: number;
  onRefreshLimitChange: (limit: number) => void;
  showRefreshLimit?: boolean;
}

/**
 * 控制面板组件
 *
 * 提供播放/暂停、停止、刷新等控制功能
 */
export function ControlPanel({
  isPlaying,
  onPlayPause,
  onStop,
  onRefresh,
  refreshLimit,
  onRefreshLimitChange,
  showRefreshLimit = true,
}: ControlPanelProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border-b border-border/30">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPlayPause}
        className="w-8 h-8 p-0"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onStop}
        className="w-8 h-8 p-0"
      >
        <Square className="w-4 h-4" />
      </Button>
      <div className="w-px h-4 bg-border/50" />
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        className="h-7 px-2 text-xs"
      >
        <RefreshCcw className="w-3 h-3 mr-1" />
        刷新
      </Button>
      {showRefreshLimit && (
        <>
          <div className="w-px h-4 bg-border/50" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">数量:</span>
            <select
              value={refreshLimit}
              onChange={(e) => onRefreshLimitChange(Number(e.target.value))}
              className="text-xs bg-background border border-border/50 rounded px-1.5 py-0.5"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
