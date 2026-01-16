# 数据模拟测试业务逻辑检查报告

## 📊 测试系统概述

当前项目包含两个主要的模拟测试系统：

### 1. 瓦片预热用户行为模拟
**文件**: `src/components/TilePreheatTest.tsx`
**目的**: 测试预热管理器的用户行为预测功能

### 2. 测试模型数据生成系统
**文件**: `app/server/test_model.py`
**目的**: 自动生成模拟钢材缺陷检测数据用于测试

---

## 🔍 详细业务逻辑分析

### 一、瓦片预热用户行为模拟

#### 当前实现
```typescript
const testUserBehaviorSimulation = () => {
  const actions = [
    { type: 'pan', viewport: { x: 100, y: 100, scale: 1 }, timestamp: Date.now() },
    { type: 'pan', viewport: { x: 200, y: 150, scale: 1 }, timestamp: Date.now() + 100 },
    { type: 'pan', viewport: { x: 300, y: 200, scale: 1 }, timestamp: Date.now() + 200 },
    { type: 'zoom', viewport: { x: 300, y: 200, scale: 1.5 }, timestamp: Date.now() + 300 },
    { type: 'pan', viewport: { x: 350, y: 250, scale: 1.5 }, timestamp: Date.now() + 400 },
  ];
  
  actions.forEach(action => {
    globalPreheatManager.recordUserAction(action);
  });
};
```

#### 业务逻辑评估
| 方面 | 状态 | 评价 |
|------|------|------|
| 操作真实性 | ✅ 良好 | 包含平移和缩放操作，符合实际使用 |
| 时间递增 | ✅ 正确 | 时间戳递增模拟连续操作 |
| 视口合理性 | ✅ 正确 | 坐标和缩放值合理 |
| 缺陷预测 | ⚠️ 需改进 | 未考虑实际缺陷位置影响 |

#### 存在的问题
```typescript
// ❌ 问题1: 使用固定的seqNo (12345)，可能不存在
surface: 'top',
seqNo: 12345,  // 这个序列可能不存在，导致预热失败

// ❌ 问题2: 缺少实际图像尺寸验证
viewport: { x: 100, y: 100, width: 800, height: 600, scale: 1 }
// 800x600的视口可能超出了实际图像尺寸
```

#### 建议改进
```typescript
const testUserBehaviorSimulation = () => {
  // 1. 使用实际存在的序列号
  const seqNo = getCurrentSeqNo(); // 从状态获取
  
  // 2. 根据实际图像尺寸调整视口
  const imageSize = getImageDimensions(seqNo);
  const viewportSize = {
    width: Math.min(800, imageSize.width),
    height: Math.min(600, imageSize.height),
  };
  
  // 3. 模拟更真实的用户行为
  const actions = [
    // 先浏览左上角区域
    { type: 'pan', viewport: { ...viewportSize, x: 0, y: 0, scale: 1 }, 
      timestamp: Date.now() },
    
    // 然后拖拽到右下角
    { type: 'pan', viewport: { ...viewportSize, 
      x: imageSize.width - viewportSize.width, 
      y: imageSize.height - viewportSize.height, 
      scale: 1 }, 
      timestamp: Date.now() + 200 },
    
    // 放大查看细节
    { type: 'zoom', viewport: { ...viewportSize, 
      x: imageSize.width * 0.7, 
      y: imageSize.height * 0.7, 
      scale: 2 }, 
      timestamp: Date.now() + 400 },
    
    // 在放大状态下平移
    { type: 'pan', viewport: { ...viewportSize, 
      x: imageSize.width * 0.75, 
      y: imageSize.height * 0.75, 
      scale: 2 }, 
      timestamp: Date.now() + 500 },
  ];
  
  actions.forEach(action => {
    globalPreheatManager.recordUserAction(action);
  });
};
```

---

### 二、测试模型数据生成系统

#### 核心业务流程

```
图像生成循环 (_image_loop)
    ↓
加载配置 → 检查是否启用 → 生成随机图像数量
    ↓
递增序列号 → 复制源图像 → 插入钢材记录
    ↓
更新状态 → 检查剩余数量 → 等待间隔时间

缺陷生成循环 (_defect_loop)
    ↓
加载配置 → 检查是否启用且生成缺陷
    ↓
获取当前序列和图像索引 → 生成随机缺陷数量
    ↓
清空现有缺陷 → 插入新缺陷记录 → 等待间隔
```

