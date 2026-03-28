import { useState, useCallback, useRef } from "react";

export interface ImageNavigationState {
  imgScale: number;
  imgOffset: { x: number; y: number };
  isPanning: boolean;
  panStart: { x: number; y: number };
  topViewportRef: React.MutableRefObject<{ x: number; y: number; width: number; height: number } | null>;
  bottomViewportRef: React.MutableRefObject<{ x: number; y: number; width: number; height: number } | null>;
  topScaleRef: React.MutableRefObject<number>;
  bottomScaleRef: React.MutableRefObject<number>;
  syncLockRef: React.MutableRefObject<boolean>;
  isAnalysisSyncEnabled: boolean;
  isWidthLockEnabled: boolean;
  topForcedScale: number | null;
  bottomForcedScale: number | null;
  selectedDefectId: string | null;
  topCenterTarget: { x: number; y: number } | null;
  bottomCenterTarget: { x: number; y: number } | null;
}

export interface ImageNavigationActions {
  setImgScale: (scale: number) => void;
  setImgOffset: (offset: { x: number; y: number }) => void;
  setIsPanning: (panning: boolean) => void;
  setPanStart: (start: { x: number; y: number }) => void;
  setIsAnalysisSyncEnabled: (enabled: boolean) => void;
  setIsWidthLockEnabled: (enabled: boolean) => void;
  setTopForcedScale: (scale: number | null) => void;
  setBottomForcedScale: (scale: number | null) => void;
  setSelectedDefectId: (id: string | null) => void;
  setTopCenterTarget: (target: { x: number; y: number } | null) => void;
  setBottomCenterTarget: (target: { x: number; y: number } | null) => void;
  resetZoom: () => void;
  centerOnDefect: (defect: any, surface: "top" | "bottom") => void;
}

/**
 * 图像导航 Hook
 *
 * 负责图像缩放、平移、同步等导航功能
 */
export function useImageNavigation(): [ImageNavigationState, ImageNavigationActions] {
  const [imgScale, setImgScale] = useState(1);
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [topCenterTarget, setTopCenterTarget] = useState<{ x: number; y: number } | null>(null);
  const [bottomCenterTarget, setBottomCenterTarget] = useState<{ x: number; y: number } | null>(null);
  const topViewportRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const bottomViewportRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const topScaleRef = useRef<number>(1);
  const bottomScaleRef = useRef<number>(1);
  const syncLockRef = useRef(false);
  const [isAnalysisSyncEnabled, setIsAnalysisSyncEnabled] = useState(true);
  const [isWidthLockEnabled, setIsWidthLockEnabled] = useState(true);
  const [topForcedScale, setTopForcedScale] = useState<number | null>(null);
  const [bottomForcedScale, setBottomForcedScale] = useState<number | null>(null);

  const resetZoom = useCallback(() => {
    setImgScale(1);
    setImgOffset({ x: 0, y: 0 });
    setTopForcedScale(null);
    setBottomForcedScale(null);
  }, []);

  const centerOnDefect = useCallback((defect: any, surface: "top" | "bottom") => {
    const target = { x: defect.x, y: defect.y };
    if (surface === "top") {
      setTopCenterTarget(target);
    } else {
      setBottomCenterTarget(target);
    }
    setSelectedDefectId(defect.id || null);
    setImgScale(1);
    setImgOffset({ x: 0, y: 0 });
  }, []);

  const state: ImageNavigationState = {
    imgScale,
    imgOffset,
    isPanning,
    panStart,
    topViewportRef,
    bottomViewportRef,
    topScaleRef,
    bottomScaleRef,
    syncLockRef,
    isAnalysisSyncEnabled,
    isWidthLockEnabled,
    topForcedScale,
    bottomForcedScale,
    selectedDefectId,
    topCenterTarget,
    bottomCenterTarget,
  };

  const actions: ImageNavigationActions = {
    setImgScale,
    setImgOffset,
    setIsPanning,
    setPanStart,
    setIsAnalysisSyncEnabled,
    setIsWidthLockEnabled,
    setTopForcedScale,
    setBottomForcedScale,
    setSelectedDefectId,
    setTopCenterTarget,
    setBottomCenterTarget,
    resetZoom,
    centerOnDefect,
  };

  return [state, actions];
}
