import { useState, useRef, useEffect } from "react";
import { X, Search, Calendar } from "lucide-react";

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (criteria: SearchCriteria) => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

export interface SearchCriteria {
  serialNumber?: string;
  plateId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function SearchDialog({
  isOpen,
  onClose,
  onSearch,
  triggerRef,
}: SearchDialogProps) {
  const [searchType, setSearchType] = useState<
    "serial" | "plate" | "date"
  >("serial");
  const [serialNumber, setSerialNumber] = useState("");
  const [plateId, setPlateId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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

  const handleSearch = () => {
    const criteria: SearchCriteria = {};

    if (searchType === "serial" && serialNumber) {
      criteria.serialNumber = serialNumber;
    } else if (searchType === "plate" && plateId) {
      criteria.plateId = plateId;
    } else if (searchType === "date") {
      if (dateFrom) criteria.dateFrom = dateFrom;
      if (dateTo) criteria.dateTo = dateTo;
    }

    onSearch(criteria);
    onClose();
  };

  const handleReset = () => {
    setSerialNumber("");
    setPlateId("");
    setDateFrom("");
    setDateTo("");
    onSearch({});
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
            <Search
              className={`text-primary ${isMobileDevice ? "w-5 h-5" : "w-4 h-4"}`}
            />
            <h2
              className={`font-bold uppercase tracking-wider text-primary ${
                isMobileDevice ? "text-base" : "text-xs"
              }`}
            >
              查询钢板记录
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
          {/* 查询类型选择 */}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
              查询方式
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setSearchType("serial")}
                className={`px-2.5 py-1.5 text-[10px] font-bold border transition-all ${
                  searchType === "serial"
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-card/50 text-muted-foreground border-border/50 hover:bg-accent/30"
                }`}
              >
                流水号查询
              </button>
              <button
                onClick={() => setSearchType("plate")}
                className={`px-2.5 py-1.5 text-[10px] font-bold border transition-all ${
                  searchType === "plate"
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-card/50 text-muted-foreground border-border/50 hover:bg-accent/30"
                }`}
              >
                板号查询
              </button>
              <button
                onClick={() => setSearchType("date")}
                className={`px-2.5 py-1.5 text-[10px] font-bold border transition-all ${
                  searchType === "date"
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-card/50 text-muted-foreground border-border/50 hover:bg-accent/30"
                }`}
              >
                时间查询
              </button>
            </div>
          </div>

          {/* 查询输入区域 */}
          <div className="bg-muted/10 border border-border/50 p-3">
            {searchType === "serial" && (
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
                  流水号
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) =>
                    setSerialNumber(e.target.value)
                  }
                  placeholder="例如：00000001"
                  className="w-full px-2.5 py-1.5 bg-background border border-border text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
                <p className="text-[9px] text-muted-foreground mt-1">
                  输入完整或部分流水号进行搜索（8位数字）
                </p>
              </div>
            )}

            {searchType === "plate" && (
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
                  钢板号
                </label>
                <input
                  type="text"
                  value={plateId}
                  onChange={(e) => setPlateId(e.target.value)}
                  placeholder="例如：SP240001"
                  className="w-full px-2.5 py-1.5 bg-background border border-border text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
                <p className="text-[9px] text-muted-foreground mt-1">
                  输入完整或部分钢板号进行搜索
                </p>
              </div>
            )}

            {searchType === "date" && (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
                    起始时间
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={dateFrom}
                      onChange={(e) =>
                        setDateFrom(e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 bg-background border border-border text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
                    结束时间
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={dateTo}
                      onChange={(e) =>
                        setDateTo(e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 bg-background border border-border text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  选择时间范围进行查询，可只选择起始或结束时间
                </p>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={handleSearch}
              className="flex-1 px-3 py-1.5 bg-primary hover:bg-primary/80 text-primary-foreground border border-primary/50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="font-bold text-[10px] uppercase tracking-wider">
                开始查询
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