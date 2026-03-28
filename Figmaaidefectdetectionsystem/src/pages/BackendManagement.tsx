import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Palette,
  Network,
  X,
  ArrowLeft,
  ChevronRight,
  Database,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Maximize2,
  Minus,
} from "lucide-react";
import { StatusBar } from "../components/layout/StatusBar";
import { UISettings } from "../components/backend/UISettings";
import { MockDataEditor } from "../components/backend/MockDataEditor";
import { PermissionsPanel } from "../components/backend/PermissionsPanel";
import { ProxySettings } from "../components/backend/ProxySettings";
import { SystemInfoPanel } from "../components/backend/SystemInfoPanel";
import { ServiceSettings } from "../components/backend/ServiceSettings";
import { useTheme } from "../components/ThemeContext";
import { isElectronRuntime, isTauriRuntime } from "../utils/runtime";
import { withTauriWindow } from "../utils/tauriWindow";
import {
  getConfigMate,
  type ConfigMatePayload,
} from "../api/admin";
import { toast } from "sonner@2.0.3";

type MenuKey =
  | "system"
  | "permissions"
  | "ui"
  | "proxy"
  | "proxy"
  | "cache"
  | "mockdata";

interface MenuItem {
  key: MenuKey;
  label: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  {
    key: "system",
    label: "系统信息",
    icon: <Server className="w-5 h-5" />,
  },
  {
    key: "permissions",
    label: "用户权限",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    key: "ui",
    label: "UI设置",
    icon: <Palette className="w-5 h-5" />,
  },
  {
    key: "cache",
    label: "服务设置",
    icon: <Server className="w-5 h-5" />,
  },
  {
    key: "proxy",
    label: "代理设置",
    icon: <Network className="w-5 h-5" />,
  },
  {
    key: "mockdata",
    label: "测试数据",
    icon: <Database className="w-5 h-5" />,
  },
];

