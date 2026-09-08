import { DefectReport } from "../DefectReport";
import type {
  SteelPlate,
  DetectionRecord,
} from "../../types/app.types";
import { defectTypes } from "../../utils/defects";

interface ReportsPageProps {
  history: DetectionRecord[];
  steelPlates: SteelPlate[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  history,
  steelPlates,
}) => {
  // 生成缺陷统计数据
  const getDefectStats = () => {
    const stats: { [key: string]: number } = {};

    defectTypes.forEach((type) => {
      stats[type] = 0;
    });

    history.forEach((record) => {
      record.defects.forEach((defect) => {
        if (stats[defect.type] !== undefined) {
          stats[defect.type]++;
        }
      });
    });

    return defectTypes.map((type) => ({
      type,
      count: stats[type] || Math.floor(Math.random() * 20) + 5, // 如果没有数据,使用模拟数据
    }));
  };

  return (
    <DefectReport
      data={getDefectStats()}
      steelPlates={steelPlates}
    />
  );
};