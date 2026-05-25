"""
工具模块
提供缓存、错误处理、图像操作等通用功能
"""

from .cache import LRUCache
from .error_handler import (
    APIError,
    BadRequestError,
    ConflictError,
    NotFoundError,
    clamp,
    handle_api_errors,
    log_execution_time,
    retry_on_failure,
    safe_float,
    safe_getattr,
    safe_int,
)

__all__ = [
    "LRUCache",
    "APIError",
    "NotFoundError",
    "BadRequestError",
    "ConflictError",
    "handle_api_errors",
    "log_execution_time",
    "retry_on_failure",
    "safe_int",
    "safe_float",
    "safe_getattr",
    "clamp",
]