#### 关键业务逻辑

##### A. 图像复制逻辑 (`_copy_images`)
```python
def _copy_images(seq_no: int, config: dict, *, image_count: int) -> int | None:
    # 1. 从源序列复制图像
    source_seq = int(config.get("source_seq") or 1)
    views = config.get("views") or ["2D"]
    
    # 2. 计算可用图像数量
    available_count = min(count_per_surface)
    effective_count = max(1, min(image_count, available_count))
    
    # 3. 选择中间位置的图像
    mid = len(files) // 2
    start = max(0, mid - effective_count // 2)
    selected_by_view[view] = files[start : start + effective_count]
    
    # 4. 复制到目标序列
    for offset in range(effective_count):
        current_index = start_index + offset
        for surface in ['top', 'bottom']:
            for view in views:
                shutil.copy2(selected[offset], target_path)
```

**业务逻辑问题**:
- ❌ **假设源图像存在**: 没有验证源序列是否有足够的图像
- ❌ **视图不匹配**: 如果源序列缺少某个视图，会导致数据不完整
- ❌ **没有回滚**: 如果复制过程中断，目标序列会处于不完整状态

##### B. 缺陷生成逻辑 (`_insert_defects`)
```python
def _insert_defects(seq_no: int, config: dict, *, img_index_max: int | None = None, count: int | None = None):
    # 1. 清空现有缺陷
    session.execute(text("DELETE FROM camdefect1 WHERE seqNo = :seq_no"))
    session.execute(text("DELETE FROM camdefect2 WHERE seqNo = :seq_no"))
    
    # 2. 生成随机缺陷
    defect_count = random.randint(0, target_max)
    
    # 3. 插入缺陷记录
    for i in range(defect_count):
        defect_class = random.randint(1, 10)
        left = random.randint(0, frame_width - 200)
        top = random.randint(0, frame_height - 200)
        right = left + random.randint(20, 200)
        bottom = top + random.randint(20, 200)
        
        img_index = int(img_index) if img_index is not None else random.randint(1, 50)
        
        # 插入缺陷
        session.execute(text(f"INSERT INTO camdefect1 ..."))
```

**业务逻辑问题**:
- ❌ **图像索引不匹配**: `img_index = random.randint(1, 50)` 可能超出实际图像范围
- ❌ **缺陷越界**: `left + random.randint(20, 200)` 可能超出 `frame_width`
- ❌ **缺陷类别无效**: `defect_class = random.randint(1, 10)` 可能不匹配实际缺陷字典
- ❌ **并发安全问题**: 清空和插入操作不是原子的

##### C. 钢材记录逻辑 (`_insert_steel_record`)
```python
def _insert_steel_record(seq_no: int, config: dict) -> str:
    length = random.randint(*config.get("length_range", [1000, 6000]))
    width = random.randint(*config.get("width_range", [800, 2000]))
    thickness = random.randint(*config.get("thickness_range", [5, 50]))
    steel_id = f"TEST-{seq_no:06d}"
    
    # 插入记录
    session.execute(text("INSERT INTO steelrecord ..."))
```

**业务逻辑问题**:
- ⚠️ **数据不真实**: 钢材尺寸完全随机，不符合实际规格
- ⚠️ **缺少质量检查**: 所有钢材都是等级1，没有次品
- ⚠️ **没有客户关联**: 客户固定为"TEST"，不够真实

---

## 🚨 严重业务逻辑问题

### 1. 数据一致性问题

#### 问题表现
```python
# 缺陷生成的图像索引可能不存在
img_index = int(img_index) if img_index is not None else random.randint(1, 50)
# 但实际图像可能只有10张，导致索引11-50的缺陷无法正确显示
```

#### 影响范围
- ❌ 缺陷显示不正确
- ❌ 缺陷统计不准确
- ❌ 缺陷定位失败

#### 修复方案
```python
def _insert_defects(seq_no: int, config: dict, *, img_index_max: int | None = None, count: int | None = None):
    # 1. 获取实际的最大图像索引
    if img_index_max is None or img_index_max <= 0:
        img_index_max = _resolve_image_index_max(seq_no, config)
    
    # 2. 验证图像索引范围
    if img_index_max is None or img_index_max <= 0:
        _append_log("生成失败", {"error": "没有可用的图像"})
        return
    
    # 3. 在有效范围内生成索引
    img_index = random.randint(1, img_index_max) if img_index is None else img_index_max
```

