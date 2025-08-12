// src/stores/signalStore.js
import { create } from 'zustand';

export const useSignalStore = create((set) => ({
  signals: [], // { symbol, type, confidence, timestamp }
  addSignal: (newSignal) => set((state) => ({ signals: [...state.signals, newSignal] })),
  clearSignals: () => set({ signals: [] }),
  getSignalsBySymbol: (symbol) => set((state) => state.signals.filter((s) => s.symbol === symbol)),
}));
