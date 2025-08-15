import { create } from 'zustand'

interface CofheState {
  isInitialized: boolean
  setIsInitialized: (isInitialized: boolean) => void
}

export const useCofheStore = create<CofheState>((set: (state: Partial<CofheState>) => void) => ({
  isInitialized: false,
  setIsInitialized: (isInitialized: boolean) => set({ isInitialized }),
})) 