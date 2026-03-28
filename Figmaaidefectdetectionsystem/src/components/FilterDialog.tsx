import { useState, useRef, useEffect } from "react";
import { X, Filter, Check } from "lucide-react";

interface FilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFilter: (filters: FilterCriteria) => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

export interface FilterCriteria {
  levels: ("A" | "B" | "C" | "D")[];
  defectCountMin?: number;
  defectCountMax?: number;
}

// 等级映射函数
const getLevelText = (level: "A" | "B" | "C" | "D"): string => {
  const levelMap = {
    A: "一等品",
    B: "二等品",
    C: "三等品",
    D: "等外品",
  };
  return levelMap[level];
};

export function FilterDialog({
  isOpen,
  onClose,
  onFilter,
  triggerRef,
}: FilterDialogProps) {
  const [selectedLevels, setSelectedLevels] = useState<
    ("A" | "B" | "C" | "D")[]
  >([]);
  const [defectCountMin, setDefectCountMin] = useState("");
  const [defectCountMax, setDefectCountMax] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // 检测移动设备
  useEffect(() => {
    const checkMobileDevice = () => {
      setIsMobileDevice(window.innerWidth < 768);
    };

    checkMobileDevice();
    window.addEventListener("resize", checkMobileDevice);
    return () =>
      window.removeEventListener("resize", checkMobileDevice);
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef?.current && !isMobileDevice) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dialogWidth = 420;

      // 计算弹窗左侧位置，优先右对齐按钮
      let left = rect.right - dialogWidth;

      // 如果左侧超出屏幕，改为左对齐按钮
      if (left < 8) {
        left = rect.left;
      }

      // 如果右侧超出屏幕，贴右边缘
      if (left + dialogWidth > window.innerWidth - 8) {
        left = window.innerWidth - dialogWidth - 8;
      }

      setPosition({
        top: rect.bottom + 4,
        left: left,
      });
    }
  }, [isOpen, triggerRef, isMobileDevice]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener(
        "mousedown",
        handleClickOutside,
      );
    }
    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const toggleLevel = (level: "A" | "B" | "C" | "D") => {
    setSelectedLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level],
    );
  };

  const handleApply = () => {
    const filters: FilterCriteria = {
      levels: selectedLevels,
    };

    if (defectCountMin)
      filters.defectCountMin = parseInt(defectCountMin);
    if (defectCountMax)
      filters.defectCountMax = parseInt(defectCountMax);

    onFilter(filters);
    onClose();
  };

  const handleReset = () => {
    setSelectedLevels([]);
    setDefectCountMin("");
    setDefectCountMax("");
    onFilter({ levels: [] });
  };

  const levelConfig = {
    A: {
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      text: "text-green-400",
      activeBg: "bg-green-500",
      activeBorder: "border-green-500",
    },
    B: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      activeBg: "bg-blue-500",
      activeBorder: "border-blue-500",
    },
    C: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
      activeBg: "bg-yellow-500",
      activeBorder: "border-yellow-500",
    },
    D: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-400",
      activeBg: "bg-red-500",
      activeBorder: "border-red-500",
    },
  };

  return (
    <>
      {/* 手机模式：全屏遮罩 */}
      {isMobileDevice && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      <div
        ref={dialogRef}
        style={
          isMobileDevice
            ? {}
            : {
                top: `${position.top}px`,
                left: `${position.left}px`,
              }
        }
        className={`fixed bg-popover border-2 border-primary/50 shadow-2xl shadow-primary/20 z-50 animate-in fade-in-0 zoom-in-95 duration-200 ${
          isMobileDevice
            ? "inset-x-0 bottom-0 top-auto rounded-t-2xl slide-in-from-bottom-full"
            : "w-[420px] slide-in-from-top-2"
        }`}
      >
        {/* 标题栏 */}
        <div
          className={`bg-primary/20 border-b border-primary/50 flex items-center justify-between ${
            isMobileDevice ? "px-4 py-4" : "px-3 py-2"
          }`}
        >
          <div className="flex items-center gap-2">
            <Filter
              className={`text-primary ${isMobileDevice ? "w-5 h-5" : "w-4 h-4"}`}
            />
            <h2
              className={`font-bold uppercase tracking-wider text-primary ${
                isMobileDevice ? "text-base" : "text-xs"
              }`}
            >
              筛选钢板记录
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`hover:bg-destructive/20 border border-border/50 bg-card/50 transition-colors ${
              isMobileDevice ? "p-2" : "p-1"
            }`}
          >
            <X
              className={
                isMobileDevice ? "w-5 h-5" : "w-3.5 h-3.5"
              }
            />
          </button>
        </div>

        {/* 内容区域 */}
        <div
          className={`space-y-4 ${isMobileDevice ? "p-4 max-h-[70vh] overflow-auto" : "p-3 space-y-3"}`}
        >
          {/* 等级筛选 */}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
              按质量等级筛选
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["A", "B", "C", "D"] as const).map((level) => {
                const isSelected =
                  selectedLevels.includes(level);
                const config = levelConfig[level];

                return (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`px-2 py-2 border transition-all relative ${
                      isSelected
                        ? `${config.activeBg} ${config.activeBorder} text-white shadow-md`
                        : `${config.bg} ${config.border} ${config.text} hover:bg-opacity-20`
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0.5 right-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                    <div className="font-bold text-base font-mono">
                      {level}
                    </div>
                    <div className="text-[8px] mt-0.5 opacity-80">
                      {level === "A"
                        ? "一等品"
                        : level === "B"
                          ? "二等品"
                          : level === "C"
                            ? "三等品"
                            : "等外品"}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">
              点击选择一个或多个等级，可多选
            </p>
          </div>

          {/* 缺陷数量筛选 */}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
              按缺陷数量筛选
            </label>
            <div className="bg-muted/10 border border-border/50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-muted-foreground mb-1 uppercase tracking-wide">
                    最小缺陷数
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={defectCountMin}
                    onChange={(e) =>
                      setDefectCountMin(e.target.value)
                    }
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-background border border-border text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-muted-foreground mb-1 uppercase tracking-wide">
                    最大缺陷数
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={defectCountMax}
                    onChange={(e) =>
                      setDefectCountMax(e.target.value)
                    }
                    placeholder="∞"
                    className="w-full px-2.5 py-1.5 bg-background border border-border text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1.5">
                设置缺陷数量范围，留空表示不限制
              </p>
            </div>
          </div>

          {/* 快捷筛选 */}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
              快捷筛选
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  setSelectedLevels(["A"]);
                  setDefectCountMin("");
                  setDefectCountMax("3");
                }}
                className="px-2 py-1.5 text-[10px] font-bold bg-card/50 text-muted-foreground border border-border/50 hover:bg-green-500/20 hover:border-green-500/30 hover:text-green-400 transition-all"
              >
                优质板材
              </button>
              <button
                onClick={() => {
                  setSelectedLevels(["C", "D"]);
                  setDefectCountMin("5");
                  setDefectCountMax("");
                }}
                className="px-2 py-1.5 text-[10px] font-bold bg-card/50 text-muted-foreground border border-border/50 hover:bg-yellow-500/20 hover:border-yellow-500/30 hover:text-yellow-400 transition-all"
              >
                问题板材
              </button>
              <button
                onClick={() => {
                  setSelectedLevels(["D"]);
                  setDefectCountMin("10");
                  setDefectCountMax("");
                }}
                className="px-2 py-1.5 text-[10px] font-bold bg-card/50 text-muted-foreground border border-border/50 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-all"
              >
                严重缺陷
              </button>
            </div>
          </div>

          {/* 当前筛选条件显 */}
          {(selectedLevels.length > 0 ||
            defectCountMin ||
            defectCountMax) && (
            <div className="bg-primary/10 border border-primary/30 p-2.5">
              <div className="text-[9px] text-primary font-bold uppercase tracking-wide mb-1">
                当前筛选条件
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                {selectedLevels.length > 0 && (
                  <div>
                    等级:{" "}
                    {selectedLevels
                      .map((level) => getLevelText(level))
                      .join("、")}
                  </div>
                )}
                {(defectCountMin || defectCountMax) && (
                  <div>
                    缺陷数: {defectCountMin || "0"} ~{" "}
                    {defectCountMax || "∞"}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={handleApply}
              className="flex-1 px-3 py-1.5 bg-primary hover:bg-primary/80 text-primary-foreground border border-primary/50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="font-bold text-[10px] uppercase tracking-wider">
                应用筛选
              </span>
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-card/50 hover:bg-accent/30 text-muted-foreground border border-border/50 transition-colors font-bold text-[10px] uppercase tracking-wider"
            >
              重置
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-card/50 hover:bg-accent/30 text-muted-foreground border border-border/50 transition-colors font-bold text-[10px] uppercase tracking-wider"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </>
  );
}