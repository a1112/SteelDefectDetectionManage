import {
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Surface } from "../api/types";

interface DefectNavigationBarProps {
  defects: Array<{ id: string; surface: Surface }>;
  selectedDefectId: string | null;
  selectedDefectSurface?: Surface | null;
  onDefectSelect: (id: string | null) => void;
  onDefectSelectDetail?: (defect: { id: string; surface: Surface } | null) => void;
  className?: string;
}

export function DefectNavigationBar({
  defects,
  selectedDefectId,
  selectedDefectSurface,
  onDefectSelect,
  onDefectSelectDetail,
  className = "",
}: DefectNavigationBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  // 获取当前选中缺陷的索引
  const currentIndex = selectedDefectId
    ? defects.findIndex(
        (d) =>
          d.id === selectedDefectId &&
          (selectedDefectSurface ? d.surface === selectedDefectSurface : true),
      )
    : -1;

  const totalDefects = defects.length;

  // 导航函数
  const goToFirst = () => {
    if (defects.length > 0) {
      onDefectSelectDetail?.(defects[0]);
      onDefectSelect(defects[0].id);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      onDefectSelectDetail?.(defects[currentIndex - 1]);
      onDefectSelect(defects[currentIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (currentIndex < totalDefects - 1) {
      onDefectSelectDetail?.(defects[currentIndex + 1]);
      onDefectSelect(defects[currentIndex + 1].id);
    } else if (isPlaying) {
      // 如果正在播放，循环到第一个
      goToFirst();
    }
  };

  // 自动播放逻辑
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        goToNext();
      }, 2000); // 每2秒切换一次

      return () => {
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current);
        }
      };
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
  }, [isPlaying, currentIndex, totalDefects]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  if (totalDefects === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 border-t border-border ${className}`}
    >
      {/* 左侧：缺陷计数 */}
      <div className="text-xs text-muted-foreground">
        {currentIndex >= 0 ? (
          <span>
            {currentIndex + 1} / {totalDefects}
          </span>
        ) : (
          <span>{totalDefects} 个缺陷</span>
        )}
      </div>

      {/* 中间：导航按钮 */}
      <div className="flex items-center gap-1">
        {/* 回到第一个 */}
        <button
          onClick={goToFirst}
          disabled={currentIndex <= 0}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="回到第一个"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* 上一个 */}
        <button
          onClick={goToPrevious}
          disabled={currentIndex <= 0}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="上一个缺陷"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 自动播放 */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-1.5 rounded hover:bg-muted transition-colors ${
            isPlaying ? "bg-primary/20 text-primary" : ""
          }`}
          title={isPlaying ? "暂停播放" : "自动播放"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        {/* 下一个 */}
        <button
          onClick={goToNext}
          disabled={currentIndex >= totalDefects - 1}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="下一个缺陷"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 右侧：占位，保持对称 */}
      <div className="w-16"></div>
    </div>
  );
}
