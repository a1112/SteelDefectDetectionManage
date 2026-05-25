from __future__ import annotations

import random
import threading
import time
from collections import OrderedDict
from typing import Callable, Generic, MutableMapping, TypeVar

K = TypeVar("K")
V = TypeVar("V")


class CacheStats:
    """Cache statistics for monitoring."""

    __slots__ = ("_hits", "_misses", "_evictions", "_lock")

    def __init__(self) -> None:
        self._hits: int = 0
        self._misses: int = 0
        self._evictions: int = 0
        self._lock = threading.Lock()

    def record_hit(self) -> None:
        with self._lock:
            self._hits += 1

    def record_miss(self) -> None:
        with self._lock:
            self._misses += 1

    def record_eviction(self) -> None:
        with self._lock:
            self._evictions += 1

    @property
    def hits(self) -> int:
        return self._hits

    @property
    def misses(self) -> int:
        return self._misses

    @property
    def evictions(self) -> int:
        return self._evictions

    @property
    def total_requests(self) -> int:
        return self._hits + self._misses

    @property
    def hit_rate(self) -> float:
        total = self.total_requests
        if total == 0:
            return 0.0
        return self._hits / total

    def reset(self) -> None:
        with self._lock:
            self._hits = 0
            self._misses = 0
            self._evictions = 0

    def __repr__(self) -> str:
        return (
            f"CacheStats(hits={self._hits}, misses={self._misses}, "
            f"evictions={self._evictions}, hit_rate={self.hit_rate:.2%})"
        )


class TtlLruCache(Generic[K, V]):
    """
    Lightweight thread-safe LRU cache with TTL eviction.

    Features:
    - TTL randomization to prevent cache avalanche (±10% jitter)
    - Cache statistics (hit rate, evictions)
    - Thread-safe operations
    """

    def __init__(
        self,
        *,
        max_items: int = 128,
        ttl_seconds: int = 120,
        time_fn: Callable[[], float] = time.monotonic,
        ttl_jitter: float = 0.1,
    ):
        """
        Initialize the cache.

        Args:
            max_items: Maximum number of items to store
            ttl_seconds: Time-to-live in seconds
            time_fn: Function to get current time (for testing)
            ttl_jitter: Random TTL jitter ratio (0.0-1.0) to prevent avalanche
        """
        if max_items < 1:
            raise ValueError("max_items must be >= 1")
        if ttl_seconds < 1:
            raise ValueError("ttl_seconds must be >= 1")
        if not 0.0 <= ttl_jitter <= 1.0:
            raise ValueError("ttl_jitter must be between 0.0 and 1.0")

        self._max_items = max_items
        self._ttl_seconds = ttl_seconds
        self._ttl_jitter = ttl_jitter
        self._time_fn = time_fn
        self._store: MutableMapping[K, tuple[float, V]] = OrderedDict()
        self._lock = threading.Lock()
        self._stats = CacheStats()

    def _compute_expires_at(self) -> float:
        """
        Compute expiration time with jitter to prevent cache avalanche.

        Adds ±ttl_jitter random offset to the base TTL.
        """
        jitter = 1.0 + (random.random() * 2 - 1) * self._ttl_jitter
        return self._time_fn() + float(self._ttl_seconds) * jitter

    def get(self, key: K) -> V | None:
        """Get a value from the cache, or None if not found or expired."""
        now = self._time_fn()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._stats.record_miss()
                return None
            expires_at, value = entry
            if expires_at <= now:
                # Expired - remove and count as miss
                self._store.pop(key, None)
                self._stats.record_miss()
                return None
            # Move to end (most recently used)
            self._store.move_to_end(key)
            self._stats.record_hit()
            return value

    def put(self, key: K, value: V) -> None:
        """Put a value into the cache. Evicts oldest item if at capacity."""
        expires_at = self._compute_expires_at()
        with self._lock:
            if key in self._store:
                self._store.move_to_end(key)
            else:
                # Check if we need to evict
                if len(self._store) >= self._max_items:
                    self._store.popitem(last=False)
                    self._stats.record_eviction()
            self._store[key] = (expires_at, value)

    def clear(self) -> None:
        """Clear all items from the cache."""
        with self._lock:
            self._store.clear()
            self._stats.reset()

    @property
    def stats(self) -> CacheStats:
        """Get cache statistics (thread-safe snapshot)."""
        # Return a copy to avoid external modifications
        stats = CacheStats()
        with self._lock:
            stats._hits = self._stats._hits
            stats._misses = self._stats._misses
            stats._evictions = self._stats._evictions
        return stats

    def __len__(self) -> int:
        with self._lock:
            return len(self._store)

    def __repr__(self) -> str:
        return f"TtlLruCache(size={len(self)}/{self._max_items}, ttl={self._ttl_seconds}s, stats={self.stats})"
