export {};

declare global {
  interface Window {
    electronWindow?: {
      minimize: () => void;
      toggleMaximize: () => Promise<boolean>;
      close: () => void;
      isMaximized: () => Promise<boolean>;
    };
  }
}
