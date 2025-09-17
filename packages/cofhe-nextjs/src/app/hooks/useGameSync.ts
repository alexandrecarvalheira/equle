import { useCallback, useMemo, useRef } from "react";
import { usePublicClient, useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { useGameStore } from "../store/gameStore";
import type { GameState } from "../store/gameStore";
import { cofhejs, FheTypes } from "cofhejs/web";
import { analyzeXorResult, extractOriginalEquation } from "../../../utils";
import { usePlayerAttempt } from "./usePlayerAttempt";

// Helpers kept outside to avoid re-creating on each render
const mapResultFeedback = (feedback: number): "equal" | "less" | "greater" => {
  if (feedback === 0) return "equal";
  if (feedback === 1) return "less";
  if (feedback === 2) return "greater";
  return "equal";
};

const buildCellStates = (
  xorValue: bigint
): ("correct" | "present" | "absent")[] => {
  const feedback = analyzeXorResult(xorValue);
  const cellStates: ("correct" | "present" | "absent")[] = [];
  for (let i = 0; i < 5; i++) {
    if (feedback.green[i]) {
      cellStates.push("correct");
    } else if (feedback.yellow[i]) {
      cellStates.push("present");
    } else {
      cellStates.push("absent");
    }
  }
  return cellStates;
};

export function useGameSync(address?: `0x${string}`, gameId?: number | null) {
  const { gameState, setGameState, setGameStateSynced } = useGameStore();
  const publicClient = usePublicClient();
  const processingRef = useRef<boolean>(false);

  // Contract hooks for player game state - get [currentAttempt, hasWon]
  const { data: playerGameStateData } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerGameState",
    args: address && gameId ? [gameId, address] : undefined,
  });

  // Player attempt hook for refetching attempt data
  const { refetch: refetchPlayerAttempt } = usePlayerAttempt(
    address,
    gameId,
    gameState?.currentAttempt
  );

  // Imperative attempt reader to avoid multiple reactive hooks
  const readAttempt = useCallback(
    async (
      attemptIndex: number
    ): Promise<[bigint, bigint, bigint, bigint] | null> => {
      if (
        !publicClient ||
        !address ||
        gameId === null ||
        gameId === undefined
      ) {
        return null;
      }
      try {
        const result = (await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "getPlayerAttempt",
          args: [gameId, address, attemptIndex],
        })) as [bigint, bigint, bigint, bigint];
        return result;
      } catch (_e) {
        return null;
      }
    },
    [publicClient, address, gameId]
  );

  // CoFHE unsealing utility function
  const unsealValue = useCallback(
    async (encryptedValue: bigint, fheType: FheTypes) => {
      if (!address) throw new Error("Address not available");

      // Validate encrypted value is not null/undefined/0
      if (!encryptedValue || encryptedValue === BigInt(0)) {
        return {
          success: false,
          data: null,
          error: new Error("Invalid encrypted value"),
        };
      }

      const permitResult = cofhejs.getPermit();
      if (!permitResult?.success || !permitResult?.data) {
        return {
          success: false,
          data: null,
          error: new Error("CoFHE permit not available"),
        };
      }

      const permit = permitResult.data;

      try {
        const unsealedValue = await cofhejs.unseal(
          encryptedValue,
          fheType,
          address,
          permit.getHash()
        );
        return unsealedValue;
      } catch (error) {
        return { success: false, data: null, error };
      }
    },
    [address]
  );

  const fetchPlayerGameState = useCallback(() => {
    if (!address) {
      console.log("No address provided for fetchPlayerGameState");
      return null;
    }

    if (!playerGameStateData) {
      console.log("No player game state data available");
      return null;
    }

    const result = playerGameStateData as [bigint, boolean];

    if (!Array.isArray(result) || result.length !== 2) {
      console.error("Invalid player game state data format:", result);
      return null;
    }

    const [currentAttempt, hasWon] = result;
    const playerState = {
      currentAttempt: Number(currentAttempt),
      hasWon: Boolean(hasWon),
    };

    console.log("Fetched player state:", playerState);
    return playerState;
  }, [address, playerGameStateData]);

  const rebuildGameStateFromContract = useCallback(
    async (
      targetGameId: number,
      playerState: { currentAttempt: number; hasWon: boolean }
    ) => {
      if (!address) {
        return;
      }

      try {
        const guesses = [];

        // Process all previous attempts from the contract using the direct data

        for (
          let attemptIndex = 0;
          attemptIndex < playerState.currentAttempt;
          attemptIndex++
        ) {
          try {
            // Read attempt data imperatively
            const result = await readAttempt(attemptIndex);

            if (!result || !Array.isArray(result) || result.length !== 4) {
              continue;
            }

            const [
              equationGuess,
              resultGuess,
              equationXor,
              encryptedResultFeedback,
            ] = result;

            // Check if we have valid encrypted data before attempting to unseal
            if (
              equationGuess === BigInt(0) &&
              resultGuess === BigInt(0) &&
              equationXor === BigInt(0) &&
              encryptedResultFeedback === BigInt(0)
            ) {
              continue;
            }

            // Unseal all encrypted values
            const [
              unsealedEquation,
              unsealedResult,
              unsealedXor,
              unsealedResultFeedback,
            ] = await Promise.all([
              unsealValue(equationGuess as bigint, FheTypes.Uint128),
              unsealValue(resultGuess as bigint, FheTypes.Uint8),
              unsealValue(equationXor as bigint, FheTypes.Uint128),
              unsealValue(encryptedResultFeedback as bigint, FheTypes.Uint8),
            ]);

            // Check if unsealing was successful
            if (
              !unsealedEquation?.success ||
              !unsealedResult?.success ||
              !unsealedXor?.success ||
              !unsealedResultFeedback?.success
            ) {
              continue; // Skip this attempt and continue with next one
            }

            // Process the unsealed data
            const equationString = extractOriginalEquation(
              BigInt(unsealedEquation.data || 0)
            );
            const resultValue = Number(unsealedResult.data || 0);
            const xorValue = BigInt(unsealedXor.data || 0);

            // Analyze XOR to get tile feedback
            const cellStates = buildCellStates(xorValue);

            const guess = {
              equation: equationString,
              result: resultValue.toString(),
              feedback: cellStates,
              resultFeedback: mapResultFeedback(
                Number(unsealedResultFeedback.data || 0)
              ),
            };

            guesses.push(guess);
          } catch (error) {
            break;
          }
        }

        // Create the rebuilt game state
        const rebuiltGameState = {
          gameId: targetGameId,
          currentAttempt: playerState.currentAttempt,
          guesses: guesses,
          hasWon: playerState.hasWon,
          isGameComplete: playerState.hasWon || playerState.currentAttempt >= 6,
          maxAttempts: 6,
        };

        setGameState(rebuiltGameState);
        setGameStateSynced(true);
      } catch (error) {
        console.error("Error rebuilding game state:", error);

        // Create a default game state even if rebuild fails
        const defaultGameState = {
          gameId: targetGameId,
          currentAttempt: playerState.currentAttempt,
          guesses: [],
          hasWon: playerState.hasWon,
          isGameComplete: playerState.hasWon || playerState.currentAttempt >= 6,
          maxAttempts: 6,
        };

        console.log("Setting default game state due to rebuild error");
        setGameState(defaultGameState);
        setGameStateSynced(true);
      }
    },
    [address, readAttempt, setGameState, setGameStateSynced, unsealValue]
  );

  const syncGameStateFromContract = useCallback(async () => {
    if (!address || gameId === null || gameId === undefined) {
      return;
    }

    try {
      const playerState = await fetchPlayerGameState();

      if (!playerState) {
        return;
      }

      // Check if we need to rebuild the game state
      if (
        !gameState ||
        gameState.gameId !== gameId ||
        gameState.currentAttempt !== playerState.currentAttempt ||
        gameState.hasWon !== playerState.hasWon
      ) {
        await rebuildGameStateFromContract(gameId, playerState);
      } else {
        setGameStateSynced(true);
      }
    } catch (error) {
      console.error("Error syncing game state:", error);
      // Don't throw - let the validator handle the error state
    }
  }, [
    address,
    gameId,
    gameState,
    fetchPlayerGameState,
    rebuildGameStateFromContract,
    setGameStateSynced,
  ]);

  // Helper function to poll for attempt data using usePlayerAttempt refetch
  const pollForAttemptData = useCallback(
    async (
      attemptIndex: number,
      maxAttempts: number = 10,
      delayMs: number = 1000
    ): Promise<[bigint, bigint, bigint, bigint] | null> => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          console.log(
            `Polling for attempt data (attempt ${attempt + 1}/${maxAttempts})`
          );

          const result = await refetchPlayerAttempt();

          if (
            result.data &&
            Array.isArray(result.data) &&
            result.data.length === 4
          ) {
            const [, , equationXor, encryptedResultFeedback] = result.data as [
              bigint,
              bigint,
              bigint,
              bigint
            ];

            // Check if we have valid XOR data
            if (equationXor && equationXor !== BigInt(0)) {
              console.log("Valid attempt data found");
              return result.data as [bigint, bigint, bigint, bigint];
            }
          }

          // Wait before next attempt
          if (attempt < maxAttempts - 1) {
            console.log(`Waiting ${delayMs}ms before next attempt...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          console.error(
            `Error polling attempt data (attempt ${attempt + 1}):`,
            error
          );
          if (attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      console.error("Max polling attempts reached, no valid data found");
      return null;
    },
    [refetchPlayerAttempt]
  );

  const processTransactionSuccess = useCallback(
    async (
      pendingGuess: { equation: string; result: number },
      currentGameState: GameState
    ) => {
      if (!pendingGuess || !address || !currentGameState) {
        console.log("Missing required data for processTransactionSuccess");
        return false;
      }

      if (processingRef.current) {
        console.log("Already processing transaction, skipping duplicate call");
        return false;
      }

      processingRef.current = true;

      try {
        console.log("Processing transaction success...");

        // Get the last attempt number from current game state
        const lastAttemptIndex = currentGameState.currentAttempt;

        // Use the polling function to get attempt data
        const result = await pollForAttemptData(lastAttemptIndex);

        if (!result) {
          console.error("Failed to get valid attempt data after polling");
          processingRef.current = false;
          return false;
        }

        // Extract the data we need
        const [, , equationXor, encryptedResultFeedback] = result;

        console.log("Unsealing encrypted feedback data...");

        // Unseal the encrypted data
        const [unsealedXor, unsealedResultFeedback] = await Promise.all([
          unsealValue(equationXor, FheTypes.Uint128),
          unsealValue(encryptedResultFeedback, FheTypes.Uint8),
        ]);

        // Check if unsealing was successful
        if (!unsealedXor?.success || !unsealedResultFeedback?.success) {
          console.error("Failed to unseal encrypted data");
          processingRef.current = false;
          return false;
        }

        console.log("Successfully unsealed feedback data");

        // Process the XOR result to get color feedback
        const xorValue = BigInt(unsealedXor.data || 0);
        const cellStates = buildCellStates(xorValue);

        const guess = {
          equation: pendingGuess.equation,
          result: pendingGuess.result.toString(),
          feedback: cellStates,
          resultFeedback: mapResultFeedback(
            Number(unsealedResultFeedback.data || 0)
          ),
        };

        // Add the guess to the local game state
        const updatedGameState = {
          ...currentGameState,
          guesses: [...currentGameState.guesses, guess],
          currentAttempt: currentGameState.currentAttempt + 1,
          hasWon:
            cellStates.every((f) => f === "correct") &&
            guess.resultFeedback === "equal",
          isGameComplete:
            (cellStates.every((f) => f === "correct") &&
              guess.resultFeedback === "equal") ||
            currentGameState.currentAttempt + 1 >= 6,
        };

        // Update the game state with color feedback
        setGameState(updatedGameState);
        setGameStateSynced(true);

        console.log(
          "Successfully processed transaction and updated game state"
        );
        processingRef.current = false;
        return true;
      } catch (error) {
        console.error("Error in processTransactionSuccess:", error);
        processingRef.current = false;
        return false;
      }
    },
    [address, pollForAttemptData, setGameState, setGameStateSynced, unsealValue]
  );
  const api = useMemo(
    () => ({
      fetchPlayerGameState,
      syncGameStateFromContract,
      rebuildGameStateFromContract,
      processTransactionSuccess,
    }),
    [
      fetchPlayerGameState,
      syncGameStateFromContract,
      rebuildGameStateFromContract,
      processTransactionSuccess,
    ]
  );

  return api;
}
