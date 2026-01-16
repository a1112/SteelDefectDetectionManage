# Python瓦片缓存系统优化指南

## 🎯 核心优化建议

### 1. 内存缓存优化

#### 当前配置问题
```python
# 当前配置 (app/server/config/settings.py:296-300)
max_frames: int = 64      # 帧缓存 - 容量不足
max_tiles: int = 256      # 瓦片缓存 - 对于高分辨率图像偏小
max_mosaics: int = 8      # 马赛克缓存 - 严重不足
ttl_seconds: int = 120    # TTL过短，频繁重加载
```

#### 优化配置方案

**🏭 生产环境配置 (推荐)**
```python
# 适用于 8GB+ 内存环境
memory_cache:
  max_frames: 256         # 4倍提升
  max_tiles: 1024         # 4倍提升
  max_mosaics: 32         # 4倍提升
  max_defect_crops: 512   # 2倍提升
  ttl_seconds: 600        # 5倍延长
  enable_compression: true
  concurrent_segments: 32  # 减少锁竞争
```

**🚀 高性能配置**
```python
# 适用于 16GB+ 内存环境
memory_cache:
  max_frames: 512
  max_tiles: 2048
  max_mosaics: 64
  max_defect_crops: 1024
  ttl_seconds: 1200        # 20分钟
  enable_compression: true
  concurrent_segments: 64
  max_memory_mb: 4096
```

### 2. 瓦片预取优化

#### 当前瓶颈
- 仅2个工作线程，无法及时处理预取请求
- 邻接瓦片数量固定，无法动态调整

#### 优化配置
```python
# 优化预取策略
tile_prefetch:
  enabled: true
  workers: 4-6             # 增加工作线程
  ttl_seconds: 600-1200    # 延长预取TTL
  adjacent_tile_count: 3-5 # 增加邻接瓦片
  batch_size: 50           # 批量处理
  queue_size: 20000        # 增大队列
  cross_level_enabled: true
  adjacent_seq_enabled: true
```

### 3. 磁盘缓存优化

#### 启用磁盘缓存 (如果未启用)
```python
disk_cache:
  enabled: true
  max_records: 50000       # 增加容量
  async_write: true        # 异步写入
  compression: true        # 磁盘压缩
  max_size_gb: 10          # 限制大小
  cleanup_policy: "lru"
```

## 🛠️ 实施步骤

### 步骤1: 应用优化缓存代码
```bash
# 1. 备份现有代码
cp app/server/cache/ttl_lru_cache.py app/server/cache/ttl_lru_cache.py.backup

# 2. 应用优化版本
# 将optimized_cache.py中的ConcurrentTtlLruCache应用到现有代码
```

### 步骤2: 更新配置文件
```json
{
  "memory_cache": {
    "max_frames": 256,
    "max_tiles": 1024,
    "max_mosaics": 32,
    "max_defect_crops": 512,
    "ttl_seconds": 600
  },
  "images": {
    "tile_prefetch_enabled": true,
    "tile_prefetch_workers": 4,
    "tile_prefetch_ttl_seconds": 600,
    "tile_prefetch_adjacent_tile_count": 3
  },
  "disk_cache": {
    "disk_cache_enabled": true,
    "disk_cache_max_records": 50000
  }
}
```

### 步骤3: 监控和调优
```python
# 监控缓存性能
GET /api/cache/status

# 关键指标
- hit_rate_percent: > 80% (优秀)
- memory_usage: < 80% (安全)
- response_time: < 100ms (良好)
```

## 📊 性能提升预期

### 内存使用优化
- **压缩存储**: 节省30-50%内存
- **分段锁**: 并发性能提升2-4倍
- **智能预热**: 命中率提升15-25%

### 响应时间优化
- **热数据**: < 10ms (快速路径)
- **温数据**: < 50ms (正常路径)
- **冷数据**: < 200ms (预取优化)

### 系统吞吐量
- **并发请求**: 提升3-5倍
- **瓦片生成**: 提升2-3倍
- **磁盘I/O**: 减少40-60%

## ⚠️ 注意事项

### 1. 内存监控
```bash
# 监控内存使用
python -c "
import psutil
import os
process = psutil.Process(os.getpid())
print(f'Memory: {process.memory_info().rss / 1024 / 1024:.1f} MB')
"
```

### 2. 渐进式部署
1. **第一阶段**: 提升缓存容量和TTL
2. **第二阶段**: 启用压缩和预取优化
3. **第三阶段**: 应用高级缓存算法

### 3. 回滚方案
```python
# 如果出现问题，快速回滚到原配置
{
  "memory_cache": {
    "max_frames": 64,
    "max_tiles": 256,
    "max_mosaics": 8,
    "ttl_seconds": 120
  }
}
```

## 🔧 故障排查

### 常见问题和解决方案

#### 问题1: 内存使用过高
**症状**: 系统内存使用率 > 90%
**解决方案**:
```python
# 减少缓存容量
max_tiles: 512  # 从1024减少
ttl_seconds: 300  # 从600减少
enable_compression: true
```

#### 问题2: 缓存命中率低
**症状**: hit_rate_percent < 60%
**解决方案**:
```python
# 增加TTL和容量
ttl_seconds: 900
max_tiles: 1536
enable_smart_warmup: true
```

#### 问题3: 响应时间不稳定
**症状**: 响应时间波动大
**解决方案**:
```python
# 增加预取线程
tile_prefetch_workers: 6
prefetch_batch_size: 100
async_write_enabled: true
```

## 📈 性能测试建议

### 负载测试脚本
```bash
# 瓦片负载测试
curl -X POST "http://localhost:8120/api/images/tile" \
  -H "Content-Type: application/json" \
  -d '{
    "surface": "top",
    "seq_no": 12345,
    "level": 2,
    "tile_x": 0,
    "tile_y": 0,
    "tile_size": 1024
  }'
```

### 性能基准
- **单实例**: 支持100+并发用户
- **瓦片响应**: 平均 < 50ms
- **缓存命中率**: > 85%
- **内存效率**: 压缩率 > 40%

---

通过以上优化方案，您的瓦片缓存系统性能将显著提升，建议根据实际硬件配置和使用模式选择合适的优化级别。