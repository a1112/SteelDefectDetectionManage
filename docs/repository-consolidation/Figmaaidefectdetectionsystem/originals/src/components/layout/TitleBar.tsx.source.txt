import {
  Menu,
  Maximize2,
  Minus,
  X,
  Scan,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Images,
  BarChart3,
  Download,
  Settings,
  Database,
  Shield,
  Monitor,
  Wrench,
  FlaskConical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import type {
  ActiveTab,
  SurfaceFilter,
  SteelPlate,
} from "../../types/app.types";

import { useEffect, useState } from "react";
import { LoginModal } from "../auth/LoginModal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../ui/avatar";
import { User as UserIcon, LogOut, LogIn } from "lucide-react";
import { DataSourceModal } from "../modals/DataSourceModal";
import type { ApiNode } from "../../api/types";
import { useNavigate } from "react-router-dom";
import type { AuthUser } from "../../api/admin";
import { getTestModelStatus } from "../../api/testModel";
import { getConfigStatusSimple } from "../../api/status";
import { env } from "../../config/env";
import { isElectronRuntime, isTauriRuntime } from "../../utils/runtime";
import { withTauriWindow } from "../../utils/tauriWindow";

interface TitleBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  filteredSteelPlates: SteelPlate[];
  selectedPlateId: string | null;
  setSelectedPlateId: (id: string | null) => void;
  surfaceFilter: SurfaceFilter;
  setSurfaceFilter: (filter: SurfaceFilter) => void;
  setShowPlatesPanel: (show: boolean) => void;
  setIsDiagnosticDialogOpen: (open: boolean) => void;
  diagnosticButtonRef: React.RefObject<HTMLButtonElement>;
  lineKey?: string;
  lineLabel?: string;
  apiNodes: ApiNode[];
  onLineChange: (name: string) => void;
  onRefreshApiNodes: () => void;
  onOpenSettings: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  filteredSteelPlates,
  selectedPlateId,
  setSelectedPlateId,
  surfaceFilter,
  setSurfaceFilter,
  setShowPlatesPanel,
  setIsDiagnosticDialogOpen,
  diagnosticButtonRef,
  lineKey,
  lineLabel,
  apiNodes,
  onLineChange,
  onRefreshApiNodes,
  onOpenSettings,
}) => {
  const isElectron = isElectronRuntime();
  const isTauri = isTauriRuntime();
  const canDrag = isElectron || isTauri;
  const useElectronDragRegion = isElectron;
  const hasWindowControls = isElectron || isTauri;
  const isWebOnly = !isElectron && !isTauri;
  const handleTauriDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isTauri || event.button !== 0) return;
    if (event.detail > 1) return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        'button, a, input, select, textarea, [role="button"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [data-radix-collection-item], [data-no-drag="true"]',
      )
    ) {
      return;
    }
    event.preventDefault();
    void withTauriWindow((appWindow) => appWindow.startDragging());
  };
  const handleDragDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        'button, a, input, select, textarea, [role="button"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [data-radix-collection-item], [data-no-drag="true"]',
      )
    ) {
      return;
    }
    event.preventDefault();
    void handleToggleMaximize();
  };
  const handleMinimize = () => {
    if (isElectron) {
      window.electronWindow?.minimize?.();
      return;
    }
    void withTauriWindow((appWindow) => appWindow.minimize());
  };
  const handleToggleMaximize = async () => {
    if (isElectron) {
      const next = await window.electronWindow?.toggleMaximize?.();
      if (typeof next === "boolean") setIsMaximized(next);
      return;
    }
    await withTauriWindow(async (appWindow) => {
      await appWindow.toggleMaximize();
      const next = await appWindow.isMaximized();
      if (typeof next === "boolean") setIsMaximized(next);
    });
  };
  const handleClose = () => {
    if (isElectron) {
      window.electronWindow?.close?.();
      return;
    }
    void withTauriWindow((appWindow) => appWindow.close());
  };
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDataSourceOpen, setIsDataSourceOpen] =
    useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [clockNow, setClockNow] = useState(new Date());
  const [currentUser, setCurrentUser] =
    useState<AuthUser | null>(() => {
      const raw = window.localStorage.getItem("auth_user");
      if (!raw) return null;
      try {
        return JSON.parse(raw) as AuthUser;
      } catch {
        return null;
      }
    });
  const [testModelEnabled, setTestModelEnabled] = useState(false);
  const [simpleStatus, setSimpleStatus] = useState<{
    state?: string | null;
    message?: string | null;
    service?: string | null;
    data?: Record<string, any>;
  } | null>(null);
  const navigate = useNavigate();
  const saveUser = (user: AuthUser | null) => {
    if (!user) {
      window.localStorage.removeItem("auth_user");
      return;
    }
    window.localStorage.setItem(
      "auth_user",
      JSON.stringify(user),
    );
  };

  useEffect(() => {
    if (!isElectron || !window.electronWindow?.isMaximized) return;
    window.electronWindow
      .isMaximized()
      .then(setIsMaximized)
      .catch(() => undefined);
  }, [isElectron]);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadStatus = async () => {
      try {
        const status = await getTestModelStatus();
        if (mounted) setTestModelEnabled(Boolean(status.enabled));
      } catch {
        if (mounted) setTestModelEnabled(false);
      }
    };
    void loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSimple = async () => {
      try {
        const kind = "2D";
        const status = await getConfigStatusSimple(lineKey || env.getLineName(), kind);
        if (!mounted) return;
        setSimpleStatus(status);
      } catch {
        if (!mounted) return;
        setSimpleStatus(null);
      }
    };
    void loadSimple();
    const timer = window.setInterval(loadSimple, 2000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [lineKey]);

  const statusLabel = (() => {
    if (!simpleStatus) return "系统就绪";
    const state = (simpleStatus.state || "").toLowerCase();
    if (state === "error") {
      return simpleStatus.message || "系统异常";
    }
    if (simpleStatus.service === "image_generate" && state === "running") {
      const seq = simpleStatus.data?.seq_no;
      const index = simpleStatus.data?.image_index;
      if (seq !== undefined && index !== undefined) {
        return `图像生成中：${seq}-${index}`;
      }
      return simpleStatus.message || "图像生成中";
    }
    return simpleStatus.message || "系统就绪";
  })();

  const handlePrevPlate = () => {
    if (filteredSteelPlates.length === 0) return;
    const currentIndex = filteredSteelPlates.findIndex(
      (p) => p.serialNumber === selectedPlateId,
    );
    const prevIndex =
      currentIndex > 0
        ? currentIndex - 1
        : filteredSteelPlates.length - 1;
    const prevPlate = filteredSteelPlates[prevIndex];
    if (prevPlate) setSelectedPlateId(prevPlate.serialNumber);
  };

  const handleNextPlate = () => {
    if (filteredSteelPlates.length === 0) return;
    const currentIndex = filteredSteelPlates.findIndex(
      (p) => p.serialNumber === selectedPlateId,
    );
    const nextIndex =
      currentIndex < filteredSteelPlates.length - 1
        ? currentIndex + 1
        : 0;
    const nextPlate = filteredSteelPlates[nextIndex];
    if (nextPlate) setSelectedPlateId(nextPlate.serialNumber);
  };

  const currentPlateId = (() => {
    const currentPlate =
      filteredSteelPlates.find(
        (p) => p.serialNumber === selectedPlateId,
      ) || filteredSteelPlates[0];
    return currentPlate?.plateId || "-";
  })();

  return (
    <div
      className={`h-10 bg-muted/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 select-none shrink-0 z-20 ${useElectronDragRegion ? "electron-drag" : ""}`}
      onMouseDown={handleTauriDragStart}
      onDoubleClick={handleDragDoubleClick}
    >
      {/* Left: Menu and Tab Buttons */}
      <div className={`flex items-center gap-3 ${canDrag ? "electron-no-drag" : ""}`}>
        <button
          onClick={() =>
            setIsSidebarCollapsed(!isSidebarCollapsed)
          }
          className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
          title={isSidebarCollapsed ? "展开侧栏" : "折叠侧栏"}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors focus:outline-none outline-none">
              <Menu className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 bg-card border-border text-foreground"
          >
            <DropdownMenuLabel>主菜单</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => window.location.reload()}
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
            >
              网页刷新
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/TraditionalMode")}
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs flex items-center gap-2"
            >
              <Monitor className="w-3.5 h-3.5" />
              传统仪表盘
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/BackendManagement")}
              className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs flex items-center gap-2"
            >
              <Shield className="w-3.5 h-3.5" />
              后台管理
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs">
              窗口
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs">
              帮助
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-border mx-1"></div>

        {/* Tab Buttons - 缺陷/图像 */}
        <button
          onClick={() => setActiveTab("defects")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors rounded-sm ${
            activeTab === "defects"
              ? "bg-primary/90 text-primary-foreground border border-primary/50"
              : "bg-muted/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-border"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          缺陷
        </button>

        <button
          onClick={() => setActiveTab("images")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors rounded-sm ${
            activeTab === "images"
              ? "bg-primary/90 text-primary-foreground border border-primary/50"
              : "bg-muted/50 text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-border"
          }`}
        >
          <Images className="w-3.5 h-3.5" />
          图像
        </button>
      </div>

      {/* Center: App Title */}
      <div className="flex items-center gap-2 flex-1 justify-center px-4">
        <Scan className="w-5 h-5 text-primary" />
        <button
          type="button"
          onClick={() => setIsDataSourceOpen(true)}
          className={`flex items-center gap-1 text-sm font-medium tracking-wider hover:text-primary transition-colors cursor-pointer ${canDrag ? "electron-no-drag" : ""}`}
          title="切换数据源"
        >
          {lineLabel || "STEEL-EYE PRO v2.0.1"}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Right: Status and Window Controls */}
      <div className={`flex items-center gap-4 shrink-0 ${canDrag ? "electron-no-drag" : ""}`}>
        {/* 钢板导航 */}
        {filteredSteelPlates.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 bg-background/50 border border-border rounded">
            <button
              onClick={handlePrevPlate}
              className="p-0.5 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors rounded"
              title="上一块钢板"
              disabled={filteredSteelPlates.length === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-foreground px-1">
              {currentPlateId}
            </span>
            <button
              onClick={handleNextPlate}
              className="p-0.5 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors rounded"
              title="下一块钢板"
              disabled={filteredSteelPlates.length === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 px-3 py-1 bg-background/50 border border-border rounded text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          {statusLabel}
        </div>

        {/* 表面切换 - 缺陷和图像界面都显示 */}
        {(activeTab === "defects" ||
          activeTab === "images") && (
          <div className="flex items-center gap-1 bg-background/50 border border-border rounded-sm p-0.5">
            <button
              onClick={() => setSurfaceFilter("top")}
              className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                surfaceFilter === "top"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              上表
            </button>
            <button
              onClick={() => setSurfaceFilter("bottom")}
              className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                surfaceFilter === "bottom"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              下表
            </button>
            <button
              onClick={() => setSurfaceFilter("all")}
              className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                surfaceFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              全部
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* 功能按钮 */}
          <div className="hidden lg:flex items-center gap-2 rounded-sm border border-border bg-background/50 px-2 py-1 text-[11px] text-muted-foreground font-mono">
            <span>
              {clockNow.toLocaleString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }).replace(/\//g, "-")}
            </span>
          </div>
          {isWebOnly && (
            <button
              onClick={() => navigate("/download")}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="下载中心"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              setShowPlatesPanel(false);
              navigate("/reports");
            }}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="报表"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            ref={diagnosticButtonRef}
            onClick={() => setIsDiagnosticDialogOpen(true)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="监控诊断"
          >
            <Activity className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="工具"
              >
                <Wrench className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 bg-card border-border text-foreground"
            >
              <DropdownMenuLabel>工具</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => navigate("/cache")}
                className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs flex items-center gap-2"
              >
                <Database className="w-3.5 h-3.5" />
                缓存调试
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/status")}
                className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs flex items-center gap-2"
              >
                <Activity className="w-3.5 h-3.5" />
                状态
              </DropdownMenuItem>
              {testModelEnabled && (
                <DropdownMenuItem
                  onClick={() => navigate("/test_model")}
                  className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs flex items-center gap-2"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  模拟运行测试
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onOpenSettings}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="系统设置"
          >
            <Settings className="w-4 h-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-9999 p-0 shadow-sm shadow-black/30 focus:outline-none">
                <Avatar className="h-8 w-8 shrink-0 rounded-9999 avatar-hover-ring transition-all cursor-pointer">
                  <AvatarImage src="" alt="@user" />
                  <AvatarFallback className="bg-primary/10 text-primary leading-none text-center rounded-9999">
                    {currentUser ? (
                      currentUser.username[0].toUpperCase()
                    ) : (
                      <UserIcon className="w-4 h-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                {/* Online Status Indicator */}
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-9999 border-2 border-primary/50 ${currentUser ? "bg-green-500" : "bg-gray-400"}`}
                ></span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-card border-border text-foreground"
            >
              <DropdownMenuLabel>
                {currentUser ? (
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser.username}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.role}
                    </p>
                  </div>
                ) : (
                  "用户未登录"
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={onOpenSettings}
                className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>用户设置</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDataSourceOpen(true)}
                className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
              >
                <Database className="mr-2 h-4 w-4" />
                <span>切换数据源</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              {currentUser ? (
                <DropdownMenuItem
                  onClick={() => {
                    setCurrentUser(null);
                    saveUser(null);
                  }}
                  className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-red-500 focus:text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setIsLoginOpen(true)}
                  className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  <span>登录</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <LoginModal
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
            onLogin={(user) => {
              setCurrentUser(user);
              saveUser(user);
            }}
          />
          <DataSourceModal
            isOpen={isDataSourceOpen}
            onClose={() => setIsDataSourceOpen(false)}
            nodes={apiNodes}
            currentLineKey={lineKey || ""}
            onConfirm={(name) => onLineChange(name)}
            onRefresh={onRefreshApiNodes}
          />

          <div className="w-px h-4 bg-border mx-1 hidden"></div>

          {/* 窗口控制按钮 - 仅桌面版本显示 */}
          <div className={hasWindowControls ? "flex items-center gap-1" : "hidden"}>
            <button
              className="p-1.5 hover:bg-white/10 rounded"
              onClick={handleMinimize}
              title="最小化"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 hover:bg-white/10 rounded"
              onClick={handleToggleMaximize}
              title={isMaximized ? "还原" : "最大化"}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 hover:bg-red-500/80 rounded"
              onClick={handleClose}
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
