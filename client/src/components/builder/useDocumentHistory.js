import { useCallback, useReducer } from 'react';

const cloneSnapshot = (value) => JSON.parse(JSON.stringify(value));

function historyReducer(state, action) {
  switch (action.type) {
    case 'commit': {
      const nextValue = typeof action.value === 'function' ? action.value(state.value) : action.value;
      return {
        value: cloneSnapshot(nextValue),
        past: [...state.past, cloneSnapshot(state.value)].slice(-action.limit),
        future: [],
      };
    }
    case 'undo': {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return {
        value: cloneSnapshot(previous),
        past: state.past.slice(0, -1),
        future: [cloneSnapshot(state.value), ...state.future],
      };
    }
    case 'redo': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        value: cloneSnapshot(next),
        past: [...state.past, cloneSnapshot(state.value)].slice(-action.limit),
        future: state.future.slice(1),
      };
    }
    case 'reset':
      return { value: cloneSnapshot(action.value), past: [], future: [] };
    default:
      return state;
  }
}

export default function useDocumentHistory(initialValue, limit = 50) {
  const [history, dispatch] = useReducer(
    historyReducer,
    initialValue,
    (value) => ({ value: cloneSnapshot(value), past: [], future: [] })
  );

  const commit = useCallback((value) => dispatch({ type: 'commit', value, limit }), [limit]);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo', limit }), [limit]);
  const reset = useCallback((value) => dispatch({ type: 'reset', value }), []);

  return {
    value: history.value,
    commit,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
