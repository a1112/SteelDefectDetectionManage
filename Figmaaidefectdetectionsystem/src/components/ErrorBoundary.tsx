import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
          <div className="max-w-md w-full bg-destructive/5 border border-destructive/20 rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <h2 className="text-xl font-bold text-destructive">
                界面渲染出错
              </h2>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              应用程序遇到意外错误，无法显示界面。
            </p>

            <div className="bg-card p-3 rounded border border-border mb-4 overflow-auto max-h-[200px]">
              <code className="text-xs font-mono break-all text-destructive">
                {this.state.error?.toString()}
              </code>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
