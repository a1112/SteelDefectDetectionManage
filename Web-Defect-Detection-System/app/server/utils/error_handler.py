"""
统一错误处理装饰器和工具函数
提供 API 异常处理、日志记录和响应格式化
"""

from __future__ import annotations

import functools
import logging
from typing import Any, Callable, TypeVar

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

# 类型变量
F = TypeVar("F", bound=Callable[..., Any])

logger = logging.getLogger(__name__)


# ============================================================================
# 常用类型安全转换函数（消除重复的 try-except 块）
# ============================================================================

def safe_int(value: Any, default: int = 0) -> int:
    """
    安全地将值转换为整数。

    处理常见的转换错误模式，避免重复的 try-except 块。

    Args:
        value: 要转换的值
        default: 转换失败时的默认值

    Returns:
        转换后的整数值或默认值
    """
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    """
    安全地将值转换为浮点数。

    Args:
        value: 要转换的值
        default: 转换失败时的默认值

    Returns:
        转换后的浮点数值或默认值
    """
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_getattr(obj: Any, attr: str, default: Any = None) -> Any:
    """
    安全地获取对象属性。

    Args:
        obj: 目标对象
        attr: 属性名
        default: 默认值

    Returns:
        属性值或默认值
    """
    try:
        return getattr(obj, attr, default)
    except (AttributeError, TypeError):
        return default


def clamp(value: int, min_val: int, max_val: int) -> int:
    """
    将值限制在指定范围内。

    Args:
        value: 要限制的值
        min_val: 最小值
        max_val: 最大值

    Returns:
        限制后的值
    """
    return max(min_val, min(value, max_val))


class APIError(Exception):
    """自定义 API 错误基类"""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str | None = None,
    ):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class NotFoundError(APIError):
    """资源未找到错误"""

    def __init__(self, message: str = "资源未找到", detail: str | None = None):
        super().__init__(message, status.HTTP_404_NOT_FOUND, detail)


class BadRequestError(APIError):
    """错误请求错误"""

    def __init__(self, message: str = "错误请求", detail: str | None = None):
        super().__init__(message, status.HTTP_400_BAD_REQUEST, detail)


class ConflictError(APIError):
    """冲突错误"""

    def __init__(self, message: str = "资源冲突", detail: str | None = None):
        super().__init__(message, status.HTTP_409_CONFLICT, detail)


def handle_api_errors(
    *,
    reraise: bool = False,
    default_message: str = "处理请求时发生错误",
) -> Callable[[F], F]:
    """
    API 错误处理装饰器

    捕获常见异常并转换为适当的 HTTP 响应

    Args:
        reraise: 是否重新抛出异常（用于调试）
        default_message: 未处理异常的默认错误消息

    Example:
        @handle_api_errors()
        async def get_steel(seq_no: int):
            return steel_service.by_seq(seq_no)
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return await func(*args, **kwargs)
            except APIError as e:
                logger.warning(f"API Error in {func.__name__}: {e.message}")
                raise HTTPException(
                    status_code=e.status_code,
                    detail={"message": e.message, "detail": e.detail},
                )
            except ValueError as e:
                logger.warning(f"Validation Error in {func.__name__}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"message": "参数验证失败", "detail": str(e)},
                )
            except SQLAlchemyError as e:
                logger.error(f"Database Error in {func.__name__}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={"message": "数据库操作失败", "detail": str(e) if reraise else None},
                )
            except Exception as e:
                logger.exception(f"Unexpected Error in {func.__name__}: {e}")
                if reraise:
                    raise
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={"message": default_message},
                )

        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return func(*args, **kwargs)
            except APIError as e:
                logger.warning(f"API Error in {func.__name__}: {e.message}")
                raise HTTPException(
                    status_code=e.status_code,
                    detail={"message": e.message, "detail": e.detail},
                )
            except ValueError as e:
                logger.warning(f"Validation Error in {func.__name__}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"message": "参数验证失败", "detail": str(e)},
                )
            except SQLAlchemyError as e:
                logger.error(f"Database Error in {func.__name__}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={"message": "数据库操作失败", "detail": str(e) if reraise else None},
                )
            except Exception as e:
                logger.exception(f"Unexpected Error in {func.__name__}: {e}")
                if reraise:
                    raise
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={"message": default_message},
                )

        # 根据函数是否为协程返回对应的包装器
        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper  # type: ignore

    return decorator


# 需要导入 asyncio
import asyncio


async def api_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    全局 API 错误处理器

    在 FastAPI app 中添加：
    app.add_exception_handler(HTTPException, api_error_handler)
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": getattr(exc, "detail", {}).get("message", str(exc.detail))
            if isinstance(exc.detail, dict)
            else str(exc.detail),
            "detail": getattr(exc, "detail", {}).get("detail") if isinstance(exc.detail, dict) else None,
        },
    )


def log_execution_time(func: F) -> F:
    """
    记录函数执行时间的装饰器

    Example:
        @log_execution_time
        def expensive_operation():
            ...
    """
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        import time
        start_time = time.perf_counter()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            end_time = time.perf_counter()
            elapsed = (end_time - start_time) * 1000
            logger.debug(f"{func.__name__} executed in {elapsed:.2f}ms")

    @functools.wraps(func)
    async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
        import time
        start_time = time.perf_counter()
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            end_time = time.perf_counter()
            elapsed = (end_time - start_time) * 1000
            logger.debug(f"{func.__name__} executed in {elapsed:.2f}ms")

    if asyncio.iscoroutinefunction(func):
        return async_wrapper  # type: ignore
    return wrapper  # type: ignore


def retry_on_failure(
    max_attempts: int = 3,
    exceptions: tuple[type[Exception], ...] = (SQLAlchemyError,),
    backoff_factor: float = 0.5,
) -> Callable[[F], F]:
    """
    失败重试装饰器

    Args:
        max_attempts: 最大重试次数
        exceptions: 需要重试的异常类型
        backoff_factor: 退避因子（每次重试等待时间 = backoff_factor * (2 ** attempt)）

    Example:
        @retry_on_failure(max_attempts=3)
        def fetch_with_retry():
            return db.query(...)
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            import time

            last_exception = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        wait_time = backoff_factor * (2 ** attempt)
                        logger.warning(
                            f"{func.__name__} failed (attempt {attempt + 1}/{max_attempts}), "
                            f"retrying in {wait_time}s: {e}"
                        )
                        time.sleep(wait_time)
                    else:
                        logger.error(f"{func.__name__} failed after {max_attempts} attempts")
            raise last_exception  # type: ignore

        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            import asyncio

            last_exception = None
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        wait_time = backoff_factor * (2 ** attempt)
                        logger.warning(
                            f"{func.__name__} failed (attempt {attempt + 1}/{max_attempts}), "
                            f"retrying in {wait_time}s: {e}"
                        )
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(f"{func.__name__} failed after {max_attempts} attempts")
            raise last_exception  # type: ignore

        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return wrapper  # type: ignore

    return decorator
