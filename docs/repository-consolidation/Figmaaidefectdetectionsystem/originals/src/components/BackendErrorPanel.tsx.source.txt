import {
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Info,
} from "lucide-react";

interface BackendErrorPanelProps {
  error: string;
  onRetry?: () => void;
  onSwitchToDev?: () => void;
}

export function BackendErrorPanel({
  error,
  onRetry,
  onSwitchToDev,
}: BackendErrorPanelProps) {
  // 检测是否是 JSON 解析错误（通常意味着后端没运行）
  const isBackendDown =
    error.includes("JSON") || error.includes("HTML");

  return (
    <div className="p-6 bg-destructive/5 border-2 border-destructive/20 rounded-lg">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-8 h-8 text-destructive flex-shrink-0 mt-1" />

        <div className="flex-1 space-y-4">
          <div>
            <h3 className="font-bold text-destructive mb-2">
              无法连接到后端服务器
            </h3>
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
          </div>

          {isBackendDown && (
            <div className="bg-card border border-border rounded p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Info className="w-4 h-4" />
                <span className="font-semibold text-sm">
                  快速解决方案
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">
                    1.
                  </span>
                  <div>
                    <span className="font-semibold">
                      启动后端服务器：
                    </span>
                    <code className="block mt-1 px-2 py-1 bg-muted/50 rounded font-mono text-[10px]">
                      python run_server.bat
                    </code>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">
                    2.
                  </span>
                  <div>
                    <span className="font-semibold">
                      验证后端运行：
                    </span>
                    <a
                      href="http://localhost:8120/health"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 mt-1 text-primary hover:underline text-[10px]"
                    >
                      <span>http://localhost:8120/health</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">
                    3.
                  </span>
                  <div>
                    <span className="font-semibold">
                      点击下方"重试"按钮
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground">
                  💡 <span className="font-semibold">或者</span>
                  ，如果暂时不需要后端，可以切换到开发模式使用
                  Mock 数据继续开发
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                重试连接
              </button>
            )}

            {onSwitchToDev && (
              <button
                onClick={onSwitchToDev}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground hover:bg-accent/80 rounded transition-colors text-sm border border-border"
              >
                切换到开发模式
              </button>
            )}

            <a
              href="/BACKEND_CONNECTION_GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground hover:bg-muted/80 rounded transition-colors text-sm border border-border"
            >
              <Info className="w-4 h-4" />
              查看诊断指南
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}