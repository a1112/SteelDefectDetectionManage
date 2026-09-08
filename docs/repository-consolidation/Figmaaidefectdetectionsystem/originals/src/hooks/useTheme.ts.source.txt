import { useState, useEffect } from "react";
import type { Theme } from "../types/app.types";

/**
 * 主题管理 Hook
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>("dark");

  // 应用主题到 document.documentElement
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return { theme, setTheme };
};