import React, { createContext, useContext, useReducer } from 'react';
import { demoStateReducer, initialDemoState } from './demoStateReducer.js';

const DemoCtx = createContext(null);

export function DemoProvider({ children }) {
  const [state, dispatch] = useReducer(demoStateReducer, initialDemoState);
  const value = {
    state,
    dispatch,
    set: (key, value) => dispatch({ type: 'SET', key, value }),
    toggle: (key) => dispatch({ type: 'TOGGLE', key }),
    reset: () => dispatch({ type: 'RESET' })
  };
  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoCtx);
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>');
  return ctx;
}
