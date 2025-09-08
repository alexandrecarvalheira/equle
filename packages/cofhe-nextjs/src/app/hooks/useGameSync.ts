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

  // Log the blockchain data
  console.log("🔍 playerGameStateData from blockchain:", playerGameStateData);
  console.log("🔍 playerGameStateData type:", typeof playerGameStateData);
  console.log(
    "🔍 playerGameStateData array length:",
    Array.isArray(playerGameStateData)
      ? playerGameStateData.length
      : "not an array"
  );

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

  console.log("🔍 All attempt data from blockchain:", attemptDataArray);
  console.log("🔄 All refetch functions:", attemptRefetchArray.map((fn, i) => `${i}: ${typeof fn}`));

  // CoFHE unsealing utility function
  const unsealValue = async (encryptedValue: bigint, fheType: FheTypes) => {
    if (!address) throw new Error("Address not available");

    // Validate encrypted value is not null/undefined/0
    if (!encryptedValue || encryptedValue === BigInt(0)) {
      console.error("Invalid encrypted value:", encryptedValue);
      return {
        success: false,
        data: null,
        error: new Error("Invalid encrypted value"),
      };
    }

    const permit = cofhejs.getPermit();
    if (!permit?.data) {
      console.error("CoFHE permit not available");
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
      console.log("unsealedValue", unsealedValue);
      return unsealedValue;
    } catch (error) {
      console.error("CoFHE unsealing failed:", error);
      return { success: false, data: null, error };
    }
  };

  const fetchPlayerGameState = async (targetGameId: number) => {
    if (!address) return null;

    console.log(
      `🔍 Using playerGameStateData for gameId ${targetGameId}, address ${address}`
    );

    console.log("📊 Raw playerGameStateData:", playerGameStateData);
    console.log("📊 playerGameStateData type:", typeof playerGameStateData);

    if (!playerGameStateData) {
      console.warn("⚠️ playerGameStateData is null/undefined");
      return null;
    }

    // Cast the data to the expected format
    const result = playerGameStateData as [bigint, boolean];
    console.log("📊 Casted result:", result);

    if (!Array.isArray(result) || result.length !== 2) {
      console.error("❌ Invalid playerGameStateData format:", result);
      return null;
    }

    const [currentAttempt, hasWon] = result;
    const playerState = {
      currentAttempt: Number(currentAttempt),
      hasWon: Boolean(hasWon),
    };

    console.log("✅ Parsed player game state:", playerState);
    return playerState;
  };

  const rebuildGameStateFromContract = async (
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

      // Process all previous attempts from the contract using the direct data
      console.log(`🔄 Rebuilding game state for ${playerState.currentAttempt} attempts`);
      
      for (
        let attemptIndex = 0;
        attemptIndex < playerState.currentAttempt;
        attemptIndex++
      ) {
        try {
          console.log(`📥 Processing attempt ${attemptIndex} data from blockchain...`);
          
          // Get the data for this attempt from our array
          const result = attemptDataArray[attemptIndex] as [bigint, bigint, bigint, bigint];
          
          console.log(`📊 Raw getPlayerAttempt(${targetGameId}, ${address}, ${attemptIndex}) result:`, result);
          console.log(`📊 Result array length: ${result?.length || 'undefined'}`);
          console.log(`📊 Result type: ${typeof result}`);

          if (!result || !Array.isArray(result) || result.length !== 4) {
            console.error(`❌ Invalid getPlayerAttempt result format for attempt ${attemptIndex}:`, result);
            console.warn(`Expected array with 4 elements [equationGuess, resultGuess, equationXor, encryptedResultFeedback]`);
            continue;
          }
          
          const [
            equationGuess,
            resultGuess,
            equationXor,
            encryptedResultFeedback,
          ] = result;

          console.log(`🔐 Attempt ${attemptIndex} - encrypted values from blockchain:`, {
            equationGuess: equationGuess?.toString() || 'undefined',
            resultGuess: resultGuess?.toString() || 'undefined', 
            equationXor: equationXor?.toString() || 'undefined',
            resultFeedback: encryptedResultFeedback?.toString() || 'undefined',
          });

          // Check if we have valid encrypted data before attempting to unseal
          if (
            equationGuess === BigInt(0) &&
            resultGuess === BigInt(0) &&
            equationXor === BigInt(0) &&
            encryptedResultFeedback === BigInt(0)
          ) {
            console.warn(
              `⚠️ All encrypted values are 0 for attempt ${attemptIndex}`
            );
            console.warn(`This means either:`);
            console.warn(`  1. Transaction hasn't been fully processed yet`);
            console.warn(`  2. No guess was actually stored for this attempt`);
            console.warn(`  3. Contract storage issue`);
            console.log(
              `Skipping attempt ${attemptIndex} - no encrypted data available on blockchain`
            );
            continue;
          }

          console.log(
            `✅ Valid encrypted data found for attempt ${attemptIndex}, proceeding to unseal...`
          );

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
            equation: unsealedEquation?.data?.toString() || "null",
            result: unsealedResult?.data?.toString() || "null",
            xor: unsealedXor?.data?.toString() || "null",
            resultFeedback: unsealedResultFeedback?.data?.toString() || "null",
          });

          // Check if unsealing was successful
          if (
            !unsealedEquation?.success ||
            !unsealedResult?.success ||
            !unsealedXor?.success ||
            !unsealedResultFeedback?.success
          ) {
            console.error(`Failed to unseal attempt ${attemptIndex}:`, {
              equation: unsealedEquation?.error || "unknown error",
              result: unsealedResult?.error || "unknown error",
              xor: unsealedXor?.error || "unknown error",
              resultFeedback: unsealedResultFeedback?.error || "unknown error",
            });
            console.log(
              `Skipping attempt ${attemptIndex} due to unsealing failures`
            );
            continue; // Skip this attempt and continue with next one
          }

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
          console.log(`Added guess ${attemptIndex}:`, guess);
        } catch (error) {
          console.error(`Failed to fetch attempt ${attemptIndex}:`, error);
          break;
        }
      }

      // Handle case where no valid guesses were found
      if (guesses.length === 0 && playerState.currentAttempt > 0) {
        console.warn(
          `⚠️ Player has ${playerState.currentAttempt} attempts but no valid encrypted data found`
        );
        console.warn(
          `This suggests transactions are still being processed or there's a contract issue`
        );
        console.log(`Creating game state with empty guesses for now`);
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
  };

  const syncGameStateFromContract = async () => {
    if (!address || gameId === null || gameId === undefined) {
      console.log("Cannot sync game state - missing requirements");
      return;
    }

    try {
      console.log(`🔄 Syncing game state for game ${gameId}...`);
      const playerState = await fetchPlayerGameState(gameId);

      if (!playerState) {
        console.log("❌ Failed to fetch player state from contract");
        return;
      }

      console.log("📊 Player state from contract:", playerState);
      console.log(
        `📈 Contract shows ${playerState.currentAttempt} attempts made, hasWon: ${playerState.hasWon}`
      );

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
  };

  const processTransactionSuccess = async (
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
      console.log("Current game state:", {
        gameId: currentGameState.gameId,
        currentAttempt: currentGameState.currentAttempt,
        guessesLength: currentGameState.guesses.length,
        hasWon: currentGameState.hasWon
      });

      // Get the last attempt number from current game state
      const lastAttemptIndex = currentGameState.currentAttempt;
      console.log(`📥 Getting XOR feedback for attempt ${lastAttemptIndex}...`);
      console.log(`📊 attemptRefetchArray length: ${attemptRefetchArray.length}`);
      
      // Check if refetch function exists for this attempt index
      if (!attemptRefetchArray[lastAttemptIndex]) {
        console.error(`❌ No refetch function available for attempt ${lastAttemptIndex}`);
        console.log("Available refetch functions:", attemptRefetchArray.length);
        return false;
      }
      
      // Refetch only the specific attempt data to get fresh XOR result
      console.log(`🔄 Calling refetch for attempt ${lastAttemptIndex}...`);
      const refetchResult = await attemptRefetchArray[lastAttemptIndex]();
      const result = refetchResult.data as [bigint, bigint, bigint, bigint];
      
      console.log(`📊 Raw attempt data for ${lastAttemptIndex}:`, result);
      
      if (!result || !Array.isArray(result) || result.length !== 4) {
        console.error(`❌ Invalid attempt data format:`, result);
        return false;
      }
      
      // We only need the XOR result (third element) for color feedback
      const [, , equationXor, encryptedResultFeedback] = result;

      console.log("🔐 XOR and result feedback from blockchain:", {
        equationXor: equationXor?.toString() || 'undefined',
        resultFeedback: encryptedResultFeedback?.toString() || 'undefined',
      });

      // Check if we have valid XOR data
      if (!equationXor || equationXor === BigInt(0)) {
        console.warn("⚠️ XOR value is 0 - transaction might not be processed yet");
        return false;
      }

      // Unseal only the XOR and result feedback
      const [unsealedXor, unsealedResultFeedback] = await Promise.all([
        unsealValue(equationXor as bigint, FheTypes.Uint128),
        unsealValue(encryptedResultFeedback as bigint, FheTypes.Uint8),
      ]);

      console.log("Unsealed XOR feedback:", {
        xor: unsealedXor?.data?.toString() || "null",
        resultFeedback: unsealedResultFeedback?.data?.toString() || "null",
      });

      // Check if unsealing was successful
      if (!unsealedXor?.success || !unsealedResultFeedback?.success) {
        console.error("Failed to unseal XOR feedback:", {
          xor: unsealedXor?.error || "unknown error",
          resultFeedback: unsealedResultFeedback?.error || "unknown error",
        });
        return false;
      }

      // Process the XOR result to get color feedback
      const xorValue = BigInt(unsealedXor.data || 0);
      console.log("Processing XOR value:", xorValue.toString());

      // Analyze XOR to get tile feedback colors
      const feedback = analyzeXorResult(xorValue);
      console.log("Color feedback from XOR:", feedback);

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

      console.log("✅ Processed guess with colors:", guess);

      // Add the guess to the local game state
      const updatedGameState = {
        ...currentGameState,
        guesses: [...currentGameState.guesses, guess],
        currentAttempt: currentGameState.currentAttempt + 1,
        hasWon: cellStates.every(f => f === "correct") && guess.resultFeedback === "equal",
        isGameComplete: (cellStates.every(f => f === "correct") && guess.resultFeedback === "equal") || currentGameState.currentAttempt + 1 >= 6
      };

      console.log("Updating game state with color feedback:", updatedGameState);
      
      // Update the game state with color feedback
      setGameState(updatedGameState);
      setGameStateSynced(true);

      console.log("🎨 Game state updated with color feedback successfully");
      return true;
    } catch (error) {
      console.error("Failed to process transaction success:", error);
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
