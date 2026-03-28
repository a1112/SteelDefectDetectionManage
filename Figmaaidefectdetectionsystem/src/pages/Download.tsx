import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Monitor,
  Laptop,
  Apple,
  Smartphone,
  Loader2,
  Package,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  getDownloadInfo,
  type DownloadBuild,
  type DownloadInfo,
  type DownloadPlatform,
} from "../api/admin";

const platformIcons: Record<string, ReactNode> = {
  windows: <Monitor className="w-5 h-5" />,
  linux: <Laptop className="w-5 h-5" />,
  macos: <Apple className="w-5 h-5" />,
  android: <Smartphone className="w-5 h-5" />,
  ios: <Smartphone className="w-5 h-5" />,
};

const platformAccent: Record<string, string> = {
  windows: "from-sky-400/20 to-cyan-400/10",
  linux: "from-emerald-400/20 to-lime-400/10",
  macos: "from-neutral-400/20 to-zinc-400/10",
  android: "from-green-400/20 to-emerald-400/10",
  ios: "from-slate-400/20 to-indigo-400/10",
};

const sortByVersion = (builds: DownloadBuild[]) => {
  return [...builds].sort((a, b) => {
    if (a.version === b.version) return 0;
    return a.version > b.version ? -1 : 1;
  });
};

export default function DownloadPage() {
  const navigate = useNavigate();
  const [info, setInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] =
    useState<DownloadPlatform | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage(null);
    getDownloadInfo()
      .then((payload) => {
        if (!active) return;
        setInfo(payload);
        setSelectedVersion(payload.latest_version || "");
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(
          error instanceof Error ? error.message : "下载信息加载失败",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const versionOptions = useMemo(() => {
    if (!info) return [];
    const versions = info.history_versions?.length
      ? info.history_versions
      : Array.from(
          new Set(
            info.platforms.flatMap((platform) =>
              platform.builds.map((build) => build.version),
            ),
          ),
        );
    return versions.sort((a, b) => (a > b ? -1 : 1));
  }, [info]);

  const buildsForSelectedVersion = useMemo(() => {
    if (!selectedPlatform) return [];
    const targetVersion = selectedVersion || selectedPlatform.latest_version;
    const builds = targetVersion
      ? selectedPlatform.builds.filter(
          (build) => build.version === targetVersion,
        )
      : selectedPlatform.builds;
    return sortByVersion(builds);
  }, [selectedPlatform, selectedVersion]);

  const openPlatform = (platform: DownloadPlatform) => {
    setSelectedPlatform(platform);
    const nextVersion =
      platform.latest_version ||
      info?.latest_version ||
      versionOptions[0] ||
      "";
    setSelectedVersion(nextVersion);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden border-b border-border bg-card/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-primary),transparent_45%)] opacity-[0.08]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
              title="返回主界面"
            >
              <ArrowLeft className="h-4 w-4" />
              返回主界面
            </button>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              下载中心 / Release Hub
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Defect Detection Suite
              </p>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                下载与部署中心
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                获取适配各平台的最新构建版本，查看历史版本与系统要求。
                {info?.latest_version
                  ? ` 当前最新版本：${info.latest_version}`
                  : " 当前暂无可用版本。"}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1">
                  版本历史：{info?.history_versions?.length || 0} 个
                </span>
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1">
                  更新时间：{info?.updated_at || "未同步"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-lg">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <Package className="h-4 w-4 text-primary" />
                下载说明
              </div>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li>下载包按版本归档，支持离线部署。</li>
                <li>构建列表基于服务器资源目录自动生成。</li>
                <li>如需私有发行版，请联系管理员同步。</li>
              </ul>
              {errorMessage && (
                <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  {errorMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading && (
            <div className="col-span-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card/40 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载下载信息...
            </div>
          )}
          {!loading &&
            info?.platforms.map((platform) => (
              <div
                key={platform.key}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg ${platform.supported ? "" : "opacity-60"}`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${platformAccent[platform.key] || "from-primary/10 to-transparent"} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {platformIcons[platform.key] || (
                      <Monitor className="h-5 w-5" />
                    )}
                    {platform.label}
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      platform.supported
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-border bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {platform.supported ? "已支持" : "敬请期待"}
                  </span>
                </div>
                <p className="relative mt-3 text-xs text-muted-foreground">
                  最新版本：{platform.latest_version || info?.latest_version || "-"}
                </p>
                <p className="relative mt-1 text-xs text-muted-foreground">
                  构建数量：{platform.builds.length} 个
                </p>
                <button
                  className={`relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    platform.supported
                      ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                  disabled={!platform.supported}
                  onClick={() => openPlatform(platform)}
                >
                  <Download className="h-4 w-4" />
                  获取下载
                </button>
              </div>
            ))}
        </div>
      </div>

      <Dialog
        open={!!selectedPlatform}
        onOpenChange={(open) => {
          if (!open) setSelectedPlatform(null);
        }}
      >
        <DialogContent className="max-w-[720px] bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {selectedPlatform?.label} 下载
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              请选择版本与构建包，并确认系统要求。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  版本选择
                </p>
                <Select
                  value={selectedVersion}
                  onValueChange={setSelectedVersion}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择版本" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionOptions.map((version) => (
                      <SelectItem key={version} value={version}>
                        {version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  系统要求
                </p>
                <div className="rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                  <ul className="space-y-1">
                    {selectedPlatform?.requirements?.length ? (
                      selectedPlatform.requirements.map((item) => (
                        <li key={item}>• {item}</li>
                      ))
                    ) : (
                      <li>暂无系统要求信息</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                构建列表
              </p>
              <div className="space-y-2">
                {buildsForSelectedVersion.length === 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                    当前版本暂无可用构建包
                  </div>
                )}
                {buildsForSelectedVersion.map((build) => (
                  <div
                    key={`${build.version}-${build.file_name}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold">{build.label}</div>
                      <div className="text-muted-foreground">
                        {build.file_name} · {build.size_display}
                      </div>
                      {build.released_at && (
                        <div className="text-muted-foreground">
                          发布时间：{build.released_at}
                        </div>
                      )}
                    </div>
                    <a
                      href={build.download_url}
                      className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                    >
                      <Download className="h-4 w-4" />
                      立即下载
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
