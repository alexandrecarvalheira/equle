import { useCallback } from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { useGameStore } from "../store/gameStore";
import { cofhejs, FheTypes } from "cofhejs/web";
import {
  analyzeXorResult,
  extractOriginalEquation,
} from "../../../utils";

export function useGameSync(address?: `0x${string}`, gameId?: number | null) {
  const {
    gameState,
    setGameState,
    updateCurrentAttempt,
    addGuess,
    setGameStateSynced,
  } = useGameStore();

  // Dynamic read contract hook for getPlayerAttempt - will be called with refetch
  const { refetch: refetchPlayerAttempt } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerAttempt",
    args: [gameState?.gameId || 0, address, 0],
    query: { enabled: false }, // Disable automatic fetching
  });

  // Dynamic read contract hook for getPlayerGameState
  const { refetch: refetchPlayerGameState } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerGameState",
    args: [gameId || 0, address],
    query: { enabled: false },
  });

  // CoFHE unsealing utility function
  const unsealValue = async (encryptedValue: bigint, fheType: FheTypes) => {
    if (!address) throw new Error("Address not available");

    const permit = cofhejs.getPermit();
    const unsealedValue = await cofhejs.unseal(
      encryptedValue,
      fheType,
      address,
      permit.data?.getHash()
    );
    console.log("unsealedValue", unsealedValue);
    return unsealedValue;
  };

  const fetchPlayerGameState = useCallback(async (targetGameId: number) => {
    if (!address) return null;

    try {
      const { data: result } = (await refetchPlayerGameState({
        args: [targetGameId, address],
      } as any)) as { data: [bigint, boolean] };
      const [currentAttempt, hasWon] = result;

      return {
        currentAttempt: Number(currentAttempt),
        hasWon: Boolean(hasWon),
      };
    } catch (error) {
      console.error("Failed to fetch player game state:", error);
      return null;
    }
  }, [address, refetchPlayerGameState]);

  const rebuildGameStateFromContract = useCallback(async (
    targetGameId: number,
    playerState: { currentAttempt: number; hasWon: boolean }
  ) => {
    if (!address) {
      console.log("Missing requirements for rebuilding game state:", {
        address: !!address,
      });
      return;
    }

    try {
      const guesses = [];

      // Fetch all previous attempts from the contract
      for (
        let attemptIndex = 0;
        attemptIndex < playerState.currentAttempt;
        attemptIndex++
      ) {
        try {
          const { data: result } = (await refetchPlayerAttempt({
            args: [targetGameId, address, attemptIndex],
          } as any)) as { data: [bigint, bigint, bigint, bigint] };
          const [
            equationGuess,
            resultGuess,
            equationXor,
            encryptedResultFeedback,
          ] = result;

          console.log(`Fetched attempt ${attemptIndex} - encrypted:`, {
            equationGuess: equationGuess.toString(),
            resultGuess: resultGuess.toString(),
            equationXor: equationXor.toString(),
            resultFeedback: encryptedResultFeedback.toString(),
          });

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

          console.log(`Unsealed attempt ${attemptIndex}:`, {
            equation: unsealedEquation.toString(),
            result: unsealedResult.toString(),
            xor: unsealedXor.toString(),
            resultFeedback: unsealedResultFeedback.toString(),
          });

          // Process the unsealed data
          const equationString = extractOriginalEquation(
            BigInt(unsealedEquation.data || 0)
          );
          const resultValue = Number(unsealedResult.data || 0);
          const xorValue = BigInt(unsealedXor.data || 0);

          console.log(`Processed attempt ${attemptIndex}:`, {
            equationString,
            resultValue,
            xorValue: xorValue.toString(),
          });

          // Analyze XOR to get tile feedback
          const feedback = analyzeXorResult(xorValue);

          // Map result feedback number to ResultFeedback type
          const getResultFeedback = (feedback: number): "equal" | "less" | "greater" => {
            if (feedback === 0) return "equal";
            if (feedback === 1) return "less";
            if (feedback === 2) return "greater";
            return "equal";
          };

          // Convert feedback object to CellState array
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

          const guess = {
            equation: equationString,
            result: resultValue.toString(),
            feedback: cellStates,
            resultFeedback: getResultFeedback(Number(unsealedResultFeedback.data || 0)),
          };

          guesses.push(guess);
          console.log(`Added guess ${attemptIndex}:`, guess);
        } catch (error) {
          console.error(`Failed to fetch attempt ${attemptIndex}:`, error);
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

      console.log("Rebuilt game state:", rebuiltGameState);
      setGameState(rebuiltGameState);
      setGameStateSynced(true);
    } catch (error) {
      console.error("Failed to rebuild game state:", error);
    }
  }, [address, refetchPlayerAttempt, setGameState, setGameStateSynced]);

  const syncGameStateFromContract = useCallback(async () => {
    if (!address || gameId === null || gameId === undefined) {
      console.log("Cannot sync game state - missing requirements");
      return;
    }

    try {
      console.log(`Syncing game state for game ${gameId}...`);
      const playerState = await fetchPlayerGameState(gameId);

      if (!playerState) {
        console.log("Failed to fetch player state from contract");
        return;
      }

      console.log("Player state from contract:", playerState);

      // Check if we need to rebuild the game state
      if (
        !gameState ||
        gameState.gameId !== gameId ||
        gameState.currentAttempt !== playerState.currentAttempt ||
        gameState.hasWon !== playerState.hasWon
      ) {
        console.log("Game state mismatch, rebuilding from contract...");
        await rebuildGameStateFromContract(gameId, playerState);
      } else {
        console.log("Game state is already synced");
        setGameStateSynced(true);
      }
    } catch (error) {
      console.error("Failed to sync game state:", error);
    }
  }, [address, gameId, gameState, fetchPlayerGameState, rebuildGameStateFromContract, setGameStateSynced]);

  const processTransactionSuccess = useCallback(async (
    pendingGuess: { equation: string; result: number; rowIndex: number },
    currentGameState: any
  ) => {
    if (!pendingGuess || !address || !currentGameState) {
      console.log(
        "Cannot process transaction success - missing requirements:",
        {
          pendingGuess: !!pendingGuess,
          address: !!address,
          gameState: !!currentGameState,
        }
      );
      return;
    }

    try {
      console.log("Transaction confirmed, processing feedback...");

      // Fetch encrypted data from the contract
      const attemptIndex = currentGameState.currentAttempt;
      // Use a manual approach since we need dynamic args
      const { data: result } = (await refetchPlayerAttempt({
        args: [currentGameState.gameId, address, attemptIndex],
      } as any)) as { data: [bigint, bigint, bigint, bigint] };
      const [equationGuess, resultGuess, equationXor, encryptedResultFeedback] =
        result;

      console.log("Encrypted feedback received:", {
        equationGuess: equationGuess.toString(),
        resultGuess: resultGuess.toString(),
        equationXor: equationXor.toString(),
        resultFeedback: encryptedResultFeedback.toString(),
      });

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

      console.log("Unsealed feedback:", {
        equation: unsealedEquation.toString(),
        result: unsealedResult.toString(),
        xor: unsealedXor.toString(),
        resultFeedback: unsealedResultFeedback.toString(),
      });

      // Process the feedback
      const equationString = extractOriginalEquation(
        BigInt(unsealedEquation.data || 0)
      );
      const resultValue = Number(unsealedResult.data || 0);
      const xorValue = BigInt(unsealedXor.data || 0);

      console.log("Processed feedback:", {
        equationString,
        resultValue,
        xorValue: xorValue.toString(),
      });

      // Verify this matches our submitted guess
      if (
        equationString === pendingGuess.equation &&
        resultValue === pendingGuess.result
      ) {
        console.log("✅ Feedback matches submitted guess");

        // Analyze XOR to get tile feedback
        const feedback = analyzeXorResult(xorValue);

        // Map result feedback number to ResultFeedback type
        const getResultFeedback = (feedback: number): "equal" | "less" | "greater" => {
          if (feedback === 0) return "equal";
          if (feedback === 1) return "less";
          if (feedback === 2) return "greater";
          return "equal";
        };

        // Convert feedback object to CellState array
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

        const guess = {
          equation: pendingGuess.equation,
          result: pendingGuess.result.toString(),
          feedback: cellStates,
          resultFeedback: getResultFeedback(Number(unsealedResultFeedback.data || 0)),
        };

        console.log("Adding guess to game state:", guess);

        // Add the guess to the game state
        addGuess(guess);

        // Update current attempt
        updateCurrentAttempt(currentGameState.currentAttempt + 1);

        console.log("Game state updated successfully");
        return true;
      } else {
        console.error("❌ Feedback mismatch!", {
          expected: pendingGuess,
          received: { equation: equationString, result: resultValue },
        });
        return false;
      }
    } catch (error) {
      console.error("Failed to process transaction success:", error);
      return false;
    }
  }, [address, refetchPlayerAttempt, addGuess, updateCurrentAttempt]);

  return {
    fetchPlayerGameState,
    syncGameStateFromContract,
    rebuildGameStateFromContract,
    processTransactionSuccess,
  };
}