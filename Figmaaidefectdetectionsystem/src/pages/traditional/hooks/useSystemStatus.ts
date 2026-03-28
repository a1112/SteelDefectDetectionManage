import { useState, useCallback } from "react";
import { getApiList } from "../../../api/client";
import type { ApiNode } from "../../../api/types";

export interface SystemStatusState {
  apiNodes: ApiNode[];
  currentLine: string;
  currentLineKey: string;
  isDataSourceOpen: boolean;
}

export interface SystemStatusActions {
  setApiNodes: (nodes: ApiNode[]) => void;
  setCurrentLine: (line: string) => void;
  setCurrentLineKey: (key: string) => void;
  setIsDataSourceOpen: (open: boolean) => void;
  refreshDataSources: () => Promise<void>;
}

/**
 * 系统状态管理 Hook
 *
 * 负责数据源和系统状态管理
 */
export function useSystemStatus(
  env: any
): [SystemStatusState, SystemStatusActions] {
  const [apiNodes, setApiNodes] = useState<ApiNode[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [currentLineKey, setCurrentLineKey] = useState(() => {
    return env.getLineName?.() ?? "";
  });
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false);

  const refreshDataSources = useCallback(async () => {
    try {
      const nodesData = await getApiList().catch(() => []);
      setApiNodes(nodesData);
    } catch (error) {
      console.error("Failed to refresh data sources", error);
    }
  }, []);

  const state: SystemStatusState = {
    apiNodes,
    currentLine,
    currentLineKey,
    isDataSourceOpen,
  };

  const actions: SystemStatusActions = {
    setApiNodes,
    setCurrentLine,
    setCurrentLineKey,
    setIsDataSourceOpen,
    refreshDataSources,
  };

  return [state, actions];
}
