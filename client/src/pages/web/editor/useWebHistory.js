import { useState, useCallback, useRef } from 'react';

/**
 * Undo/redo hook for the web editor, following the same pattern as the forms builder.
 * Stores snapshots of { sections, header, footer } state.
 */
export function useWebHistory(maxHistory = 50) {
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const skipNext = useRef(false);

  const pushHistory = useCallback((state) => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      const next = [...truncated, state];
      if (next.length > maxHistory) next.shift();
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [historyIndex, maxHistory]);

  const undo = useCallback(() => {
    setHistoryIndex((prev) => {
      if (prev <= 0) return prev;
      return prev - 1;
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex((prev) => {
      if (prev >= history.length - 1) return prev;
      return prev + 1;
    });
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const current = history[historyIndex];

  const reset = useCallback((initialState) => {
    setHistory([initialState]);
    setHistoryIndex(0);
  }, []);

  return {
    current,
    history,
    historyIndex,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
