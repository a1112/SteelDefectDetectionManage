import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import type { Defect } from "../types/app.types";

export type AppTab =
  | "defects"
  | "images"
  | "plates"
  | "reports"
  | "settings"
  | "mockdata";

interface DefectToolbarProps {
  activeTab: AppTab;
  availableDefectTypes: string[];
  selectedDefectTypes: string[];
  activeDefects: Defect[];
  defectAccentMap: Record<string, string>;
  onToggleDefectType: (type: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectInverse: () => void;
}

export function DefectToolbar({
  activeTab,
  availableDefectTypes,
  selectedDefectTypes,
  activeDefects,
  defectAccentMap,
  onToggleDefectType,
  onSelectAll,
  onSelectNone,
  onSelectInverse,
}: DefectToolbarProps) {
  const shouldShowFilters =
    activeTab === "defects" || activeTab === "images";

  return (
    <div className="border-b border-border relative sm:px-4 sm:py-2 bg-card/50 shrink-0 px-[5px] py-[3px]">
      {shouldShowFilters && (
        <>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pr-10 sm:pr-12">
            {availableDefectTypes.map((type) => {
              const count = activeDefects.filter(
                (defect) => defect.type === type,
              ).length;
              const isSelected =
                selectedDefectTypes.includes(type);

              return (
                <label
                  key={type}
                  className="flex items-center gap-0.5 sm:gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                  title={`${type}: ${count}个`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleDefectType(type)}
                    style={{
                      accentColor: defectAccentMap[type] || "#3b82f6",
                    }}
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 cursor-pointer"
                  />
                  <span className="text-[10px] sm:text-xs font-medium text-foreground whitespace-nowrap">
                    {type}({count})
                  </span>
                </label>
              );
            })}
          </div>

          <div className="absolute top-1/2 right-2 sm:right-4 -translate-y-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center p-1.5 hover:bg-accent rounded transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSelectAll}>
                  全选
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSelectNone}>
                  全不选
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSelectInverse}>
                  反选
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
}
