export const isElectronRuntime = (): boolean => {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).electronWindow);
};

export const isTauriRuntime = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as any;
  if (w.__TAURI__ || w.__TAURI_INTERNALS__ || w.__TAURI_METADATA__) {
    return true;
  }
  const protocol = window.location?.protocol;
  if (protocol === "tauri:" || protocol === "asset:") {
    return true;
  }
  const host = window.location?.hostname;
  if (host === "tauri.localhost") {
    return true;
  }
  const ua = navigator?.userAgent?.toLowerCase();
  return Boolean(ua && ua.includes("tauri"));
};

export const isFileRuntime = (): boolean => {
  return typeof window !== "undefined" && window.location.protocol === "file:";
};

export const isDesktopRuntime = (): boolean => {
  return isFileRuntime() || isElectronRuntime() || isTauriRuntime();
};
