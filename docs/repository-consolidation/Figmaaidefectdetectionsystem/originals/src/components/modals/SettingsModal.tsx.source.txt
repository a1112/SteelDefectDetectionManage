import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu, Bell, User, Settings, Database, Shield, Monitor,
  ChevronLeft, ChevronRight, Search, Play, Pause, Square,
  Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCcw, Clock,
  Layout, BarChart3, AlertCircle, FileText, ChevronDown,
  LogOut, Box, Terminal, Home, Calendar, LayoutGrid,
  Keyboard, MousePointer2, X, Info, Palette, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import type { ApiNode } from "../../api/types";
import { InfoPanel } from "../InfoPanel";
import type { DistributionScaleMode } from "../types/app.types";
import { useStyleSystem, useAppMode } from "@/components/StyleSystemProvider";

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
  const navigate = useNavigate();
  const [activeSettingsTab, setActiveSettingsTab] = useState<"display" | "theme" | "keyboard" | "info">("display");
  const { activePreset, applyPreset, traditionalPresets } = useStyleSystem();
  const { mode: appMode, setMode: setAppMode } = useAppMode();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-card border border-border shadow-2xl rounded-sm flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">系统设置</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-muted-foreground/20 rounded transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex">
              {/* Sidebar Tabs */}
              <div className="w-36 border-r border-border bg-muted/50">
                <button
                  onClick={() => setActiveSettingsTab("display")}
                  className={`w-full px-4 py-3 text-left text-[11px] font-bold transition-all border-l-2 flex items-center gap-2 ${activeSettingsTab === 'display' ? 'text-primary border-primary bg-primary/10' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                >
                  <Monitor className="w-3.5 h-3.5" /> 显示配置
                </button>
                <button
                  onClick={() => setActiveSettingsTab("theme")}
                  className={`w-full px-4 py-3 text-left text-[11px] font-bold transition-all border-l-2 flex items-center gap-2 ${activeSettingsTab === 'theme' ? 'text-primary border-primary bg-primary/10' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                >
                  <Palette className="w-3.5 h-3.5" /> 风格主题
                </button>
                <button
                  onClick={() => setActiveSettingsTab("keyboard")}
                  className={`w-full px-4 py-3 text-left text-[11px] font-bold transition-all border-l-2 flex items-center gap-2 ${activeSettingsTab === 'keyboard' ? 'text-primary border-primary bg-primary/10' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                >
                  <Keyboard className="w-3.5 h-3.5" /> 快捷指令
                </button>
                <button
                  onClick={() => setActiveSettingsTab("info")}
                  className={`w-full px-4 py-3 text-left text-[11px] font-bold transition-all border-l-2 flex items-center gap-2 ${activeSettingsTab === 'info' ? 'text-primary border-primary bg-primary/10' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                >
                  <Info className="w-3.5 h-3.5" /> 系统信息
                </button>
              </div>

              <div className="flex-1 p-6 space-y-6 min-h-[320px] overflow-y-auto max-h-[500px]">
                {activeSettingsTab === "display" ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">图像列表列数 ({gridCols})</label>
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 rounded border border-primary/20">DYNAMIC</span>
                      </div>
                      <input
                        type="range" min="2" max="12" step="1"
                        value={gridCols} onChange={(e) => setGridCols(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                        <span>MIN: 2</span>
                        <span>MAX: 12</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">刷新默认加载 ({refreshLimit})</label>
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 rounded border border-primary/20">API</span>
                      </div>
                      <input
                        type="range" min="10" max="100" step="10"
                        value={refreshLimit} onChange={(e) => setRefreshLimit(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                        <span>10</span>
                        <span>100</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">图像渲染模式</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setIsImageFit(true)}
                          className={`flex items-center justify-center gap-2 p-3 border rounded-sm transition-all ${isImageFit ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:border-muted-foreground'}`}
                        >
                          <Maximize2 className="w-4 h-4" />
                          <span className="text-[11px] font-bold">等比缩放</span>
                        </button>
                        <button
                          onClick={() => setIsImageFit(false)}
                          className={`flex items-center justify-center gap-2 p-3 border rounded-sm transition-all ${!isImageFit ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:border-muted-foreground'}`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                          <span className="text-[11px] font-bold">图像平铺</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">分布图显示模式</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDistributionScaleMode("fit")}
                          className={`flex items-center justify-center gap-2 p-3 border rounded-sm transition-all ${distributionScaleMode === "fit" ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:border-muted-foreground'}`}
                        >
                          <Maximize2 className="w-4 h-4" />
                          <span className="text-[11px] font-bold">等比缩放</span>
                        </button>
                        <button
                          onClick={() => setDistributionScaleMode("stretch")}
                          className={`flex items-center justify-center gap-2 p-3 border rounded-sm transition-all ${distributionScaleMode === "stretch" ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:border-muted-foreground'}`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                          <span className="text-[11px] font-bold">拉伸</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : activeSettingsTab === "theme" ? (
                  <>
                    {/* 风格选择器 */}
                    <div className="space-y-5">
                      <div className="p-4 bg-muted/50 border border-border rounded-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                            <Palette className="w-3.5 h-3.5 text-primary" />
                            当前风格
                          </div>
                          <span className="text-[10px] text-primary">{activePreset.name}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <div
                            className="w-5 h-5 rounded-full shadow-sm border border-border"
                            style={{ backgroundColor: activePreset.colors.primary.hex }}
                          />
                          <div
                            className="w-5 h-5 rounded-full shadow-sm border border-border"
                            style={{ backgroundColor: activePreset.colors.accent.hex }}
                          />
                          <div
                            className="w-5 h-5 rounded-full shadow-sm border border-border"
                            style={{ backgroundColor: activePreset.colors.background.hex }}
                          />
                        </div>
                      </div>

                      {/* 风格预设选择 */}
                      <div className="space-y-3">
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                          选择风格预设
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {traditionalPresets.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => applyPreset(preset.id)}
                              className={`relative p-4 rounded-lg border-2 transition-all hover:scale-[1.02] active:scale-95 text-left ${
                                activePreset.id === preset.id
                                  ? "border-primary shadow-lg shadow-primary/20"
                                  : "border-border hover:border-muted-foreground"
                              }`}
                              style={{
                                background: `linear-gradient(135deg, ${preset.colors.background.hex} 0%, ${preset.colors.muted.hex} 100%)`,
                              }}
                            >
                              {activePreset.id === preset.id && (
                                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-sm">
                                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                </div>
                              )}
                              <div className="space-y-2">
                                <div className="flex gap-1.5">
                                  <div
                                    className="w-4 h-4 rounded-full shadow-sm border border-border/30"
                                    style={{ backgroundColor: preset.colors.primary.hex }}
                                  />
                                  <div
                                    className="w-4 h-4 rounded-full shadow-sm border border-border/30"
                                    style={{ backgroundColor: preset.colors.accent.hex }}
                                  />
                                </div>
                                <div>
                                  <div
                                    className="text-[10px] font-bold"
                                    style={{ color: preset.colors.foreground.hex }}
                                  >
                                    {preset.name}
                                  </div>
                                  <div
                                    className="text-[9px] opacity-70 truncate"
                                    style={{ color: preset.colors.foreground.hex }}
                                  >
                                    {preset.description}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="text-[9px] text-muted-foreground text-center pt-1">
                          传统模式 · {traditionalPresets.length} 种工业风格
                        </div>
                      </div>

                      {/* 模式切换 */}
                      <div className="space-y-3 pt-2">
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                          界面模式
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setMode("traditional")}
                            className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
                              appMode === "traditional"
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-card border-border text-muted-foreground hover:border-muted-foreground"
                            }`}
                          >
                            <Monitor className="w-5 h-5" />
                            <div className="text-left">
                              <div className="text-[10px] font-bold">传统仪表盘</div>
                              <div className="text-[9px] text-muted-foreground">当前模式</div>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setMode("modern");
                              navigate("/"); // 跳转到现代化模式
                              onClose();
                            }}
                            className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
                              appMode === "modern"
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-card border-border text-muted-foreground hover:border-muted-foreground"
                            }`}
                          >
                            <Layout className="w-5 h-5" />
                            <div className="text-left">
                              <div className="text-[10px] font-bold">现代化看板</div>
                              <div className="text-[9px] text-muted-foreground">切换查看</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : activeSettingsTab === "keyboard" ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-card border border-border rounded-sm">
                      <div className="text-[10px] text-muted-foreground font-bold mb-3 uppercase flex items-center gap-2">
                        <MousePointer2 className="w-3 h-3 text-primary" /> 导航与查看控制
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground">上 / 下 键</span>
                          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">切换 钢板/缺陷</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground">左 / 右 键</span>
                          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">图像 放大/缩小</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground">空格键 (Space)</span>
                          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">播放 / 暂停</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground">T 键</span>
                          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">跳至开头</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground">Tab 键</span>
                          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">切换 列表/单图</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground">Q / E 键</span>
                          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">上一卷 / 下一卷</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic leading-relaxed">
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

            <div className="p-4 bg-muted border-t border-border flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold rounded-sm transition-colors shadow-lg"
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