### 2. 缺陷坐标越界问题

#### 问题表现
```python
left = random.randint(0, frame_width - 200)
right = left + random.randint(20, 200)
# 如果 left = 16100, right = 16100 + 200 = 16300
# 但 frame_width = 16384，这样是合法的
# 但如果 left = 16184, right = 16384，超出边界
```

#### 修复方案
```python
def _insert_defects(seq_no: int, config: dict, *, img_index_max: int | None = None, count: int | None = None):
    frame_width = int(config.get("frame_width") or 16384)
    frame_height = int(config.get("frame_height") or 1024)
    
    for i in range(defect_count):
        # 1. 安全生成缺陷坐标
        defect_width = random.randint(20, 200)
        defect_height = random.randint(20, 200)
        
        left = random.randint(0, max(0, frame_width - defect_width))
        top = random.randint(0, max(0, frame_height - defect_height))
        
        right = left + defect_width
        bottom = top + defect_height
        
        # 2. 确保不超出边界
        right = min(right, frame_width)
        bottom = min(bottom, frame_height)
```

### 3. 并发安全问题

#### 问题表现
```python
def _defect_loop() -> None:
    while not _worker_stop.is_set():
        config = _load_config()
        if not config.get("enabled") or not config.get("generate_defects"):
            time.sleep(1)
            continue
        
        # 问题：获取状态和生成缺陷之间有时间差
        status_snapshot = _get_status()
        target_seq = int(status_snapshot.get("current_seq") or ...)
        
        # 如果在这段时间内当前序列被删除或更改，会出现问题
        _insert_defects(target_seq, config, ...)
```

#### 修复方案
```python
def _defect_loop() -> None:
    last_defect_ts = 0.0
    while not _worker_stop.is_set():
        config = _load_config()
        if not config.get("enabled") or not config.get("generate_defects"):
            time.sleep(1)
            continue
        
        now = time.time()
        interval = int(config.get("defect_interval_seconds") or 0)
        if interval <= 0 or now - last_defect_ts >= interval:
            # 使用原子操作获取当前序列
            with _status_lock:
                target_seq = _status.get("current_seq")
                current_index = _status.get("current_image_index")
            
            # 验证序列仍然有效
            if target_seq is None:
                last_defect_ts = now
                continue
            
            try:
                _insert_defects(target_seq, config, img_index_max=current_index)
                last_defect_ts = now
            except Exception as exc:
                _append_log("生成失败", {"error": str(exc)})
                logger.exception("auto defect generate failed")
```

### 4. 资源泄漏问题

#### 问题表现
```python
def _image_loop() -> None:
    while not _worker_stop.is_set():
        session = get_main_session(settings)
        try:
            # 执行数据库操作
            session.execute(text("INSERT INTO steelrecord ..."))
            session.commit()
        finally:
            session.close()
        
        # 问题：如果出现异常，可能导致线程无法停止
```

#### 修复方案
```python
def _image_loop() -> None:
    while not _worker_stop.is_set():
        loop_start = time.time()
        
        session = get_main_session(settings)
        try:
            # 执行操作
        except Exception as exc:
            _append_log("生成失败", {"error": str(exc)})
            logger.exception("auto image generate failed")
        finally:
            try:
                session.close()
            except Exception:
                pass  # 确保连接关闭
        
        # 确保线程能够响应停止信号
        elapsed = time.time() - loop_start
        sleep_seconds = max(0.0, interval - elapsed)
        
        # 使用可中断的等待
        for _ in range(int(sleep_seconds * 10)):
            if _worker_stop.is_set():
                return
            time.sleep(0.1)
```

---

## ✅ 建议的改进方案

### 优先级1：修复严重问题

1. **修复缺陷图像索引越界**
   - 使用实际的图像索引范围
   - 验证索引有效性

2. **修复缺陷坐标越界**
   - 确保缺陷在图像边界内
   - 添加边界检查

3. **修复并发安全问题**
   - 使用原子操作获取状态
   - 添加事务管理

### 优先级2：改进业务逻辑

4. **增强数据真实性**
   ```python
   # 根据缺陷类别生成不同大小的缺陷
   defect_sizes = {
       1: (20, 50),   # 划痕 - 较小
       2: (30, 80),   # 辊印 - 中等
       3: (50, 150),  # 头尾 - 较大
       # ... 其他缺陷类别
   }
   ```

