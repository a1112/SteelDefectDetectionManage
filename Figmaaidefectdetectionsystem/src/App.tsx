import { useEffect } from "react";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { BackendManagement } from "./pages/BackendManagement";
import TraditionalMode from "./pages/traditional/TraditionalMode";
import DownloadPage from "./pages/Download";
import ReportsRoute from "./pages/Reports";
import CacheDebug from "./pages/CacheDebug";
import TestModelPage from "./pages/TestModel";
import StatusCenterPage from "./pages/StatusCenter";
import { toast } from "sonner@2.0.3";
import { ThemeProvider } from "./components/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { isElectronRuntime, isTauriRuntime, isFileRuntime } from "./utils/runtime";

export default function App() {
  // 全局非阻塞错误处理
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global Error Caught:", event.error);
      toast.error("系统运行错误", {
        description: event.error?.message || "发生未知错误，请检查控制台。",
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled Rejection:", event.reason);
      toast.error("数据加载失败", {
        description: event.reason?.message || "后端接口未响应，请检查网络连接。",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  const isElectron = isElectronRuntime();
  const isTauri = isTauriRuntime();
  const isFileProtocol = isFileRuntime();
  const Router =
    isElectron || isTauri || isFileProtocol ? HashRouter : BrowserRouter;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/BackendManagement"
              element={<BackendManagement />}
            />
            <Route path="/TraditionalMode" element={<TraditionalMode />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/reports" element={<ReportsRoute />} />
            <Route path="/cache" element={<CacheDebug />} />
            <Route path="/test_model" element={<TestModelPage />} />
            <Route path="/status" element={<StatusCenterPage />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
