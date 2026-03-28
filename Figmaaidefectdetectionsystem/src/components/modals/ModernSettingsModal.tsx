import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { 
  Settings, 
  Monitor, 
  Layers, 
  Palette, 
  ArrowUpDown, 
  SlidersHorizontal,
  Keyboard,
  MousePointer2,
  Info,
  Check
} from "lucide-react";
import type { ImageOrientation, DistributionScaleMode } from "../types/app.types";
import { useTheme, themePresets } from "../ThemeContext";
import type { ApiNode } from "../../api/types";
import { InfoPanel } from "../InfoPanel";

interface ModernSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageOrientation: ImageOrientation;
  setImageOrientation: (orientation: ImageOrientation) => void;
  showDistributionImages: boolean;
  setShowDistributionImages: (show: boolean) => void;
  showTileBorders: boolean;
  setShowTileBorders: (show: boolean) => void;
  distributionScaleMode: DistributionScaleMode;
  setDistributionScaleMode: (mode: DistributionScaleMode) => void;
  defectHoverCardWidth: number;
  setDefectHoverCardWidth: (value: number) => void;
  defectHoverImageStretch: boolean;
  setDefectHoverImageStretch: (value: boolean) => void;
  plateHoverEnabled: boolean;
  setPlateHoverEnabled: (value: boolean) => void;
  defectListHoverDefaultVisible: boolean;
  setDefectListHoverDefaultVisible: (value: boolean) => void;
  defectListHoverMaxCategories: number;
  setDefectListHoverMaxCategories: (value: number) => void;
  defectListHoverMaxItems: number;
  setDefectListHoverMaxItems: (value: number) => void;
  defectListHoverItemSize: number;
  setDefectListHoverItemSize: (value: number) => void;
  lineKey?: string;
  apiNodes?: ApiNode[];
  companyName?: string;
}

