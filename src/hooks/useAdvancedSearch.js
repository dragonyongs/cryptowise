// src/hooks/useAdvancedSearch.js
import { useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { KoreanSearchEngine } from "../utils/searchOptimized";

export function useAdvancedSearch(coins, searchTerm, limit = 50) {
  const searchEngine = useMemo(() => new KoreanSearchEngine(), []);

  const results = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return searchEngine.search(searchTerm, limit);
  }, [searchEngine, searchTerm, limit]);

  // 가상화로 대용량 결과 처리
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  return { results, virtualizer };
}
