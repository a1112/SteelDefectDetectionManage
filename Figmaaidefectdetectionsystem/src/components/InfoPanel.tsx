import React, { useEffect, useMemo, useState } from "react";
import { Building2, Database, Link2, Server } from "lucide-react";
import type { ApiNode } from "../api/types";
import { env } from "../config/env";
import { getConfigMate, type ConfigMatePayload } from "../api/admin";

interface InfoPanelProps {
  variant?: "traditional" | "modern";
  lineKey?: string;
  apiNodes?: ApiNode[];
  companyName?: string;
}

const displayValue = (value: unknown, fallback = "--") =>
  value === null || value === undefined || value === "" ? fallback : String(value);

export function InfoPanel({
  variant = "modern",
  lineKey,
  apiNodes = [],
  companyName,
}: InfoPanelProps) {
  const [loading, setLoading] = useState(false);
  const [configMate, setConfigMate] = useState<ConfigMatePayload | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [apiMeta, setApiMeta] = useState<{
    frameWidth?: number | null;
    frameHeight?: number | null;
    orgWidth?: number | null;
    orgHeight?: number | null;
    tileSize?: number | null;
    tileMaxLevel?: number | null;
  } | null>(null);

  const resolvedLineKey = lineKey || (env as any).getLineName?.() || "";

  const resolveBasePath = () => {
    const node = apiNodes.find(
      (item) =>
        (item as any).key === resolvedLineKey ||
        (item as any).line_key === resolvedLineKey,
    );
    const nodePath = (node as any)?.path;
    if (typeof nodePath === "string" && nodePath.trim()) {
      return nodePath;
    }
    if (resolvedLineKey) {
      return `/api/${encodeURIComponent(resolvedLineKey)}`;
    }
    const apiBaseUrl = env.getApiBaseUrl();
    if (apiBaseUrl) {
      const match = apiBaseUrl.match(/https?:\/\/[^/]+(\/.*)$/);
      return match ? match[1] : apiBaseUrl;
    }
    return "/api";
  };

  const resolveServerUrl = () => {
    const apiBaseUrl = env.getApiBaseUrl();
    if (apiBaseUrl && /^https?:\/\//.test(apiBaseUrl)) {
      return apiBaseUrl.replace(/\/api.*/, "");
    }
    const configBaseUrl = env.getConfigBaseUrl();
    if (configBaseUrl) {
      return configBaseUrl.replace(/\/+$/, "");
    }
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://127.0.0.1";
  };

  const serverUrl = resolveServerUrl();
  const basePath = resolveBasePath();
  const healthUrl = `${serverUrl.replace(/\/+$/, "")}${basePath}/health`;
  const imageScale = env.getImageScale();

  useEffect(() => {
    let active = true;
    const loadInfo = async () => {
      setLoading(true);
      const fetchJson = async (url: string) => {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Non-JSON response");
        }
        return response.json();
      };

      const [mate, health, meta] = await Promise.all([
        getConfigMate().catch(() => null),
        fetchJson(`${serverUrl}${basePath}/health`).catch(() => null),
        fetchJson(`${serverUrl}${basePath}/meta`).catch(() => null),
      ]);

      if (!active) return;
      if (mate) {
        setConfigMate(mate);
      }
      setServerTime(health?.timestamp ?? null);
      setApiMeta({
        frameWidth: meta?.image?.frame_width ?? meta?.image?.frameWidth ?? null,
        frameHeight: meta?.image?.frame_height ?? meta?.image?.frameHeight ?? null,
        orgWidth: meta?.image?.org_width ?? meta?.image?.orgWidth ?? null,
        orgHeight: meta?.image?.org_height ?? meta?.image?.orgHeight ?? null,
        tileSize: meta?.tile?.default_tile_size ?? meta?.tile?.tile_size ?? null,
        tileMaxLevel: meta?.tile?.max_level ?? null,
      });
      setLoading(false);
    };

    void loadInfo();
    return () => {
      active = false;
    };
  }, [serverUrl, basePath]);

  const company = useMemo(() => {
    const name =
      configMate?.meta?.company_name ||
      companyName ||
      "北京科技大学设计研究院有限公司";
    return {
      name,
      description: "面向钢板表面缺陷检测的智能识别与质量分析平台。",
      copyright: `© ${new Date().getFullYear()} ${name}`,
      license: "未提供",
      website: "https://iet.ustb.edu.cn",
    };
  }, [configMate, companyName]);

  const colors =
    variant === "traditional"
      ? {
          card: "bg-[#0d1117]/70 border-[#30363d] text-[#c9d1d9]",
          label: "text-[#8b949e]",
          accent: "text-[#58a6ff]",
          header: "text-[#8b949e]",
        }
      : {
          card: "bg-muted/30 border-border text-foreground",
          label: "text-muted-foreground",
          accent: "text-primary",
          header: "text-muted-foreground",
        };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`border rounded-md p-4 space-y-3 ${colors.card}`}>
          <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight ${colors.header}`}>
            <Server className={`w-3.5 h-3.5 ${colors.accent}`} />
            Server信息
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between gap-3">
              <span className={colors.label}>服务地址</span>
              <span className="font-mono break-all">{displayValue(serverUrl)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>服务版本</span>
              <span className="font-mono">{displayValue(configMate?.meta?.service_version)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>UI版本</span>
              <span className="font-mono">{displayValue(configMate?.meta?.ui_version)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>服务器时间</span>
              <span className="font-mono">{displayValue(serverTime)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>运行时长</span>
              <span className="font-mono">{displayValue(null, "未提供")}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>连接模式</span>
              <span className="font-mono">{displayValue(configMate?.meta?.connection_mode)}</span>
            </div>
          </div>
        </div>

        <div className={`border rounded-md p-4 space-y-3 ${colors.card}`}>
          <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight ${colors.header}`}>
            <Database className={`w-3.5 h-3.5 ${colors.accent}`} />
            API信息
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between gap-3">
              <span className={colors.label}>产线</span>
              <span className="font-mono">{displayValue(resolvedLineKey || "--")}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>视图</span>
              <span className="font-mono">{Math.round(imageScale * 100)}%</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>健康地址</span>
              <span className="font-mono break-all">{displayValue(healthUrl)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>图像尺寸</span>
              <span className="font-mono">
                {displayValue(apiMeta?.frameWidth)} × {displayValue(apiMeta?.frameHeight)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>原图尺寸</span>
              <span className="font-mono">
                {displayValue(apiMeta?.orgWidth)} × {displayValue(apiMeta?.orgHeight)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>瓦片大小</span>
              <span className="font-mono">{displayValue(apiMeta?.tileSize)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>最大瓦片级别</span>
              <span className="font-mono">{displayValue(apiMeta?.tileMaxLevel)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`border rounded-md p-4 space-y-3 ${colors.card}`}>
        <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight ${colors.header}`}>
          <Building2 className={`w-3.5 h-3.5 ${colors.accent}`} />
          公司信息
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-[11px]">
          <div className="space-y-2">
            <div className="flex justify-between gap-3">
              <span className={colors.label}>公司</span>
              <span className="font-mono">{company.name}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>授权状态</span>
              <span className="font-mono">{company.license}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className={colors.label}>版权</span>
              <span className="font-mono">{company.copyright}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className={colors.label}>简介</div>
            <div className="leading-relaxed">{company.description}</div>
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 ${colors.accent}`}
            >
              <Link2 className="w-3 h-3" />
              {company.website}
            </a>
          </div>
        </div>
      </div>

      <div className={`text-[10px] ${colors.label}`}>
        {loading ? "正在刷新信息..." : "信息来源：config/mate 与 api/health, api/meta"}
      </div>
    </div>
  );
}
