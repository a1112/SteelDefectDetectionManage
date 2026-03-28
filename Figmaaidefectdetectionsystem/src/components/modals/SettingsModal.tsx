import React, { useState } from "react";
import { 
  Menu, Bell, User, Settings, Database, Shield, Monitor, 
  ChevronLeft, ChevronRight, Search, Play, Pause, Square,
  Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCcw, Clock,
  Layout, BarChart3, AlertCircle, FileText, ChevronDown,
  LogOut, Box, Terminal, Home, Calendar, LayoutGrid,
  Keyboard, MousePointer2, X, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import type { ApiNode } from "../../api/types";
import { InfoPanel } from "../InfoPanel";
import type { DistributionScaleMode } from "../types/app.types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gridCols: number;
  setGridCols: (val: number) => void;
  isImageFit: boolean;
  setIsImageFit: (val: boolean) => void;
  refreshLimit: number;
  setRefreshLimit: (val: number) => void;
  distributionScaleMode: DistributionScaleMode;
  setDistributionScaleMode: (mode: DistributionScaleMode) => void;
  lineKey?: string;
  apiNodes?: ApiNode[];
  companyName?: string;
}

export function SettingsModal({
  isOpen,
  onClose,
  gridCols,
  setGridCols,
  isImageFit,
  setIsImageFit,
  refreshLimit,
  setRefreshLimit,
  distributionScaleMode,
  setDistributionScaleMode,
  lineKey,
  apiNodes,
  companyName,
}: SettingsModalProps) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<"display" | "keyboard" | "info">("display");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-[#161b22] border border-[#30363d] shadow-2xl rounded-sm flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#0d1117]">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#58a6ff]" />
                <h3 className="text-sm font-bold text-[#f0f6fc] uppercase tracking-wider">系统设置</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-[#30363d] rounded transition-colors text-[#8b949e] hover:text-[#f0f6fc]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex">
              {/* Sidebar Tabs */}
              <div className="w-32 border-r border-[#30363d] bg-[#0d1117]/50">
                <button 
                  onClick={() => setActiveSettingsTab("display")}
                  className={`w-full px-4 py-3 text-left text-[11px] font-bold transition-all border-l-2 flex items-center gap-2 ${activeSettingsTab === 'display' ? 'text-[#58a6ff] border-[#58a6ff] bg-[#58a6ff]/5' : 'text-[#8b949e] border-transparent hover:text-[#c9d1d9]'}`}
                >
                  <Monitor className="w-3.5 h-3.5" /> 显示配置
                </button>
                <button 
                  onClick={() => setActiveSettingsTab("keyboard")}
                  className={`w-full px-4 py-3 text-left text-[11px] font-bold transition-all border-l-2 flex items-center gap-2 ${activeSettingsTab === 'keyboard' ? 'text-[#58a6ff] border-[#58a6ff] bg-[#58a6ff]/5' : 'text-[#8b949e] border-transparent hover:text-[#c9d1d9]'}`}
                >
                  <Keyboard className="w-3.5 h-3.5" /> 快捷指令
                </button>
                <button 
                  onClick={() => setActiveSettingsTab("info")}
                  className={`w-full px-4 py-3 text-left text-[11px] font-bold transition-all border-l-2 flex items-center gap-2 ${activeSettingsTab === 'info' ? 'text-[#58a6ff] border-[#58a6ff] bg-[#58a6ff]/5' : 'text-[#8b949e] border-transparent hover:text-[#c9d1d9]'}`}
                >
                  <Info className="w-3.5 h-3.5" /> 系统信息
                </button>
              </div>

              <div className="flex-1 p-6 space-y-6 min-h-[320px]">
                {activeSettingsTab === "display" ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-tight">图像列表列数 ({gridCols})</label>
                        <span className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-1.5 rounded border border-[#58a6ff]/20">DYNAMIC</span>
                      </div>
                      <input 
                        type="range" min="2" max="12" step="1"
                        value={gridCols} onChange={(e) => setGridCols(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[#30363d] rounded-lg appearance-none cursor-pointer accent-[#58a6ff]"
                      />
                      <div className="flex justify-between text-[9px] text-[#484f58] font-mono">
                        <span>MIN: 2</span>
                        <span>MAX: 12</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-tight">刷新默认加载 ({refreshLimit})</label>
                        <span className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-1.5 rounded border border-[#58a6ff]/20">API</span>
                      </div>
                      <input 
                        type="range" min="10" max="100" step="10"
                        value={refreshLimit} onChange={(e) => setRefreshLimit(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[#30363d] rounded-lg appearance-none cursor-pointer accent-[#58a6ff]"
                      />
                      <div className="flex justify-between text-[9px] text-[#484f58] font-mono">
                        <span>10</span>
                        <span>100</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-tight">图像渲染模式</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setIsImageFit(true)}
                          className={`flex items-center justify-center gap-2 p-3 border rounded-sm transition-all ${isImageFit ? 'bg-[#58a6ff]/10 border-[#58a6ff] text-[#58a6ff]' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]'}`}
                        >
                          <Maximize2 className="w-4 h-4" />
                          <span className="text-[11px] font-bold">等比缩放</span>
                        </button>
                        <button 
                          onClick={() => setIsImageFit(false)}
                          className={`flex items-center justify-center gap-2 p-3 border rounded-sm transition-all ${!isImageFit ? 'bg-[#58a6ff]/10 border-[#58a6ff] text-[#58a6ff]' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]'}`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                          <span className="text-[11px] font-bold">图像平铺</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-[#8b949e] uppercase tracking-tight">分布图显示模式</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDistributionScaleMode("fit")}
                          className={`flex items-center justify-center gap-2 p-3 border rounded-sm transition-all ${distributionScaleMode === "fit" ? 'bg-[#58a6ff]/10 border-[#58a6ff] text-[#58a6ff]' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]'}`}
                        >
                          <Maximize2 className="w-4 h-4" />
                          <span className="text-[11px] font-bold">等比缩放</span>
                        </button>
                        <button
                          onClick={() => setDistributionScaleMode("stretch")}
                          className={`flex items-center justify-center gap-2 p-3 border rounded-sm transition-all ${distributionScaleMode === "stretch" ? 'bg-[#58a6ff]/10 border-[#58a6ff] text-[#58a6ff]' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]'}`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                          <span className="text-[11px] font-bold">拉伸</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : activeSettingsTab === "keyboard" ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-sm">
                      <div className="text-[10px] text-[#8b949e] font-bold mb-3 uppercase flex items-center gap-2">
                        <MousePointer2 className="w-3 h-3 text-[#58a6ff]" /> 导航与查看控制
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#c9d1d9]">上 / 下 键</span>
                          <span className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-2 py-0.5 rounded border border-[#58a6ff]/20">切换 钢板/缺陷</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#c9d1d9]">左 / 右 键</span>
                          <span className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-2 py-0.5 rounded border border-[#58a6ff]/20">图像 放大/缩小</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#c9d1d9]">空格键 (Space)</span>
                          <span className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-2 py-0.5 rounded border border-[#58a6ff]/20">播放 / 暂停</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#c9d1d9]">T 键</span>
                          <span className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-2 py-0.5 rounded border border-[#58a6ff]/20">跳至开头</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#c9d1d9]">Tab 键</span>
                          <span className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-2 py-0.5 rounded border border-[#58a6ff]/20">切换 列表/单图</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#c9d1d9]">Q / E 键</span>
                          <span className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-2 py-0.5 rounded border border-[#58a6ff]/20">上一卷 / 下一卷</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#484f58] italic leading-relaxed">
                      * 快捷键在主视图聚焦时自动生效，可大幅提升复核判定效率。
                    </p>
                  </div>
                ) : (
                  <InfoPanel
                    variant="traditional"
                    lineKey={lineKey}
                    apiNodes={apiNodes}
                    companyName={companyName}
                  />
                )}
              </div>
            </div>

            <div className="p-4 bg-[#0d1117] border-t border-[#30363d] flex justify-end">
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-[#58a6ff] hover:bg-[#4a9eff] text-[#ffffff] text-[11px] font-bold rounded-sm transition-colors shadow-[0_0_15px_rgba(88,166,255,0.2)]"
              >
                完成配置
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