export function ModernSettingsModal({
  isOpen,
  onClose,
  imageOrientation,
  setImageOrientation,
  showDistributionImages,
  setShowDistributionImages,
  showTileBorders,
  setShowTileBorders,
  distributionScaleMode,
  setDistributionScaleMode,
  defectHoverCardWidth,
  setDefectHoverCardWidth,
  defectHoverImageStretch,
  setDefectHoverImageStretch,
  plateHoverEnabled,
  setPlateHoverEnabled,
  defectListHoverDefaultVisible,
  setDefectListHoverDefaultVisible,
  defectListHoverMaxCategories,
  setDefectListHoverMaxCategories,
  defectListHoverMaxItems,
  setDefectListHoverMaxItems,
  defectListHoverItemSize,
  setDefectListHoverItemSize,
  lineKey,
  apiNodes,
  companyName,
}: ModernSettingsModalProps) {
  const { currentTheme, applyTheme } = useTheme();
  const [activeSubTab, setActiveSubTab] = React.useState<"ui" | "theme" | "shortcuts" | "about">("ui");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] bg-card/80 backdrop-blur-xl border-border shadow-2xl p-0 overflow-hidden">
        <div className="flex h-[480px]">
          {/* Sidebar */}
          <div className="w-40 bg-muted/40 border-r border-border p-3 flex flex-col gap-1">
            <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              系统配置
            </div>
            <button 
              onClick={() => setActiveSubTab("ui")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === "ui" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              显示与界面
            </button>
            <button 
              onClick={() => setActiveSubTab("theme")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === "theme" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              主题设置
            </button>
            <button 
              onClick={() => setActiveSubTab("shortcuts")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === "shortcuts" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              快捷键说明
            </button>
            <button 
              onClick={() => setActiveSubTab("about")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === "about" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              系统信息
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {activeSubTab === "ui" && (
              <>
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Settings className="w-5 h-5 text-primary" />
                    显示与界面设置
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    配置仪表盘图像显示偏好与交互风格。
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      全局设置
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <Layers className="w-3.5 h-3.5" />
                          分布图显示
                        </div>
                        <div className="grid gap-2">
                          <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold">等比/拉伸</span>
                              <span className="text-[10px] text-muted-foreground">分布图显示比例模式</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setDistributionScaleMode("fit")}
                                className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                                  distributionScaleMode === "fit"
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                等比
                              </button>
                              <button
                                onClick={() => setDistributionScaleMode("stretch")}
                                className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                                  distributionScaleMode === "stretch"
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                拉伸
                              </button>
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold">显示瓦片图像</span>
                              <span className="text-[10px] text-muted-foreground">在缺陷分布图中加载并显示钢板表面图像</span>
                            </div>
                            <button
                              onClick={() => setShowDistributionImages(!showDistributionImages)}
                              className={`w-8 h-4 rounded-full relative transition-colors ${
                                showDistributionImages ? "bg-primary" : "bg-muted-foreground/30"
                              }`}
                            >
                              <div 
                                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${
                                  showDistributionImages ? "right-0.5" : "left-0.5"
                                }`} 
                              />
                            </button>
                          </div>

                          <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold">显示瓦片轮廓</span>
                              <span className="text-[10px] text-muted-foreground">瓦片加载器调试：显示瓦片边缘及整体轮廓</span>
                            </div>
                            <button
                              onClick={() => setShowTileBorders(!showTileBorders)}
                              className={`w-8 h-4 rounded-full relative transition-colors ${
                                showTileBorders ? "bg-primary" : "bg-muted-foreground/30"
                              }`}
                            >
                              <div 
                                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${
                                  showTileBorders ? "right-0.5" : "left-0.5"
                                }`} 
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <MousePointer2 className="w-3.5 h-3.5" />
                          悬浮框设置
                        </div>
                        <div className="grid gap-2">
                          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold">缺陷悬浮框</span>
                                <span className="text-[10px] text-muted-foreground">调整缺陷显示大小与拉伸方式</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">拉伸</span>
                                <button
                                  onClick={() => setDefectHoverImageStretch(!defectHoverImageStretch)}
                                  className={`w-8 h-4 rounded-full relative transition-colors ${
                                    defectHoverImageStretch ? "bg-primary" : "bg-muted-foreground/30"
                                  }`}
                                >
                                  <div 
                                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${
                                      defectHoverImageStretch ? "right-0.5" : "left-0.5"
                                    }`} 
                                  />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                              <span>显示宽度</span>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={160}
                                  max={320}
                                  step={10}
                                  value={defectHoverCardWidth}
                                  onChange={(event) => {
                                    const next = Number.isFinite(event.target.valueAsNumber)
                                      ? event.target.valueAsNumber
                                      : defectHoverCardWidth;
                                    setDefectHoverCardWidth(next);
                                  }}
                                  className="h-7 w-20 text-[10px] px-2"
                                />
                                <span>px</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold">记录悬浮框</span>
                              <span className="text-[10px] text-muted-foreground">悬浮时显示钢板记录摘要</span>
                            </div>
                            <button
                              onClick={() => setPlateHoverEnabled(!plateHoverEnabled)}
                              className={`w-8 h-4 rounded-full relative transition-colors ${
                                plateHoverEnabled ? "bg-primary" : "bg-muted-foreground/30"
                              }`}
                            >
                              <div 
                                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${
                                  plateHoverEnabled ? "right-0.5" : "left-0.5"
                                }`} 
                              />
                            </button>
                          </div>

                          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-bold">缺陷列表悬浮框</span>
                                <span className="text-[10px] text-muted-foreground">控制缺陷预览显示方式</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">
                                  {defectListHoverDefaultVisible ? "默认显示" : "默认隐藏"}
                                </span>
                                <button
                                  onClick={() =>
                                    setDefectListHoverDefaultVisible(!defectListHoverDefaultVisible)
                                  }
                                  className={`w-8 h-4 rounded-full relative transition-colors ${
                                    defectListHoverDefaultVisible
                                      ? "bg-primary"
                                      : "bg-muted-foreground/30"
                                  }`}
                                >
                                  <div 
                                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${
                                      defectListHoverDefaultVisible ? "right-0.5" : "left-0.5"
                                    }`} 
                                  />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground">最大缺陷类别</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={12}
                                  step={1}
                                  value={defectListHoverMaxCategories}
                                  onChange={(event) => {
                                    const next = Number.isFinite(event.target.valueAsNumber)
                                      ? event.target.valueAsNumber
                                      : defectListHoverMaxCategories;
                                    setDefectListHoverMaxCategories(next);
                                  }}
                                  className="h-7 text-[10px] px-2"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground">单类最大数量</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={12}
                                  step={1}
                                  value={defectListHoverMaxItems}
                                  onChange={(event) => {
                                    const next = Number.isFinite(event.target.valueAsNumber)
                                      ? event.target.valueAsNumber
                                      : defectListHoverMaxItems;
                                    setDefectListHoverMaxItems(next);
                                  }}
                                  className="h-7 text-[10px] px-2"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground">单个缺陷大小</span>
                                <Input
                                  type="number"
                                  min={24}
                                  max={64}
                                  step={2}
                                  value={defectListHoverItemSize}
                                  onChange={(event) => {
                                    const next = Number.isFinite(event.target.valueAsNumber)
                                      ? event.target.valueAsNumber
                                      : defectListHoverItemSize;
                                    setDefectListHoverItemSize(next);
                                  }}
                                  className="h-7 text-[10px] px-2"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Image Orientation Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      图像排版方向
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setImageOrientation("horizontal")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                          imageOrientation === "horizontal"
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-muted/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className="w-12 h-8 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
                          <div className="w-8 h-4 bg-muted-foreground/20 rounded-sm" />
                        </div>
                        <span className="text-xs font-bold">水平排列</span>
                        <span className="text-[10px] text-muted-foreground">适合宽屏显示器</span>
                      </button>
                      <button
                        onClick={() => setImageOrientation("vertical")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                          imageOrientation === "vertical"
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-muted/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className="w-8 h-12 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
                          <div className="w-4 h-8 bg-muted-foreground/20 rounded-sm" />
                        </div>
                        <span className="text-xs font-bold">垂直排列</span>
                        <span className="text-[10px] text-muted-foreground">适合移动端或纵向分屏</span>
                      </button>
                    </div>
                  </div>

                  
                </div>
              </>
            )}

            {activeSubTab === "theme" && (
              <>
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Palette className="w-5 h-5 text-primary" />
                    主题设置
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    自定义系统视觉风格与配色方案。
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <Palette className="w-3.5 h-3.5" />
                      主题预设
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {themePresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyTheme(preset)}
                          className={`relative p-3 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-95 text-left group ${
                            currentTheme.id === preset.id
                              ? "border-primary shadow-lg shadow-primary/20"
                              : "border-border hover:border-muted-foreground/50"
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${preset.colors.background} 0%, ${preset.colors.muted} 100%)`,
                          }}
                        >
                          {currentTheme.id === preset.id && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-sm animate-in fade-in zoom-in duration-200">
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <div className="space-y-3">
                            <div className="flex gap-1.5">
                              <div
                                className="w-5 h-5 rounded-full shadow-sm ring-1 ring-black/5"
                                style={{ backgroundColor: preset.colors.primary }}
                              />
                              <div
                                className="w-5 h-5 rounded-full shadow-sm ring-1 ring-black/5"
                                style={{ backgroundColor: preset.colors.accent }}
                              />
                            </div>
                            <div>
                              <div
                                className="text-xs font-bold"
                                style={{ color: preset.colors.foreground }}
                              >
                                {preset.name}
                              </div>
                              <div
                                className="text-[9px] opacity-70 truncate mt-0.5"
                                style={{ color: preset.colors.foreground }}
                              >
                                {preset.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeSubTab === "shortcuts" && (
              <>
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Keyboard className="w-5 h-5 text-primary" />
                    全局快捷键
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    系统内置快捷键，提升生产环境操作效率。
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4">
                  <div className="space-y-2">
                    {[
                      { key: "Q / E", desc: "切换上一卷 / 下一卷" },
                      { key: "T", desc: "跳转至最新数据" },
                      { key: "Tab", desc: "切换 缺陷/图像 视图" },
                      { key: "Esc", desc: "关闭当前弹窗/浮层" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded border border-border bg-muted/20">
                        <span className="text-xs text-muted-foreground">{item.desc}</span>
                        <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-bold text-primary">
                          {item.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-yellow-500 mt-0.5" />
                      <p className="text-[10px] text-yellow-500/80 leading-relaxed">
                        安全提示：当输入框（如搜索、代理地址）处于聚焦状态时，系统将自动暂时禁用快捷键逻辑，以防文本输入与控制冲突。
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeSubTab === "about" && (
              <>
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Info className="w-5 h-5 text-primary" />
                    系统信息
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    服务信息、API 参数与公司权益说明
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 pt-0">
                  <InfoPanel
                    variant="modern"
                    lineKey={lineKey}
                    apiNodes={apiNodes}
                    companyName={companyName}
                  />
                </div>
              </>
            )}

            <div className="p-4 bg-muted/20 border-t border-border flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                取消
              </Button>
              <Button size="sm" onClick={onClose}>
                保存更改
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
