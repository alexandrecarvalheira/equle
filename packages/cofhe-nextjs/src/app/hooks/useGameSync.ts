import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { useGameStore } from "../store/gameStore";
import { cofhejs, FheTypes } from "cofhejs/web";
import { analyzeXorResult, extractOriginalEquation } from "../../../utils";

export function useGameSync(address?: `0x${string}`, gameId?: number | null) {
  const { gameState, setGameState, setGameStateSynced } = useGameStore();

  // Contract hooks for player game state - get [currentAttempt, hasWon]
  const { data: playerGameStateData } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerGameState",
    args: address && gameId ? [gameId, address] : undefined,
  });


  // Contract hooks for each possible player attempt - get [equationGuess, resultGuess, equationXor, encryptedResultFeedback]
  const { data: playerAttempt0Data, refetch: refetchAttempt0 } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerAttempt",
    args: address && gameId ? [gameId, address, 0] : undefined,
  });

  const { data: playerAttempt1Data, refetch: refetchAttempt1 } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerAttempt", 
    args: address && gameId ? [gameId, address, 1] : undefined,
  });

  const { data: playerAttempt2Data, refetch: refetchAttempt2 } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerAttempt",
    args: address && gameId ? [gameId, address, 2] : undefined,
  });

  const { data: playerAttempt3Data, refetch: refetchAttempt3 } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerAttempt",
    args: address && gameId ? [gameId, address, 3] : undefined,
  });

  const { data: playerAttempt4Data, refetch: refetchAttempt4 } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerAttempt",
    args: address && gameId ? [gameId, address, 4] : undefined,
  });

  const { data: playerAttempt5Data, refetch: refetchAttempt5 } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerAttempt",
    args: address && gameId ? [gameId, address, 5] : undefined,
  });

  // Array of attempt data for easy access
  const attemptDataArray = [
    playerAttempt0Data,
    playerAttempt1Data, 
    playerAttempt2Data,
    playerAttempt3Data,
    playerAttempt4Data,
    playerAttempt5Data,
  ];

  // Array of refetch functions for easy access
  const attemptRefetchArray = [
    refetchAttempt0,
    refetchAttempt1,
    refetchAttempt2,
    refetchAttempt3,
    refetchAttempt4,
    refetchAttempt5,
  ];


  // CoFHE unsealing utility function
  const unsealValue = async (encryptedValue: bigint, fheType: FheTypes) => {
    if (!address) throw new Error("Address not available");

    // Validate encrypted value is not null/undefined/0
    if (!encryptedValue || encryptedValue === BigInt(0)) {
      return {
        success: false,
        data: null,
        error: new Error("Invalid encrypted value"),
      };
    }

    const permit = cofhejs.getPermit();
    if (!permit?.data) {
      return {
        success: false,
        data: null,
        error: new Error("CoFHE permit not available"),
      };
    }

    try {
      const unsealedValue = await cofhejs.unseal(
        encryptedValue,
        fheType,
        address,
        permit.data.getHash()
      );
      return unsealedValue;
    } catch (error) {
      return { success: false, data: null, error };
    }
  };

  const fetchPlayerGameState = async (targetGameId: number) => {
    if (!address) return null;

    if (!playerGameStateData) {
      return null;
    }

    // Cast the data to the expected format
    const result = playerGameStateData as [bigint, boolean];

    if (!Array.isArray(result) || result.length !== 2) {
      return null;
    }

    const [currentAttempt, hasWon] = result;
    const playerState = {
      currentAttempt: Number(currentAttempt),
      hasWon: Boolean(hasWon),
    };

    return playerState;
  };

  const rebuildGameStateFromContract = async (
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
          // Get the data for this attempt from our array
          const result = attemptDataArray[attemptIndex] as [bigint, bigint, bigint, bigint];

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
          const feedback = analyzeXorResult(xorValue);

          // Map result feedback number to ResultFeedback type
          const getResultFeedback = (
            feedback: number
          ): "equal" | "less" | "greater" => {
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
            resultFeedback: getResultFeedback(
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
  };

  const syncGameStateFromContract = async () => {
    if (!address || gameId === null || gameId === undefined) {
      return;
    }

    try {
      const playerState = await fetchPlayerGameState(gameId);

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
  };

  const processTransactionSuccess = async (
    pendingGuess: { equation: string; result: number; rowIndex: number },
    currentGameState: any
  ) => {
    if (!pendingGuess || !address || !currentGameState) {
      return;
    }

    try {
      // Get the last attempt number from current game state
      const lastAttemptIndex = currentGameState.currentAttempt;
      
      // Check if refetch function exists for this attempt index
      if (!attemptRefetchArray[lastAttemptIndex]) {
        return false;
      }
      
      // Refetch only the specific attempt data to get fresh XOR result
      const refetchResult = await attemptRefetchArray[lastAttemptIndex]();
      const result = refetchResult.data as [bigint, bigint, bigint, bigint];
      
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
      const feedback = analyzeXorResult(xorValue);

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

      // Map result feedback number to ResultFeedback type
      const getResultFeedback = (feedback: number): "equal" | "less" | "greater" => {
        if (feedback === 0) return "equal";
        if (feedback === 1) return "less";
        if (feedback === 2) return "greater";
        return "equal";
      };

      const guess = {
        equation: pendingGuess.equation,
        result: pendingGuess.result.toString(),
        feedback: cellStates,
        resultFeedback: getResultFeedback(Number(unsealedResultFeedback.data || 0)),
      };

      // Add the guess to the local game state
      const updatedGameState = {
        ...currentGameState,
        guesses: [...currentGameState.guesses, guess],
        currentAttempt: currentGameState.currentAttempt + 1,
        hasWon: cellStates.every(f => f === "correct") && guess.resultFeedback === "equal",
        isGameComplete: (cellStates.every(f => f === "correct") && guess.resultFeedback === "equal") || currentGameState.currentAttempt + 1 >= 6
      };

      // Update the game state with color feedback
      setGameState(updatedGameState);
      setGameStateSynced(true);

      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    fetchPlayerGameState,
    syncGameStateFromContract,
    rebuildGameStateFromContract,
    processTransactionSuccess,
  };
}