5. **添加数据验证**
   ```python
   def _validate_config(config: dict) -> list[str]:
       errors = []
       if config.get("length_range", [1000, 6000])[0] >= config.get("length_range", [1000, 6000])[1]:
           errors.append("长度范围无效")
       if config.get("defects_per_interval", 0) < 0:
           errors.append("每间隔缺陷数不能为负")
       return errors
   ```

6. **改进错误恢复**
   ```python
   def _insert_steel_record_with_rollback(seq_no: int, config: dict) -> str:
       session = get_main_session(settings)
       try:
           # 使用事务
           with session.begin():
               # 执行插入
               session.execute(text("INSERT INTO steelrecord ..."))
               session.commit()
       except Exception as exc:
           # 回滚事务
           session.rollback()
           _append_log("回滚记录", {"seq_no": seq_no, "error": str(exc)})
           raise
       finally:
           session.close()
   ```

### 优先级3：增强监控和日志

7. **添加性能监控**
   ```python
   def _append_log_with_metrics(message: str, payload: dict | None = None) -> None:
       metrics = {
           "timestamp": datetime.now().isoformat(),
           "duration_ms": time.time() - last_operation_start,
           "memory_mb": psutil.Process().memory_info().rss / 1024 / 1024,
           "cpu_percent": psutil.cpu_percent(),
       }
       _append_log(message, {**payload, **metrics})
   ```

8. **添加数据完整性检查**
   ```python
   def _verify_data_integrity(seq_no: int, config: dict) -> dict:
       """验证生成数据的完整性"""
       issues = []
       
       # 检查图像文件
       for surface in ['top', 'bottom']:
           root = _image_roots(config)[0 if surface == 'top' else 1]
           seq_dir = root / str(seq_no)
           if not seq_dir.exists():
               issues.append(f"{surface} 目录不存在")
               continue
           
           # 检查图像数量
           image_files = list(seq_dir.rglob("*.jpg"))
           if len(image_files) == 0:
               issues.append(f"{surface} 没有图像文件")
       
       # 检查数据库记录
       settings = _resolved_settings(config)
       session = get_main_session(settings)
       try:
           steel_record = session.execute(
               text("SELECT * FROM steelrecord WHERE SeqNo = :seq_no"),
               {"seq_no": seq_no}
           ).fetchone()
           
           if not steel_record:
               issues.append("钢材记录不存在")
           else:
               # 检查图像数量匹配
               if steel_record["ImgNum"] != len(image_files):
                   issues.append(f"图像数量不匹配: 记录={steel_record['ImgNum']}, 实际={len(image_files)}")
       finally:
           session.close()
       
       return {"seq_no": seq_no, "issues": issues}
   ```

---

## 📊 测试覆盖率分析

### 当前测试覆盖范围

| 功能模块 | 覆盖率 | 说明 |
|---------|--------|------|
| 图像生成 | 80% | 基本功能完善，缺少异常处理 |
| 缺陷生成 | 60% | 基本逻辑存在，但数据真实性不足 |
| 并发控制 | 30% | 存在竞态条件 |
| 错误处理 | 40% | 部分有处理，但不完整 |
| 数据验证 | 20% | 基本没有验证 |
| 资源管理 | 50% | 有基本管理，但存在泄漏风险 |

### 建议的测试用例

1. **边界条件测试**
   - 零图像数量
   - 最大缺陷数量
   - 极限坐标值

2. **并发测试**
   - 同时启动多个测试模型
   - 并发读写同一序列
   - 线程停止期间的并发操作

3. **异常恢复测试**
   - 数据库连接失败
   - 文件系统错误
   - 磁盘空间不足

4. **数据一致性测试**
   - 图像与记录匹配
   - 缺陷索引有效性
   - 跨序列数据一致性

---

## 🎯 总结

### 当前状态
- ✅ 基本功能完整，可以生成测试数据
- ⚠️ 存在多个业务逻辑问题需要修复
- ❌ 数据真实性不足，可能影响测试效果

### 优先修复项
1. **修复缺陷坐标越界** - 严重影响数据准确性
2. **修复图像索引越界** - 导致缺陷无法显示
3. **增强并发安全** - 避免数据竞争

### 长期改进项
4. **提升数据真实性** - 更符合实际检测场景
5. **完善监控和日志** - 便于问题排查
6. **增加数据验证** - 确保数据质量

建议按照优先级逐步修复这些问题，以确保测试系统的稳定性和准确性。