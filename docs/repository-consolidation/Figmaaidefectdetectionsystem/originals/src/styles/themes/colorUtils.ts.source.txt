/**
 * 颜色转换工具函数
 */

/**
 * 将 HEX 颜色转换为 HSL 组件字符串
 * @param hex - HEX 颜色值 (#RGB 或 #RRGGBB)
 * @returns HSL 字符串格式 "h s% l%"
 */
export function hexToHslComponents(hex: string): string {
  let r = 0, g = 0, b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return "0 0% 0%"; // 默认黑色
  }

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * 将 HEX 颜色转换为 HSL 带透明度
 * @param hex - HEX 颜色值
 * @param alpha - 透明度 0-1
 * @returns HSLA 字符串格式 "h s% l% / a%"
 */
export function hexToHsla(hex: string, alpha: number = 1): string {
  const hsl = hexToHslComponents(hex);
  return `${hsl} / ${Math.round(alpha * 100)}%`;
}

/**
 * 将 HEX 颜色转换为 RGB
 * @param hex - HEX 颜色值
 * @returns RGB 字符串格式 "rgb(r, g, b)"
 */
export function hexToRgb(hex: string): string {
  let r = 0, g = 0, b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 创建颜色值对象
 * @param hex - HEX 颜色值
 * @returns ColorValue 对象
 */
export function createColorValue(hex: string): import("./types").ColorValue {
  return {
    hex,
    hsl: hexToHslComponents(hex),
    rgb: hexToRgb(hex),
  };
}

/**
 * 调整颜色亮度
 * @param hex - HEX 颜色值
 * @param amount - 调整量 -1 到 1
 * @returns 新的 HEX 颜色值
 */
export function adjustBrightness(hex: string, amount: number): string {
  let r = 0, g = 0, b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }

  r = Math.min(255, Math.max(0, r + amount * 255));
  g = Math.min(255, Math.max(0, g + amount * 255));
  b = Math.min(255, Math.max(0, b + amount * 255));

  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 判断颜色是深色还是浅色
 * @param hex - HEX 颜色值
 * @returns true 表示深色，false 表示浅色
 */
export function isDarkColor(hex: string): boolean {
  let r = 0, g = 0, b = 0;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }

  // 计算亮度 (YIQ 颜色空间)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

/**
 * 应用 CSS 变量到根元素
 * @param variables - CSS 变量键值对
 */
export function applyCSSVariables(variables: Record<string, string>): void {
  const root = document.documentElement;
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * 清除 CSS 变量
 * @param keys - 要清除的 CSS 变量键数组
 */
export function clearCSSVariables(keys: string[]): void {
  const root = document.documentElement;
  keys.forEach(key => {
    root.style.removeProperty(key);
  });
}
