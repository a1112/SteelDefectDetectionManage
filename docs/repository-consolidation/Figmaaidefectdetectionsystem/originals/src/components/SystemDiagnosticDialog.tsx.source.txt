import { RefObject, useEffect, useState } from "react";
import {
  X,
  Camera,
  RefreshCw,
  Power,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { useSystemMetrics } from "../hooks/useSystemMetrics";
import {
  DiskUsagePanel,
  NetworkStatusPanel,
  ServerResourcesPanel,
} from "./system/SystemMetricsBlocks";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface SystemDiagnosticDialogProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
}

export function SystemDiagnosticDialog({
  isOpen,
  onClose,
  triggerRef,
}: SystemDiagnosticDialogProps) {
  const [cameraStatus, setCameraStatus] = useState({
    online: true,
    fps: 30,
    resolution: "1920x1080",
    temperature: 42,
  });
  const { metrics } = useSystemMetrics({ enabled: isOpen });

  // 模拟实时数据更新
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      // 模拟轻微波动
      setCameraStatus((prev) => ({
        ...prev,
        fps: 30 + Math.floor(Math.random() * 2),
        temperature: 42 + Math.floor(Math.random() * 3),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetSystem = () => {
    alert("执行一键恢复...");
  };

  const handleRestartCamera = () => {
    setCameraStatus((prev) => ({ ...prev, online: false }));
    setTimeout(() => {
      setCameraStatus((prev) => ({
        ...prev,
        online: true,
        fps: 30,
      }));
      alert("相机重启完成");
    }, 2000);
  };

  const handleRestartServer = () => {
    alert("确认重启服务器？此操作将中断当前所有检测任务。");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[580px] bg-card/80 backdrop-blur-xl border-border shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <DialogTitle className="text-sm font-bold uppercase tracking-wider">
              系统诊断 / SYSTEM DIAGNOSTIC
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 相机状态 */}
          <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <h4 className="font-bold text-xs uppercase tracking-wide">
                  相机状态 / CAMERA
                </h4>
              </div>
              {cameraStatus.online ? (
                <div className="flex items-center gap-1 text-green-400 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>在线</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>离线</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  帧率 FPS
                </div>
                <div className="font-mono font-bold text-lg">
                  {cameraStatus.fps} fps
                </div>
              </div>
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  分辨率
                </div>
                <div className="font-mono font-bold text-sm">
                  {cameraStatus.resolution}
                </div>
              </div>
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  温度
                </div>
                <div
                  className={`font-mono font-bold text-lg ${
                    cameraStatus.temperature > 50
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {cameraStatus.temperature}°C
                </div>
              </div>
              <div className="bg-background/50 border border-border/30 p-2">
                <div className="text-muted-foreground mb-1">
                  状态
                </div>
                <div className="text-green-400 font-bold">
                  正常
                </div>
              </div>
            </div>

            <button
              onClick={handleRestartCamera}
              className="w-full mt-3 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold border border-blue-500/30 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重启相机
            </button>
          </div>

          {/* Disk Usage */}
          <DiskUsagePanel disks={metrics?.disks} maxHeightClass="max-h-36" />

          {/* Server Resources */}
          <ServerResourcesPanel resources={metrics?.resources ?? null} />

          {/* Network Status */}
          <NetworkStatusPanel interfaces={metrics?.network_interfaces} />
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSystem}
              className="flex-1 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 text-xs font-bold border border-yellow-500/30 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              一键恢复
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-muted hover:bg-accent text-foreground text-xs font-bold border border-border rounded-md transition-colors"
            >
              关闭
            </button>
          </div>
          <div className="mt-3 text-[10px] text-muted-foreground text-center font-mono">
            最后更新: {new Date().toLocaleTimeString("zh-CN")} | 系统版本: v2.0.1
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}