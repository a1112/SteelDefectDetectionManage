"""
钢板记录转换工具模块

提供统一的数据库记录到 API 响应模型的转换函数，
消除 API 端点中的重复转换逻辑。
"""

from __future__ import annotations

from app.server.api.utils import grade_to_level
from app.server.schemas import UiSteelItem


def convert_steel_record(record) -> UiSteelItem:
    """
    将钢板数据库记录转换为 UiSteelItem 响应模型。

    统一处理钢板记录的字段映射和默认值逻辑：
    - 优先使用生产尺寸（produced_*），否则使用订单尺寸（ordered_*）
    - 将 grade 整数值映射为 A-D 等级字符串
    - 映射字段名称（steel_id -> steel_no）

    Args:
        record: 钢板数据库记录对象，应包含以下属性：
            - seq_no: 流水号
            - steel_id: 钢板号
            - steel_type: 钢板类型
            - produced_length, ordered_length: 长度
            - produced_width, ordered_width: 宽度
            - produced_thickness, ordered_thickness: 厚度
            - detect_time: 检测时间
            - grade: 等级（整数）
            - defect_count: 缺陷数量

    Returns:
        UiSteelItem: 转换后的 UI 钢板项
    """
    length = record.produced_length or record.ordered_length
    width = record.produced_width or record.ordered_width
    thickness = record.produced_thickness or record.ordered_thickness

    return UiSteelItem(
        seq_no=record.seq_no,
        steel_no=record.steel_id,
        steel_type=record.steel_type,
        length=length,
        width=width,
        thickness=thickness,
        timestamp=record.detect_time,
        level=grade_to_level(record.grade),
        defect_count=record.defect_count,
    )


def convert_steel_records(records: list) -> list[UiSteelItem]:
    """
    批量转换钢板记录列表。

    Args:
        records: 钢板数据库记录列表

    Returns:
        list[UiSteelItem]: 转换后的 UI 钢板项列表
    """
    return [convert_steel_record(record) for record in records]
