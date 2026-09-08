/**
 * 开发/生产模式切换组件
 */

import { useState, useEffect } from "react";
import { env } from "../config/env";
import { getApiStatus } from "../api/client";
import { Code, Globe, AlertCircle, Server } from "lucide-react";

export function ModeSwitch() {
  const [mode, setMode] = useState(env.getMode());
  const [apiStatus, setApiStatus] = useState(getApiStatus());

  useEffect(() => {
    // 监听模式变更事件
    const handleModeChange = (e: CustomEvent) => {
      setMode(e.detail);
      setApiStatus(getApiStatus());
    };

    window.addEventListener(
      "app_mode_change",
      handleModeChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "app_mode_change",
        handleModeChange as EventListener,
      );
    };
  }, []);

  const handleToggle = (
    newMode: "development" | "production" | "cors",
  ) => {
    if (newMode !== mode) {
      env.setMode(newMode);
      setMode(newMode);
      setApiStatus(getApiStatus());
      if (window.confirm("API 模式已切换，刷新后生效，是否立即刷新？")) {
        window.location.reload();
      }
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Code className="w-5 h-5 text-primary" />
        <h3 className="font-medium">API 模式配置</h3>
      </div>

      {/* 模式切换按钮 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => handleToggle("development")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
            mode === "development"
              ? "bg-primary/10 border-primary text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          <Code className="w-5 h-5" />
          <div className="text-left">
            <div className="text-sm font-medium">开发模式</div>
            <div className="text-xs opacity-70">Mock 数据</div>
          </div>
        </button>

        <button
          onClick={() => handleToggle("production")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
            mode === "production"
              ? "bg-primary/10 border-primary text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          <Globe className="w-5 h-5" />
          <div className="text-left">
            <div className="text-sm font-medium">生产模式</div>
            <div className="text-xs opacity-70">真实 API</div>
          </div>
        </button>

        <button
          onClick={() => handleToggle("cors")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
            mode === "cors"
              ? "bg-primary/10 border-primary text-primary"
              : "bg-muted/30 border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          <Server className="w-5 h-5" />
          <div className="text-left">
            <div className="text-sm font-medium">跨域模式</div>
            <div className="text-xs opacity-70">远程 IP</div>
          </div>
        </button>
      </div>

      {/* 当前状态信息 */}
      <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${
              mode === "development"
                ? "bg-blue-500"
                : mode === "production"
                  ? "bg-green-500"
                  : "bg-purple-500"
            } animate-pulse`}
          ></div>
          <span className="text-muted-foreground">
            当前模式：
          </span>
          <span className="font-mono font-bold">
            {apiStatus.description}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            API 地址：
          </span>
          <span className="font-mono text-xs bg-background px-2 py-1 rounded border border-border break-all">
            {apiStatus.baseUrl}
          </span>
        </div>
      </div>

      {/* 警告提示 */}
      {(mode === "production" || mode === "cors") && (
        <div className={`flex items-start gap-2 border rounded-lg p-3 ${
          mode === "cors" 
            ? "bg-purple-500/10 border-purple-500/30" 
            : "bg-yellow-500/10 border-yellow-500/30"
        }`}>
          <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
            mode === "cors" ? "text-purple-500" : "text-yellow-500"
          }`} />
          <div className={`text-xs ${
            mode === "cors" ? "text-purple-200/90" : "text-yellow-200/90"
          }`}>
            <div className="font-medium mb-1">
              {mode === "cors" ? "跨域模式提醒" : "生产模式提醒"}
            </div>
            <div className="opacity-80">
              {mode === "cors" 
                ? "将直接连接到远程服务器 IP。请确保网络连通且目标服务器允许跨域请求 (CORS)。"
                : "当前将连接到真实后端 API。请确保后端服务已启动并运行在正确的端口。"
              }
            </div>
          </div>
        </div>
      )}

      {mode === "development" && (
        <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-200/90">
            <div className="font-medium mb-1">开发模式提醒</div>
            <div className="opacity-80">
              当前使用模拟数据进行开发测试。所有数据都是随机生成的，不会保存到后端数据库。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}