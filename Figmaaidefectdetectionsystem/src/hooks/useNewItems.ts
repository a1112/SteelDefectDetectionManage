import { useEffect, useRef, useState } from "react";

type Key = string | number;

export function useNewItemKeys<T>(
  items: T[],
  getKey: (item: T) => Key,
  durationMs: number = 800,
) {
  const prevKeysRef = useRef<Set<string>>(new Set());
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const keyFnRef = useRef(getKey);

  useEffect(() => {
    keyFnRef.current = getKey;
  }, [getKey]);

  useEffect(() => {
    const currentKeys = new Set(items.map((item) => String(keyFnRef.current(item))));
    if (!readyRef.current) {
      prevKeysRef.current = currentKeys;
      readyRef.current = true;
      setNewKeys(new Set());
      return;
    }

    const prevKeys = prevKeysRef.current;
    const added = new Set<string>();
    currentKeys.forEach((key) => {
      if (!prevKeys.has(key)) {
        added.add(key);
      }
    });
    prevKeysRef.current = currentKeys;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (added.size > 0) {
      setNewKeys(added);
      timerRef.current = window.setTimeout(() => {
        setNewKeys((prev) => (prev.size > 0 ? new Set() : prev));
        timerRef.current = null;
      }, durationMs);
    } else {
      setNewKeys((prev) => (prev.size > 0 ? new Set() : prev));
    }
  }, [items, durationMs]);

  return newKeys;
}
