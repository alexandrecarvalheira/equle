import { useCallback, useMemo } from "react";
import { usePublicClient, useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { useGameStore } from "../store/gameStore";
import type { GameState } from "../store/gameStore";
import { cofhejs, FheTypes } from "cofhejs/web";
import { analyzeXorResult, extractOriginalEquation } from "../../../utils";

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

  // Contract hooks for player game state - get [currentAttempt, hasWon]
  const { data: playerGameStateData } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerGameState",
    args: address && gameId ? [gameId, address] : undefined,
  });

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
    if (!address) return null;

    if (!playerGameStateData) {
      return null;
    }

    const result = playerGameStateData as [bigint, boolean];

    if (!Array.isArray(result) || result.length !== 2) {
      return null;
    }

    const [currentAttempt, hasWon] = result;
    return {
      currentAttempt: Number(currentAttempt),
      hasWon: Boolean(hasWon),
    };
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
        // Silent error handling
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
      // Silent error handling
    }
  }, [
    address,
    gameId,
    gameState,
    fetchPlayerGameState,
    rebuildGameStateFromContract,
    setGameStateSynced,
  ]);

  const processTransactionSuccess = useCallback(
    async (
      pendingGuess: { equation: string; result: number },
      currentGameState: GameState
    ) => {
      if (!pendingGuess || !address || !currentGameState) {
        return;
      }

      try {
        // Get the last attempt number from current game state
        const lastAttemptIndex = currentGameState.currentAttempt;

        // Read only the specific attempt data to get fresh XOR result
        const result = await readAttempt(lastAttemptIndex);

        if (!result || !Array.isArray(result) || result.length !== 4) {
          return false;
        }

        // We only need the XOR result (third element) for color feedback
        const [, , equationXor, encryptedResultFeedback] = result;

        // Check if we have valid XOR data
        if (!equationXor || equationXor === BigInt(0)) {
          return false;
        }

        // Unseal only the XOR and result feedback
        const [unsealedXor, unsealedResultFeedback] = await Promise.all([
          unsealValue(equationXor as bigint, FheTypes.Uint128),
          unsealValue(encryptedResultFeedback as bigint, FheTypes.Uint8),
        ]);

        // Check if unsealing was successful
        if (!unsealedXor?.success || !unsealedResultFeedback?.success) {
          return false;
        }

        // Process the XOR result to get color feedback
        const xorValue = BigInt(unsealedXor.data || 0);

        // Analyze XOR to get tile feedback colors
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

        return true;
      } catch (error) {
        return false;
      }
    },
    [address, readAttempt, setGameState, setGameStateSynced, unsealValue]
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
