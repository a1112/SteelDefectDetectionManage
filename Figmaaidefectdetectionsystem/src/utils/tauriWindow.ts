export type TauriWindowLike = {
  startDragging: () => Promise<void> | void;
  minimize: () => Promise<void> | void;
  toggleMaximize: () => Promise<void> | void;
  isMaximized: () => Promise<boolean> | boolean;
  close: () => Promise<void> | void;
};

const getTauriWindow = async (): Promise<TauriWindowLike | null> => {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const tauri = w.__TAURI__;
  if (tauri?.webviewWindow?.getCurrentWebviewWindow) {
    return tauri.webviewWindow.getCurrentWebviewWindow();
  }
  if (tauri?.window?.getCurrentWindow) {
    return tauri.window.getCurrentWindow();
  }
  const internals = w.__TAURI_INTERNALS__;
  const currentLabel = internals?.metadata?.currentWindow?.label;
  if (internals?.invoke && currentLabel) {
    const invokeWindow = (command: string) =>
      internals.invoke(`plugin:window|${command}`, {
        label: currentLabel,
      });
    return {
      startDragging: () => invokeWindow("start_dragging"),
      minimize: () => invokeWindow("minimize"),
      toggleMaximize: () => invokeWindow("toggle_maximize"),
      isMaximized: () => invokeWindow("is_maximized"),
      close: () => invokeWindow("close"),
    };
  }
  try {
    const mod = await import("@tauri-apps/api/window");
    if (mod?.appWindow) return mod.appWindow as TauriWindowLike;
    if (typeof mod?.getCurrent === "function") {
      return mod.getCurrent() as TauriWindowLike;
    }
  } catch {
    // Ignore missing API in non-Tauri runtimes.
  }
  return null;
};

export const withTauriWindow = async (
  action: (appWindow: TauriWindowLike) => Promise<void> | void,
): Promise<void> => {
  const win = await getTauriWindow();
  if (!win) return;
  await action(win);
};
