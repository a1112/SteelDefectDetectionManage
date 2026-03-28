import { isDesktopRuntime, isFileRuntime } from "../utils/runtime";

/**
 * 环境配置
 * 用于切换开发模式（Mock数据）和生产模式（真实API）
 */

export type AppMode = "development" | "production" | "cors";
export type ImageScale = 0.25 | 0.5 | 0.75 | 1;
const LINE_COOKIE = "line_name";
const DEFAULT_CORS_BASE_URL = "http://9qwygl8e.zjz-service.cn:80";
const DEFAULT_LOCAL_BASE_URL = "http://127.0.0.1:80";
const PRODUCTION_BASE_URL_KEY = "production_base_url";
const IMAGE_SCALE_KEY = "image_scale";
const DEFAULT_IMAGE_SCALE: ImageScale = 1;

// 从 localStorage 读取用户偏好，默认为开发模式
const getInitialMode = (): AppMode => {
  const stored = localStorage.getItem("app_mode") as AppMode;
  return ["development", "production", "cors"].includes(stored)
    ? stored
    : "development";
};

// 从 localStorage 读取 image scale（标准 ），默认为 default
const normalizeImageScale = (value: unknown): ImageScale => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (parsed === 0.25 || parsed === 0.5 || parsed === 0.75 || parsed === 1) {
    return parsed;
  }
  return DEFAULT_IMAGE_SCALE;
};

const getInitialImageScale = (): ImageScale => {
  const stored = localStorage.getItem(IMAGE_SCALE_KEY);
  return normalizeImageScale(stored);
};

const getInitialCorsBaseUrl = (): string => {
  const stored = localStorage.getItem("cors_base_url");
  return stored && stored.trim() ? stored.trim() : DEFAULT_CORS_BASE_URL;
};

const getInitialProductionBaseUrl = (): string => {
  const stored = localStorage.getItem(PRODUCTION_BASE_URL_KEY);
  return stored && stored.trim()
    ? stored.trim()
    : DEFAULT_LOCAL_BASE_URL;
};

const getCookieValue = (name: string): string | null => {
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const cookie of cookies) {
    const [rawKey, ...rest] = cookie.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
};

const setCookieValue = (name: string, value: string, days: number = 30): void => {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

const clearCookieValue = (name: string): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

const getInitialLineName = (): string => {
  return getCookieValue(LINE_COOKIE) || "";
};

class EnvironmentConfig {
  private mode: AppMode;
  private lineName: string;
  private corsBaseUrl: string;
  private productionBaseUrl: string;
  private imageScale: ImageScale;

  constructor() {
    this.mode = getInitialMode();
    this.lineName = getInitialLineName();
    this.corsBaseUrl = getInitialCorsBaseUrl();
    this.productionBaseUrl = getInitialProductionBaseUrl();
    this.imageScale = getInitialImageScale();
  }

  private isDesktopShell(): boolean {
    return isDesktopRuntime();
  }

  isFileProtocol(): boolean {
    return isFileRuntime();
  }

  /**
   * 获取当前模式
   */
  getMode(): AppMode {
    return this.mode;
  }

  /**
   * 设置模式并持久化
   */
  setMode(mode: AppMode): void {
    this.mode = mode;
    localStorage.setItem("app_mode", mode);
    // 触发自定义事件，让组件知道模式已变更
    window.dispatchEvent(
      new CustomEvent("app_mode_change", { detail: mode }),
    );
  }

  /**
   * 获取当前 image scale（标准  实例）
   */
  getImageScale(): ImageScale {
    return this.imageScale;
  }

  setImageScale(scale: number): void {
    const normalized = normalizeImageScale(scale);
    this.imageScale = normalized;
    localStorage.setItem(IMAGE_SCALE_KEY, String(normalized));
    window.dispatchEvent(
      new CustomEvent("image_scale_change", {
        detail: normalized,
      }),
    );
  }

  getLineName(): string {
    return this.lineName;
  }

  setLineName(name: string): void {
    this.lineName = name;
    if (name) {
      setCookieValue(LINE_COOKIE, name);
    } else {
      clearCookieValue(LINE_COOKIE);
    }
    window.dispatchEvent(
      new CustomEvent("line_change", {
        detail: name,
      }),
    );
  }

  /**
   * 是否为开发模式
   */
  isDevelopment(): boolean {
    return this.mode === "development";
  }

  /**
   * 是否为生产模式 (连接真实后端，包括本地生产和跨域模式)
   */
  isProduction(): boolean {
    return this.mode === "production" || this.mode === "cors";
  }

  getCorsBaseUrl(): string {
    return this.corsBaseUrl;
  }

  setCorsBaseUrl(url: string): void {
    this.corsBaseUrl = url.trim();
    localStorage.setItem("cors_base_url", this.corsBaseUrl);
    window.dispatchEvent(
      new CustomEvent("cors_base_url_change", { detail: this.corsBaseUrl }),
    );
  }

  getProductionBaseUrl(): string {
    return this.productionBaseUrl;
  }

  setProductionBaseUrl(url: string): void {
    const normalized = url.trim();
    this.productionBaseUrl = normalized || DEFAULT_LOCAL_BASE_URL;
    localStorage.setItem(
      PRODUCTION_BASE_URL_KEY,
      this.productionBaseUrl,
    );
    window.dispatchEvent(
      new CustomEvent("production_base_url_change", {
        detail: this.productionBaseUrl,
      }),
    );
  }

  private getCorsApiBaseUrl(): string {
    const raw = this.corsBaseUrl.trim();
    if (!raw) {
      return `${DEFAULT_CORS_BASE_URL}/api`;
    }
    if (raw.endsWith("/api")) {
      return raw;
    }
    if (raw.endsWith("/api/")) {
      return raw.slice(0, -1);
    }
    return `${raw.replace(/\/+$/, "")}/api`;
  }

  private getLocalBaseUrl(): string {
    const raw = (this.productionBaseUrl || DEFAULT_LOCAL_BASE_URL).trim();
    return raw.replace(/\/+$/, "") || DEFAULT_LOCAL_BASE_URL;
  }

  getConfigBaseUrl(): string {
    if (this.mode === "cors") {
      return this.getCorsBaseUrl().replace(/\/+$/, "");
    }
    // 本地开发环境使用相对路径，通过 Vite 代理
    if (typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
         window.location.hostname === "127.0.0.1" ||
         window.location.hostname === "::1")) {
      return "";
    }
    if (this.mode === "development") {
      return "";
    }
    if (this.isDesktopShell()) {
      return this.getLocalBaseUrl();
    }
    return "";
  }

  /**
   * 获取 API 基础路径
   */
  getApiBaseUrl(): string {
    // 跨域模式优先：必须使用远程地址，不能被 localhost 分支覆盖
    if (this.mode === "cors") {
      const base = this.getCorsApiBaseUrl();
      if (this.lineName) {
        return `${base}/${encodeURIComponent(this.lineName)}`;
      }
      return base;
    }
    // 本地开发环境使用相对路径，通过 Vite 代理
    if (typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
         window.location.hostname === "127.0.0.1" ||
         window.location.hostname === "::1")) {
      return "/api";  // 返回 /api 以触发 Vite 代理
    }
    // 开发模式使用 mock
    if (this.mode === "development") {
      return "";
    }

    // Windows + nginx 测试环境下：
    const basePath = "/api/test";
    if (this.isDesktopShell()) {
      return `${this.getLocalBaseUrl()}${basePath}`;
    }
    return basePath;
  }
}

export const env = new EnvironmentConfig();