export const BackendManagement: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const isElectron = isElectronRuntime();
  const isTauri = isTauriRuntime();
  const canDrag = isElectron || isTauri;
  const useElectronDragRegion = isElectron;
  const hasWindowControls = isElectron || isTauri;
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
    if (isElectron) {
      window.electronWindow?.toggleMaximize?.().then((next) => {
        if (typeof next === "boolean") setIsMaximized(next);
      });
    } else {
      void withTauriWindow(async (appWindow) => {
        await appWindow.toggleMaximize();
        const next = await appWindow.isMaximized();
        if (typeof next === "boolean") setIsMaximized(next);
      });
    }
  };
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] =
    useState<MenuKey>("system");
  const [mate, setMate] = useState<ConfigMatePayload | null>(
    null,
  );
  
  // CORS Testing State
  const [isTestingCORS, setIsTestingCORS] = useState(false);
  const [corsTestResult, setCorsTestResult] = useState<'idle' | 'success' | 'error'>('idle');

  const testConnectivity = async () => {
    if (!meta?.api_base_url) return;
    setIsTestingCORS(true);
    setCorsTestResult('idle');
    try {
      // Use the mate endpoint itself as a connectivity test
      const response = await fetch(`${meta.api_base_url.replace(/\/api$/, '')}/config/mate`, { 
        cache: 'no-store',
        mode: 'cors'
      });
      if (response.ok) {
        setCorsTestResult('success');
        toast.success("CORS 连通性测试通过");
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      setCorsTestResult('error');
      toast.error(`连通性测试失败: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsTestingCORS(false);
    }
  };

  useEffect(() => {
    let active = true;
    getConfigMate()
      .then((payload) => {
        if (active) setMate(payload);
      })
      .catch(() => {
        if (active) setMate(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isElectron || !window.electronWindow?.isMaximized) return;
    window.electronWindow
      .isMaximized()
      .then(setIsMaximized)
      .catch(() => undefined);
  }, [isElectron]);
  useEffect(() => {
    if (!isTauri) return;
    let active = true;
    withTauriWindow(async (appWindow) => {
      const next = await appWindow.isMaximized();
      if (active && typeof next === "boolean") setIsMaximized(next);
    });
    return () => {
      active = false;
    };
  }, [isTauri]);

  const meta = mate?.meta;
  const modeLabel =
    meta?.connection_mode === "development"
      ? "测试"
      : meta?.connection_mode === "production"
        ? "生产"
        : meta?.connection_mode === "cors"
          ? "跨域"
          : "未知";

  const handleClose = () => {
    navigate("/");
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "permissions":
        return <PermissionsPanel />;
      case "system":
        return <SystemInfoPanel />;
      case "ui":
        return <UISettings />;
      case "proxy":
        return <ProxySettings />;
      case "cache":
        return <ServiceSettings />;
      case "mockdata":
        return <MockDataEditor />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden font-mono selection:bg-primary/30">
      {/* Title Bar - Matching Main App TitleBar Style */}
      <div
        className={`h-12 bg-card border-b border-border flex items-center justify-between px-4 select-none shrink-0 relative z-20 shadow-sm ${useElectronDragRegion ? "electron-drag" : ""}`}
        onMouseDown={handleTauriDragStart}
        onDoubleClick={handleDragDoubleClick}
      >
        <div className={`flex items-center gap-4 ${canDrag ? "electron-no-drag" : ""}`}>
          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all group"
            title="返回主界面"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold tracking-tighter">MAIN UI</span>
          </button>
          <div className="h-6 w-[1px] bg-border mx-1" />
          <div className="flex flex-col justify-center">
            <span className="text-[13px] font-black tracking-tighter leading-none flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              配置管理系统
            </span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] mt-1 opacity-70">
              Admin Control Panel / v2.1.0-RC
            </span>
          </div>
        </div>
        
        <div className={`flex items-center gap-6 ${canDrag ? "electron-no-drag" : ""}`}>
          <div className="hidden md:flex items-center gap-4 text-[10px] font-mono border-l border-border pl-6 py-1">
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground uppercase opacity-50">Mode</span>
              <span className={`font-bold ${meta?.connection_mode === 'production' ? 'text-destructive' : 'text-primary'}`}>
                {modeLabel}
              </span>
            </div>
            <div className="flex flex-col items-end relative group">
              <span className="text-muted-foreground uppercase opacity-50">API Base</span>
              <div className="flex items-center gap-2">
                <span className="font-bold truncate max-w-[150px]" title={meta?.api_base_url}>
                  {meta?.api_base_url || "NONE"}
                </span>
                <button
                  onClick={testConnectivity}
                  disabled={isTestingCORS || !meta?.api_base_url}
                  className={`p-1 rounded-sm transition-all ${
                    corsTestResult === 'success' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : corsTestResult === 'error'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                  }`}
                  title="测试 CORS 连通性"
                >
                  {isTestingCORS ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : corsTestResult === 'success' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : corsTestResult === 'error' ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <Activity className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground uppercase opacity-50">Service</span>
              <span className="font-bold">{meta?.service_name || "UNKNOWN"}</span>
            </div>
          </div>
          
          {!isElectron && (
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-sm"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {hasWindowControls && (
            <div className="flex items-center gap-1">
              <button
                className="p-1.5 hover:bg-muted/60 rounded"
                onClick={() => {
                  if (isElectron) {
                    window.electronWindow?.minimize?.();
                  } else {
                    void withTauriWindow((appWindow) =>
                      appWindow.minimize(),
                    );
                  }
                }}
                title="最小化"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 hover:bg-muted/60 rounded"
                onClick={async () => {
                  if (isElectron) {
                    const next = await window.electronWindow?.toggleMaximize?.();
                    if (typeof next === "boolean") setIsMaximized(next);
                  } else {
                    await withTauriWindow(async (appWindow) => {
                      await appWindow.toggleMaximize();
                      const next = await appWindow.isMaximized();
                      if (typeof next === "boolean") setIsMaximized(next);
                    });
                  }
                }}
                title={isMaximized ? "还原" : "最大化"}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 hover:bg-red-500/80 rounded"
                onClick={() => {
                  if (isElectron) {
                    window.electronWindow?.close?.();
                  } else {
                    void withTauriWindow((appWindow) => appWindow.close());
                  }
                }}
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden bg-background">
        {/* Left Sidebar - Menu */}
        <div className="w-60 bg-card border-r border-border flex flex-col shrink-0">
          <div className="p-4 uppercase text-[10px] font-bold tracking-[0.2em] text-muted-foreground opacity-50 flex items-center justify-between">
            <span>Navigation</span>
            <div className="h-[1px] flex-1 bg-border ml-4" />
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveMenu(item.key)}
                className={`w-full group flex items-center justify-between gap-3 px-3 py-2.5 transition-all rounded-sm border ${
                  activeMenu === item.key
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "text-muted-foreground border-transparent hover:border-border hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`transition-colors ${activeMenu === item.key ? 'text-primary-foreground' : 'text-primary group-hover:text-primary'}`}>
                    {item.icon}
                  </div>
                  <span className={`text-[12px] font-bold tracking-tight ${activeMenu === item.key ? '' : 'grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100'}`}>
                    {item.label}
                  </span>
                </div>
                {activeMenu === item.key && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                )}
              </button>
            ))}
          </div>

          {/* Footer Info Box */}
          <div className="p-4 border-t border-border bg-muted/20">
            <div className="p-3 bg-card border border-border rounded-sm space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">STATUS</span>
                <span className="text-green-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">UPTIME</span>
                <span>04:12:33</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">USER</span>
                <span className="text-primary font-bold">SUPER_ADMIN</span>
              </div>
            </div>
            <div className="mt-4 text-[9px] text-center text-muted-foreground uppercase tracking-widest opacity-50">
              &copy; 2026 BK VISION SYS
            </div>
          </div>
        </div>

        {/* Right Content Area - Content Container */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-primary),transparent_30%)] opacity-[0.03] pointer-events-none" />
          <div className="flex-1 overflow-auto">
            {renderContent()}
          </div>
        </div>
      </div>
      
      <StatusBar />
    </div>
  );
};
