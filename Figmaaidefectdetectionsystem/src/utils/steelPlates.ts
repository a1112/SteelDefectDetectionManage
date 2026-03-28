// 钢板相关工具函数

// 等级映射函数
export const getLevelText = (
  level: "A" | "B" | "C" | "D",
): string => {
  const levelMap = {
    A: "一等品",
    B: "二等品",
    C: "三等品",
    D: "等外品",
  };
  return levelMap[level];
};