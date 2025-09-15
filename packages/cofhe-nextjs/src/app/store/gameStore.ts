import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CellState = "correct" | "present" | "absent" | "empty";
export type ResultFeedback = "equal" | "less" | "greater";

export interface GuessData {
  equation: string;
  result: string;
  feedback: CellState[];
  resultFeedback: ResultFeedback;
}

export interface GameState {
  gameId: number;
  currentAttempt: number;
  guesses: GuessData[];
  hasWon: boolean;
  isGameComplete: boolean;
  maxAttempts: number;
}

interface GameStore {
  gameState: GameState | null;
  walletAddress: string | null;
  setGameState: (gameState: GameState) => void;
  setWalletAddress: (address: string | null) => void;
  clearGameState: () => void;
  updateCurrentAttempt: (attempt: number) => void;
  addGuess: (guess: GuessData) => void;
  setGameComplete: (hasWon: boolean) => void;
  resetGame: (gameId: number) => void;
  isGameStateSynced: boolean;
  setGameStateSynced: (synced: boolean) => void;
}

const defaultGameState = (gameId: number): GameState => ({
  gameId,
  currentAttempt: 0,
  guesses: [],
  hasWon: false,
  isGameComplete: false,
  maxAttempts: 6,
});

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      gameState: null,
      walletAddress: null,
      isGameStateSynced: false,

      setGameState: (gameState) => set({ gameState, isGameStateSynced: true }),

      setWalletAddress: (address) => set({ walletAddress: address }),

      clearGameState: () => set({ gameState: null, isGameStateSynced: false }),

      updateCurrentAttempt: (attempt) =>
        set((state) => ({
          gameState: state.gameState
            ? { ...state.gameState, currentAttempt: attempt }
            : null,
        })),

      addGuess: (guess) =>
        set((state) => {
          if (!state.gameState) return state;

          const newGuesses = [...state.gameState.guesses, guess];
          const newAttempt = state.gameState.currentAttempt + 1;

          return {
            gameState: {
              ...state.gameState,
              guesses: newGuesses,
              currentAttempt: newAttempt,
            },
          };
        }),

      setGameComplete: (hasWon) =>
        set((state) => ({
          gameState: state.gameState
            ? {
                ...state.gameState,
                hasWon,
                isGameComplete: true,
              }
            : null,
        })),

      resetGame: (gameId) =>
        set({
          gameState: defaultGameState(gameId),
          isGameStateSynced: false,
        }),

      setGameStateSynced: (synced) => set({ isGameStateSynced: synced }),
    }),
    {
      name: 'equle-game-state', // localStorage key
      version: 1, // for future migrations
      partialize: (state) => ({
        gameState: state.gameState,
        walletAddress: state.walletAddress,
        isGameStateSynced: state.isGameStateSynced,
      }),
    }
  )
);
