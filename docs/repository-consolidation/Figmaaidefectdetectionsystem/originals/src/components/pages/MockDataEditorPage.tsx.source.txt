import { useState } from 'react';
import { Database, Save, RotateCcw, Plus, Trash2, AlertCircle } from 'lucide-react';

interface MockDataEditorPageProps {
  // 预留接口，后续可以传入 mock 数据的更新函数
}

export const MockDataEditorPage: React.FC<MockDataEditorPageProps> = () => {
  const [defectCount, setDefectCount] = useState(50);
  const [steelCount, setSteelCount] = useState(50);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = () => {
    setSaveStatus('saving');
    
    // 模拟保存延迟
    setTimeout(() => {
      setSaveStatus('saved');
      
      // 2秒后恢复
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 500);
  };

  const handleReset = () => {
    setDefectCount(50);
    setSteelCount(50);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 页面标题 */}
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-bold">测试数据编辑器</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              调整开发模式下的 Mock 数据生成参数
            </p>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 提示信息 */}
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-200">
              <p className="font-medium mb-1">开发模式专用功能</p>
              <p className="text-blue-300/80">
                此页面仅在开发模式下有效。修改这些参数将影响 Mock 数据的生成，
                帮助你测试不同数据量下的界面表现。生产模式下，数据由后端 API 提供。
              </p>
            </div>
          </div>

          {/* 缺陷数据配置 */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border">
              <h2 className="font-medium">缺陷数据配置</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-sm">每个钢板的缺陷数量</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    设置 Mock 数据中每个钢板生成的缺陷条目数量
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={defectCount}
                    onChange={(e) => setDefectCount(Math.max(0, Math.min(200, parseInt(e.target.value) || 0)))}
                    className="w-24 px-3 py-2 bg-background border border-border rounded text-center font-mono"
                    min="0"
                    max="200"
                  />
                  <span className="text-xs text-muted-foreground">条</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• 推荐范围：10-100 条</p>
                  <p>• 当前设置：{defectCount} 条缺陷数据</p>
                  <p>• 用途：测试缺陷列表的滚动性能和分页功能</p>
                </div>
              </div>
            </div>
          </div>

          {/* 钢板数据配置 */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border">
              <h2 className="font-medium">钢板数据配置</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-sm">钢板列表默认数量</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    设置初始加载时生成的钢板记录数量
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={steelCount}
                    onChange={(e) => setSteelCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                    className="w-24 px-3 py-2 bg-background border border-border rounded text-center font-mono"
                    min="1"
                    max="200"
                  />
                  <span className="text-xs text-muted-foreground">条</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• 推荐范围：20-100 条</p>
                  <p>• 当前设置：{steelCount} 条钢板记录</p>
                  <p>• 用途：测试钢板列表的筛选、搜索和滚动功能</p>
                </div>
              </div>
            </div>
          </div>

          {/* 数据质量配置（预留） */}
          <div className="bg-card border border-border rounded-lg overflow-hidden opacity-50">
            <div className="px-5 py-3 bg-muted/30 border-b border-border">
              <h2 className="font-medium">数据质量配置 <span className="text-xs text-muted-foreground ml-2">(即将推出)</span></h2>
            </div>
            <div className="p-5">
              <div className="text-xs text-muted-foreground space-y-2">
                <p>• 缺陷类型分布比例</p>
                <p>• 严重程度分布比例</p>
                <p>• 钢板等级分布比例</p>
                <p>• 自定义缺陷位置和大小范围</p>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted border border-border rounded transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">重置为默认值</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm">
                {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : '保存设置'}
              </span>
            </button>
          </div>

          {/* 说明文档 */}
          <div className="mt-8 p-5 bg-card/50 border border-border/50 rounded-lg">
            <h3 className="font-medium mb-3">使用说明</h3>
            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                <strong>1. 缺陷数据测试：</strong>
                增加缺陷数量可以测试列表滚动性能、统计图表的渲染效果，以及大数据量下的筛选功能。
              </p>
              <p>
                <strong>2. 钢板数据测试：</strong>
                增加钢板数量可以测试侧边栏的滚动、搜索和筛选功能的性能表现。
              </p>
              <p>
                <strong>3. 性能测试建议：</strong>
                对于滚动性能测试，建议设置 50-100 条数据；对于极限压力测试，可以尝试 150-200 条。
              </p>
              <p>
                <strong>4. 注意事项：</strong>
                修改这些参数后，需要刷新页面或重新选择钢板才能看到效果。数据量过大可能会影响浏览器性能。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
