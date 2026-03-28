import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { globalPreheatManager } from '../utils/tilePreheatManager';
import { preheatTiles, preheatAdjacentTiles } from '../api/client';
import type { Surface } from '../api/types';

export const TilePreheatTest: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(globalPreheatManager.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addTestResult = (testName: string, result: any) => {
    setTestResults(prev => [...prev, {
      test: testName,
      timestamp: new Date().toLocaleTimeString(),
      result,
    }]);
  };

  const testBasicPreheat = async () => {
    setIsTestRunning(true);
    try {
      const result = await preheatTiles({
        surface: 'top',
        seqNo: 12345,
        tiles: [
          { level: 0, tileX: 0, tileY: 0 },
          { level: 0, tileX: 1, tileY: 0 },
          { level: 1, tileX: 0, tileY: 0 },
        ],
      });
      addTestResult('Basic Preheat', result);
    } catch (error) {
      addTestResult('Basic Preheat', { error: error.message });
    }
    setIsTestRunning(false);
  };

  const testAdjacentPreheat = async () => {
    setIsTestRunning(true);
    try {
      const result = await preheatAdjacentTiles({
        surface: 'top',
        seqNo: 12345,
        currentTiles: [
          { level: 0, tileX: 2, tileY: 2 },
        ],
        radius: 2,
        includeCrossLevel: true,
      });
      addTestResult('Adjacent Preheat', result);
    } catch (error) {
      addTestResult('Adjacent Preheat', { error: error.message });
    }
    setIsTestRunning(false);
  };

  const testUserBehaviorSimulation = () => {
    // 修复1: 使用实际图像尺寸
    const imageWidth = 16384;  // 典型宽度
    const imageHeight = 1024; // 典型高度
    
    // 修复2: 根据图像尺寸调整视口
    const viewportWidth = Math.min(800, imageWidth);
    const viewportHeight = Math.min(600, imageHeight);
    
    // 修复3: 模拟更真实的用户行为
    const actions = [
      // 1. 浏览左上角
      { type: 'pan' as const, viewport: { x: 0, y: 0, width: viewportWidth, height: viewportHeight, scale: 1 }, timestamp: Date.now() },
      
      // 2. 平移到右下角（模拟从左到右的浏览）
      { type: 'pan' as const, viewport: { x: imageWidth - viewportWidth, y: imageHeight - viewportHeight, width: viewportWidth, height: viewportHeight, scale: 1 }, timestamp: Date.now() + 200 },
      
      // 3. 回到中间并放大查看
      { type: 'zoom' as const, viewport: { x: imageWidth * 0.5 - viewportWidth * 0.5, y: imageHeight * 0.5 - viewportHeight * 0.5, width: viewportWidth, height: viewportHeight, scale: 2 }, timestamp: Date.now() + 400 },
      
      // 4. 在放大状态下平移查看细节
      { type: 'pan' as const, viewport: { x: imageWidth * 0.5, y: imageHeight * 0.5, width: viewportWidth, height: viewportHeight, scale: 2 }, timestamp: Date.now() + 600 },
      
      // 5. 缩小查看整体
      { type: 'zoom' as const, viewport: { x: imageWidth * 0.5 - viewportWidth * 0.5, y: 0, width: viewportWidth, height: viewportHeight, scale: 0.5 }, timestamp: Date.now() + 800 },
    ];
    
    actions.forEach(action => {
      globalPreheatManager.recordUserAction(action);
    });
    
    addTestResult('User Behavior Simulation', { 
      message: `Recorded ${actions.length} realistic user actions with proper image dimensions`,
      stats: globalPreheatManager.getStats(),
      imageSpecs: { width: imageWidth, height: imageHeight, viewportWidth, viewportHeight }
    });
  };

  const testPreheatFromVisibleTiles = async () => {
    setIsTestRunning(true);
    try {
      const result = await globalPreheatManager.preheatFromVisibleTiles({
        surface: 'top',
        seqNo: 12345,
        visibleTiles: [
          { level: 0, tileX: 5, tileY: 5 },
          { level: 0, tileX: 5, tileY: 6 },
          { level: 1, tileX: 2, tileY: 2 },
        ],
        immediate: true,
      });
      addTestResult('Visible Tiles Preheat', { message: 'Preheat triggered' });
    } catch (error) {
      addTestResult('Visible Tiles Preheat', { error: error.message });
    }
    setIsTestRunning(false);
  };

  const clearStats = () => {
    globalPreheatManager.clear();
    setTestResults([]);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">瓦片预热测试</h2>
      
      {/* 统计信息 */}
      <Card className="p-4 bg-gray-800 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">预热管理器状态</h3>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.queueLength}</div>
              <div className="text-sm text-gray-400">队列长度</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {stats.isProcessing ? '处理中' : '空闲'}
              </div>
              <div className="text-sm text-gray-400">处理状态</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.userActionHistory}</div>
              <div className="text-sm text-gray-400">用户行为记录</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.preheatCacheSize}</div>
              <div className="text-sm text-gray-400">预热缓存</div>
            </div>
          </div>
        )}
      </Card>

      {/* 测试按钮 */}
      <Card className="p-4 bg-gray-800 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">预热测试</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={testBasicPreheat} 
            disabled={isTestRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            基础预热测试
          </Button>
          <Button 
            onClick={testAdjacentPreheat} 
            disabled={isTestRunning}
            className="bg-green-600 hover:bg-green-700"
          >
            相邻瓦片预热测试
          </Button>
          <Button 
            onClick={testUserBehaviorSimulation}
            disabled={isTestRunning}
            className="bg-purple-600 hover:bg-purple-700"
          >
            用户行为模拟
          </Button>
          <Button 
            onClick={testPreheatFromVisibleTiles} 
            disabled={isTestRunning}
            className="bg-orange-600 hover:bg-orange-700"
          >
            可见瓦片预热测试
          </Button>
        </div>
        <Button 
          onClick={clearStats} 
          variant="outline"
          className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          清空状态
        </Button>
      </Card>

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <Card className="p-4 bg-gray-800 border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">测试结果</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="p-3 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-white">{result.test}</span>
                  <span className="text-sm text-gray-400">{result.timestamp}</span>
                </div>
                <div className="text-sm">
                  {result.result.error ? (
                    <Badge variant="destructive" className="bg-red-600">
                      错误: {result.result.error}
                    </Badge>
                  ) : (
                    <div>
                      <pre className="text-green-400 text-xs">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 使用说明 */}
      <Card className="p-4 bg-gray-800 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">使用说明</h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p>• <strong>基础预热测试</strong>: 测试单个瓦片的预热功能</p>
          <p>• <strong>相邻瓦片预热测试</strong>: 测试基于当前瓦片的相邻区域预热</p>
          <p>• <strong>用户行为模拟</strong>: 模拟用户拖拽和缩放行为，验证预测算法</p>
          <p>• <strong>可见瓦片预热测试</strong>: 测试基于当前可见瓦片的批量预热</p>
          <p>• 预热功能会自动将瓦片加载到后端缓存，但不返回图像数据</p>
          <p>• 通过观察统计信息可以了解预热系统的运行状态</p>
        </div>
      </Card>
    </div>
  );
};