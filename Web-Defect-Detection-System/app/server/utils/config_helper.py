"""
配置辅助工具模块

提供统一的配置访问辅助函数，消除配置读取的重复代码。
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from app.server.config.settings import CURRENT_DIR, DEFAULT_CONFIG_NAME, ensure_current_config_dir


def get_config_value(payload: dict, key: str, default: Any = None) -> Any:
    """
    安全地从字典中获取配置值。

    这是处理常见的 payload.get(key) or {} 模式的统一方法。
    如果值不存在或为 None，返回默认值。

    Args:
        payload: 配置字典
        key: 要获取的键
        default: 默认值（当键不存在或值为 None 时返回）

    Returns:
        配置值或默认值
    """
    if payload is None:
        return default
    value = payload.get(key)
    return value if value is not None else default


def get_nested_config(payload: dict | None, *keys: str, default: Any = None) -> Any:
    """
    安全地从嵌套字典中获取配置值。

    处理 config.get("a", {}).get("b") 这样的深层访问模式。

    Args:
        payload: 配置字典
        *keys: 嵌套的键路径
        default: 默认值（当任何一级键不存在时返回）

    Returns:
        配置值或默认值

    Example:
        >>> get_nested_config(config, "images", "top_root", default="/path")
        >>> # 等价于 config.get("images", {}).get("top_root", "/path")
    """
    if payload is None:
        return default
    current = payload
    for key in keys:
        if current is None:
            return default
        current = current.get(key) if isinstance(current, dict) else None
        if current is None:
            return default
    return current if current is not None else default


def load_server_config() -> dict:
    """
    加载服务器配置文件。

    读取 configs/current/server.json 配置文件，如果不存在返回空字典。
    如果文件存在但解析失败，返回空字典。

    Returns:
        配置字典，失败时返回空字典
    """
    ensure_current_config_dir()
    config_path = CURRENT_DIR / DEFAULT_CONFIG_NAME
    if not config_path.exists():
        return {}
    try:
        return json.loads(config_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_server_config(payload: dict) -> None:
    """
    保存服务器配置文件。

    Args:
        payload: 要保存的配置字典
    """
    ensure_current_config_dir()
    config_path = CURRENT_DIR / DEFAULT_CONFIG_NAME
    config_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def get_line_key() -> str:
    """
    获取当前产线标识。

    从环境变量 DEFECT_LINE_KEY 或 DEFECT_LINE_NAME 获取产线标识，
    如果都不存在则返回 "default"。

    Returns:
        产线标识字符串
    """
    return os.getenv("DEFECT_LINE_KEY") or os.getenv("DEFECT_LINE_NAME") or "default"


def update_config_section(
    config: dict,
    section: str,
    updates: dict,
) -> dict:
    """
    更新配置中的某个节（section）。

    将更新合并到现有配置节中，保留未更新的字段。

    Args:
        config: 原始配置字典
        section: 要更新的节名称
        updates: 要应用的更新

    Returns:
        更新后的完整配置字典

    Example:
        >>> config = {"memory_cache": {"ttl": 120, "size": 100}}
        >>> updates = {"ttl": 60}
        >>> update_config_section(config, "memory_cache", updates)
        >>> # {"memory_cache": {"ttl": 60, "size": 100}}
    """
    if not isinstance(config, dict):
        config = {}
    if not isinstance(updates, dict):
        updates = {}

    current_section = config.get(section) or {}
    if not isinstance(current_section, dict):
        current_section = {}

    merged_section = {**current_section, **updates}
    return {**config, section: merged_section}


def get_image_scale(image_service) -> tuple[float, float]:
    """
    从图像服务获取缩放比例。

    安全地读取 image_scale_x 和 image_scale_y 配置，
    处理解析错误并提供默认值。

    Args:
        image_service: 图像服务实例

    Returns:
        (scale_x, scale_y) 缩放比例元组，无效时返回 (1.0, 1.0)
    """
    try:
        scale_x = float(getattr(image_service.settings.images, "image_scale_x", 1.0))
    except (TypeError, ValueError):
        scale_x = 1.0

    try:
        scale_y = float(getattr(image_service.settings.images, "image_scale_y", 1.0))
    except (TypeError, ValueError):
        scale_y = 1.0

    if scale_x <= 0:
        scale_x = 1.0
    if scale_y <= 0:
        scale_y = 1.0

    return scale_x, scale_y


def get_config_path(filename: str, ensure: bool = False) -> Path:
    """
    获取配置目录下指定文件的路径。

    Args:
        filename: 配置文件名
        ensure: 是否确保父目录存在

    Returns:
        配置文件的完整路径
    """
    path = CURRENT_DIR / filename
    if ensure:
        path.parent.mkdir(parents=True, exist_ok=True)
    return path
