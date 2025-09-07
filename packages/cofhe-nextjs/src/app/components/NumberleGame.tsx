"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { contractStore } from "../store/contractStore";
import { useGameStore } from "../store/gameStore";
import {
  equationToAllRotations,
  analyzeXorResult,
  extractOriginalEquation,
} from "../../../utils";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/web";
import { useDecryptEquation } from "../hooks/useDecryptEquation";
import { RulesModal } from "./RulesModal";

type TileState = "empty" | "correct" | "present" | "absent";

interface Tile {
  value: string;
  state: TileState;
}

const EQUATION_LENGTH = 5;
const MAX_ATTEMPTS = 6;

export function NumberleGame({
  gameId: propGameId,
}: {
  gameId: number | null;
}) {
  // Contract and wallet integration
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Decryption hook for finalize game functionality
  const {
    isFinalizingGame,
    finalizeMessage,
    finalizeGame,
    decryptFinalizedEquation,
    hasDecryptedEquation,
    shouldShowFinalizeButton,
  } = useDecryptEquation(address);

  const equleContract = contractStore((state) => state.equle);

  // Game state management
  const {
    gameState,
    setGameState,
    updateCurrentAttempt,
    addGuess,
    setGameStateSynced,
  } = useGameStore();

  const [pendingGuess, setPendingGuess] = useState<{
    equation: string;
    result: number;
    rowIndex: number;
  } | null>(null);

  // Component state
  const [currentInput, setCurrentInput] = useState("");
  const [currentCol, setCurrentCol] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [hoveredResultTile, setHoveredResultTile] = useState<number | null>(
    null
  );
  const [warningMessage, setWarningMessage] = useState<string>("");

  const hasAtLeastOneOperation = (expression: string): boolean => {
    return /[+\-*/]/.test(expression);
  };

  const isValidExpression = (expression: string): boolean => {
    if (expression.length !== EQUATION_LENGTH) return false;
    if (expression.includes("=")) return false;
    if (!hasAtLeastOneOperation(expression)) return false;

    // Check if first or last character is an operation
    if (
      /[+\-*/]/.test(expression[0]) ||
      /[+\-*/]/.test(expression[expression.length - 1])
    ) {
      return false;
    }

    try {
      // Basic validation - will be validated on contract
      return true;
    } catch {
      return false;
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && pendingGuess && gameState) {
      handleTransactionSuccess();
    }
  }, [isConfirmed, pendingGuess, gameState]);

  const handleTransactionSuccess = async () => {
    if (!pendingGuess || !equleContract || !address || !gameState) {
      console.log(
        "Cannot process transaction success - missing requirements:",
        {
          pendingGuess: !!pendingGuess,
          equleContract: !!equleContract,
          address: !!address,
          gameState: !!gameState,
        }
      );
      return;
    }

    try {
      console.log("Transaction confirmed, processing feedback...");

      // Fetch encrypted data from the contract
      const attemptIndex = gameState.currentAttempt;
      const [equationGuess, resultGuess, equationXor, encryptedResultFeedback] =
        await (equleContract as any).read.getPlayerAttempt([
          gameState.gameId,
          address,
          attemptIndex,
        ]);

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
        unsealValue(resultGuess as bigint, FheTypes.Uint16),
        unsealValue(equationXor as bigint, FheTypes.Uint128),
        unsealValue(encryptedResultFeedback as bigint, FheTypes.Uint8),
      ]);

      console.log("Unsealed values:", {
        equation: unsealedEquation?.data?.toString(),
        result: unsealedResult?.data?.toString(),
        xor: unsealedXor?.data?.toString(),
        resultFeedback: unsealedResultFeedback?.data?.toString(),
      });

      // Process the unsealed data
      const reconstructedEquation = extractOriginalEquation(
        unsealedEquation?.data as bigint
      );
      const reconstructedResult = unsealedResult?.data?.toString() || "0";

      // Process XOR feedback into color feedback
      const xorAnalysis = analyzeXorResult(unsealedXor?.data as bigint);
      const colorFeedback: TileState[] = [];

      for (let i = 0; i < 5; i++) {
        if (xorAnalysis.green[i]) {
          colorFeedback.push("correct");
        } else if (xorAnalysis.yellow[i]) {
          colorFeedback.push("present");
        } else {
          colorFeedback.push("absent");
        }
      }

      // Process result feedback from unsealed data
      const resultFeedbackValue = Number(unsealedResultFeedback?.data || 0);
      // Convert numeric feedback: 0 = equal, 1 = less than, 2 = greater than
      let processedResultFeedback: "equal" | "less" | "greater" = "equal";
      if (resultFeedbackValue === 1) processedResultFeedback = "less";
      else if (resultFeedbackValue === 2) processedResultFeedback = "greater";

      // Create the guess data with real processed feedback
      const guessData = {
        equation: reconstructedEquation,
        result: reconstructedResult,
        feedback: colorFeedback,
        resultFeedback: processedResultFeedback,
      };

      console.log("Processed guess data:", guessData);

      // Add guess to gameStore (this will persist to localStorage)
      addGuess(guessData);

      // Update current attempt count
      updateCurrentAttempt(gameState.currentAttempt + 1);

      // Keep gameStore synced
      setGameStateSynced(true);

      console.log(
        "Guess successfully persisted to gameStore with real feedback:",
        guessData
      );

      // Reset input state for next guess
      setCurrentInput("");
      setCurrentCol(0);

      // Clear pending guess
      setPendingGuess(null);
    } catch (error) {
      console.error("Error processing transaction success:", error);
      // Clear pending guess even on error to prevent stuck state
      setPendingGuess(null);
    }
  };

  // Contract synchronization functions

  const fetchPlayerGameState = async (gameId: number) => {
    if (!equleContract || !address) return null;

    try {
      const [currentAttempt, hasWon] = await (
        equleContract as any
      ).read.getPlayerGameState([gameId, address]);

      return {
        currentAttempt: Number(currentAttempt),
        hasWon: Boolean(hasWon),
      };
    } catch (error) {
      console.error("Failed to fetch player game state:", error);
      return null;
    }
  };

  const syncGameStateFromContract = async () => {
    if (!equleContract || !address || !isConnected || propGameId === null) {
      console.log("Cannot sync game state - missing requirements");
      return;
    }

    try {
      // Use the gameId from props
      const gameId = propGameId;

      // Get player's current state for this game
      const playerState = await fetchPlayerGameState(gameId);
      if (!playerState) return;

      // Check if we need to sync with localStorage
      const needsSync =
        !gameState ||
        gameState.gameId !== gameId ||
        gameState.currentAttempt !== playerState.currentAttempt;

      if (needsSync) {
        console.log("Syncing game state from contract...", {
          contractGameId: gameId,
          contractAttempts: playerState.currentAttempt,
          localGameId: gameState?.gameId,
          localAttempts: gameState?.currentAttempt,
        });

        // Rebuild game state from contract
        await rebuildGameStateFromContract(gameId, playerState);
      } else {
        // Local state is current, just mark as synced
        console.log("Local game state is current, marking as synced");
        setGameStateSynced(true);
      }
    } catch (error) {
      console.error("Failed to sync game state:", error);
    }
  };

  const rebuildGameStateFromContract = async (
    gameId: number,
    playerState: { currentAttempt: number; hasWon: boolean }
  ) => {
    if (!equleContract || !address) {
      console.log("Missing requirements for rebuilding game state:", {
        equleContract: !!equleContract,
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
          const [
            equationGuess,
            resultGuess,
            equationXor,
            encryptedResultFeedback,
          ] = await (equleContract as any).read.getPlayerAttempt([
            gameId,
            address,
            attemptIndex,
          ]);

          console.log(`Fetched attempt ${attemptIndex} - encrypted:`, {
            equationGuess: equationGuess.toString(),
            resultGuess: resultGuess.toString(),
            equationXor: equationXor.toString(),
            resultFeedback: encryptedResultFeedback.toString(),
          });

          const [
            unsealedEquation,
            unsealedResult,
            unsealedXor,
            unsealedResultFeedback,
          ] = await Promise.all([
            unsealValue(equationGuess as bigint, FheTypes.Uint128),
            unsealValue(resultGuess as bigint, FheTypes.Uint16),
            unsealValue(equationXor as bigint, FheTypes.Uint128),
            unsealValue(encryptedResultFeedback as bigint, FheTypes.Uint8),
          ]);

          console.log("unsealedEquation", unsealedEquation?.data);
          console.log("unsealedResult", unsealedResult?.data);
          console.log("unsealedXor", unsealedXor?.data);
          console.log("unsealedResultFeedback", unsealedResultFeedback?.data);

          // Process the unsealed data using utility functions
          const reconstructedEquation = extractOriginalEquation(
            unsealedEquation?.data as bigint
          );
          const reconstructedResult = unsealedResult?.data?.toString() || "0";

          // Process XOR feedback into color feedback
          const xorAnalysis = analyzeXorResult(unsealedXor?.data as bigint);
          const colorFeedback: TileState[] = [];

          for (let i = 0; i < 5; i++) {
            if (xorAnalysis.green[i]) {
              colorFeedback.push("correct");
            } else if (xorAnalysis.yellow[i]) {
              colorFeedback.push("present");
            } else {
              colorFeedback.push("absent");
            }
          }

          // Process result feedback from unsealed data
          const resultFeedbackValue = Number(unsealedResultFeedback?.data || 0);
          let processedResultFeedback: "equal" | "less" | "greater" = "equal";
          if (resultFeedbackValue === 1) processedResultFeedback = "less";
          else if (resultFeedbackValue === 2)
            processedResultFeedback = "greater";

          const guess = {
            equation: reconstructedEquation,
            result: reconstructedResult,
            feedback: colorFeedback,
            resultFeedback: processedResultFeedback,
          };

          guesses.push(guess);

          console.log(`Processed attempt ${attemptIndex}:`, guess);
        } catch (error) {
          console.error(`Failed to fetch attempt ${attemptIndex}:`, error);
          // Continue with other attempts even if one fails
        }
      }

      const newGameState = {
        gameId,
        currentAttempt: playerState.currentAttempt,
        guesses,
        hasWon: playerState.hasWon,
        isGameComplete: playerState.hasWon || playerState.currentAttempt >= 6,
        maxAttempts: 6,
      };

      setGameState(newGameState);
      setGameStateSynced(true);

      console.log("Game state rebuilt from contract:", newGameState);
    } catch (error) {
      console.error("Failed to rebuild game state from contract:", error);
    }
  };

  const handleKeyPress = (key: string) => {
    if (gameState?.isGameComplete || shouldShowFinalizeButton) return;

    if (key === "Enter") {
      submitGuess();
    } else if (key === "Backspace") {
      if (currentCol > 0) {
        setCurrentInput((prev) => prev.slice(0, -1));
        setCurrentCol(currentCol - 1);
      }
    } else if (isValidInput(key) && currentCol < EQUATION_LENGTH) {
      setCurrentInput((prev) => prev + key);
      setCurrentCol(currentCol + 1);
    }
  };

  const isValidInput = (key: string): boolean => {
    return /^[0-9+\-*/]$/.test(key);
  };

  // Calculate the result using left-to-right evaluation (same as contract logic)
  const calculateResult = (expression: string): number => {
    let result = 0;
    let currentNumber = 0;
    let operator = "+";

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      if (!isNaN(Number(char))) {
        currentNumber = currentNumber * 10 + Number(char);
      }

      if (["+", "-", "*", "/"].includes(char) || i === expression.length - 1) {
        switch (operator) {
          case "+":
            result = result + currentNumber;
            break;
          case "-":
            result = result - currentNumber;
            break;
          case "*":
            result = result * currentNumber;
            break;
          case "/":
            result = result / currentNumber;
            break;
        }
        operator = char;
        currentNumber = 0;
      }
    }
    return result;
  };

  // CoFHE unsealing utility function
  const unsealValue = async (encryptedValue: bigint, fheType: FheTypes) => {
    if (!address) throw new Error("Address not available");

    const permit = await cofhejs.getPermit();
    const unsealedValue = await cofhejs.unseal(
      encryptedValue,
      fheType,
      address,
      permit.data?.getHash()
    );
    console.log("unsealedValue", unsealedValue);
    return unsealedValue;
  };

  // Create display board from gameState + current input
  const getDisplayBoard = (): Tile[][] => {
    const displayBoard: Tile[][] = [];

    // Fill completed rows from gameState
    if (gameState?.guesses) {
      for (let i = 0; i < gameState.guesses.length; i++) {
        const guess = gameState.guesses[i];
        const row: Tile[] = [];

        for (let j = 0; j < EQUATION_LENGTH; j++) {
          row.push({
            value: guess.equation[j] || "",
            state: guess.feedback[j] || "empty",
          });
        }
        displayBoard.push(row);
      }
    }

    // Add current input row
    if (displayBoard.length < MAX_ATTEMPTS && !gameState?.isGameComplete) {
      const currentRowData: Tile[] = [];
      const currentGuess = currentInput;

      for (let j = 0; j < EQUATION_LENGTH; j++) {
        currentRowData.push({
          value: currentGuess[j] || "",
          state: "empty",
        });
      }
      displayBoard.push(currentRowData);
    }

    // Fill remaining empty rows
    while (displayBoard.length < MAX_ATTEMPTS) {
      const emptyRow: Tile[] = Array(EQUATION_LENGTH).fill({
        value: "",
        state: "empty",
      });
      displayBoard.push(emptyRow);
    }

    return displayBoard;
  };

  const submitGuess = async () => {
    if (currentCol !== EQUATION_LENGTH) return;
    if (!equleContract || !address || !isConnected) return;
    if (gameState?.isGameComplete || shouldShowFinalizeButton) return;

    const currentGuess = currentInput;

    if (!isValidExpression(currentGuess)) {
      if (!hasAtLeastOneOperation(currentGuess)) {
        setWarningMessage("Please include at least one operation (+, -, *, /)");
      } else {
        setWarningMessage("Please enter a valid mathematical expression");
      }
      setTimeout(() => setWarningMessage(""), 3000);
      return;
    }

    setWarningMessage("");

    const playerResult = calculateResult(currentGuess);

    // Store pending guess for transaction success handling
    setPendingGuess({
      equation: currentGuess,
      result: playerResult,
      rowIndex: gameState?.currentAttempt || 0,
    });

    try {
      if (!cofhejs) {
        throw new Error("CoFHE not initialized");
      }

      console.log("Submitting guess to contract:", currentGuess);

      // Convert equation to bit representation using utility function
      const playerEquationBits = equationToAllRotations(currentGuess);

      // Encrypt the guess and result using CoFHE.js
      const encryptedGuess = await cofhejs.encrypt([
        Encryptable.uint128(playerEquationBits),
      ] as const);

      const encryptedPlayerResult = await cofhejs.encrypt([
        Encryptable.uint16(BigInt(playerResult)),
      ] as const);

      console.log("encryptedGuess", encryptedGuess.data?.[0]);
      console.log("encryptedPlayerResult", encryptedPlayerResult.data?.[0]);

      // Submit to contract
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "guess",
        args: [encryptedGuess.data?.[0], encryptedPlayerResult.data?.[0]],
      });

      console.log("Guess transaction initiated:", {
        equation: currentGuess,
        result: playerResult,
      });

      // Note: Transaction is async, game state will sync when it's mined
    } catch (error) {
      console.error("Error submitting guess:", error);
      setWarningMessage("Error submitting guess. Please try again.");
      setTimeout(() => setWarningMessage(""), 3000);
    }
  };

  const getTileStyle = (state: TileState): string => {
    switch (state) {
      case "correct":
        return "bg-green-500 text-white";
      case "present":
        return "bg-yellow-500 text-white";
      case "absent":
        return "bg-gray-500 text-white";
      default:
        return "bg-white text-black";
    }
  };

  const getKeyboardKeyStyle = () => {
    const baseClass =
      "w-8 h-10 rounded text-sm font-semibold transition-colors duration-200";
    const style: React.CSSProperties = {
      backgroundColor: "#9ca3af",
      color: "white",
    };
    return { className: baseClass, style };
  };

  const getResultTileStyle = (rowIndex: number): string => {
    const baseStyle =
      "w-12 h-12 rounded flex items-center justify-center text-lg font-bold transition-colors duration-300";

    // For completed rows, get from gameState
    if (gameState?.guesses && rowIndex < gameState.guesses.length) {
      const guess = gameState.guesses[rowIndex];

      // Color based on result feedback
      if (guess.resultFeedback === "equal") {
        return `${baseStyle} bg-green-500 text-white`; // Green for correct
      } else if (guess.resultFeedback === "less") {
        return `${baseStyle} bg-cyan-400 text-white`; // Blue for too low
      } else if (guess.resultFeedback === "greater") {
        return `${baseStyle} bg-red-400 text-white`; // Red for too high
      }
    }

    // For current row (if user is typing), show neutral style
    if (
      rowIndex === (gameState?.currentAttempt || 0) &&
      currentInput.length === EQUATION_LENGTH
    ) {
      return `${baseStyle} bg-gray-400 text-white`;
    }

    // Default empty state
    return `${baseStyle} bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500`;
  };

  const getResultDisplay = (
    rowIndex: number
  ): { value: string; arrow: string } => {
    // For completed rows, get from gameState
    if (gameState?.guesses && rowIndex < gameState.guesses.length) {
      const guess = gameState.guesses[rowIndex];
      const value = guess.result;

      // Get arrow based on result feedback
      let arrow = "";
      if (guess.resultFeedback === "less") arrow = "↑";
      else if (guess.resultFeedback === "greater") arrow = "↓";
      else if (guess.resultFeedback === "equal") arrow = "✓";

      return { value, arrow };
    }

    // For current row (if user is typing), calculate result on-the-fly
    if (
      rowIndex === (gameState?.currentAttempt || 0) &&
      currentInput.length === EQUATION_LENGTH
    ) {
      try {
        const result = calculateResult(currentInput);
        return { value: result.toString(), arrow: "" };
      } catch (error) {
        return { value: "", arrow: "" };
      }
    }

    return { value: "", arrow: "" };
  };

  const getResultTooltip = (rowIndex: number): string => {
    // For completed rows, get from gameState with feedback info
    if (gameState?.guesses && rowIndex < gameState.guesses.length) {
      const guess = gameState.guesses[rowIndex];
      let feedbackText = "";
      if (guess.resultFeedback === "equal") feedbackText = " (Correct!)";
      else if (guess.resultFeedback === "less") feedbackText = " (Too low)";
      else if (guess.resultFeedback === "greater") feedbackText = " (Too high)";

      return `Result: ${guess.result}${feedbackText}`;
    }

    // For current row
    if (rowIndex === (gameState?.currentAttempt || 0)) {
      if (currentInput.length === EQUATION_LENGTH) {
        try {
          const result = calculateResult(currentInput);
          return `Result: ${result}`;
        } catch (error) {
          return "Invalid equation";
        }
      }
      return "Complete equation to see result";
    }

    return "Result will appear here";
  };

  const handleVirtualKeyboard = (key: string) => {
    handleKeyPress(key);
  };

  // Contract sync effect - runs when contract or wallet state changes
  useEffect(() => {
    if (equleContract && address && isConnected) {
      syncGameStateFromContract();
    }
  }, [equleContract, address, isConnected]);

  // Keyboard handler effect
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyPress(event.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentCol, gameState?.isGameComplete]);

  return (
    <div
      className="max-w-lg mx-auto p-4 rounded-xl shadow-lg relative"
      style={{ backgroundColor: "#122531" }}
    >
      <div className="text-center mb-6 relative z-10">
        <button
          onClick={() => setShowRules(true)}
          className="mt-2 text-sm underline hover:opacity-80"
          style={{ color: "#0AD9DC" }}
        >
          How to play
        </button>
      </div>

      {/* Warning Message */}
      {warningMessage && (
        <div className="mb-4 text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative inline-block">
            <span className="block sm:inline">{warningMessage}</span>
          </div>
        </div>
      )}

      {/* Winning Message and Finalize Button */}
      {shouldShowFinalizeButton && (
        <div className="mb-4 text-center">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative inline-block mb-3">
            <div className="text-lg font-bold mb-2"> You solved it! </div>
            <div className="text-sm">
              {hasDecryptedEquation()
                ? "Equation is ready! Click to finalize your victory."
                : 'Click "Finalize Game" to claim your victory and reveal the solution!'}
            </div>
          </div>

          {!isFinalizingGame ? (
            <button
              onClick={
                hasDecryptedEquation() ? decryptFinalizedEquation : finalizeGame
              }
              className="px-6 py-3 text-white rounded-lg font-semibold transition-colors duration-200 hover:opacity-90 shadow-lg"
              style={{ backgroundColor: "#0AD9DC" }}
            >
              {hasDecryptedEquation() ? "Claim Victory" : "Finalize Game"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-cyan-400"></div>
              <div className="text-sm font-medium text-white">
                {finalizeMessage || "Processing..."}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Finalize Message */}
      {finalizeMessage && !shouldShowFinalizeButton && (
        <div className="mb-4 text-center">
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative inline-block">
            <span className="block sm:inline">{finalizeMessage}</span>
          </div>
        </div>
      )}

      {/* Game Board */}
      <div className="flex justify-center mb-6 relative z-10">
        <div className="grid gap-2">
          {getDisplayBoard().map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2 items-center">
              <div className="grid grid-cols-5 gap-2">
                {row.map((tile, colIndex) => (
                  <div
                    key={colIndex}
                    className={`
                      w-12 h-12 rounded flex items-center justify-center
                      text-lg font-bold transition-colors duration-300
                      ${getTileStyle(tile.state)}
                      ${
                        rowIndex === (gameState?.currentAttempt || 0) &&
                        colIndex === currentCol
                          ? "ring-2 ring-blue-500"
                          : ""
                      }
                    `}
                  >
                    {tile.value ||
                      (tile.state === "empty" &&
                      rowIndex >= (gameState?.currentAttempt || 0)
                        ? ""
                        : "")}
                  </div>
                ))}
              </div>

              {/* Equals sign - always visible */}
              <span className="text-lg font-bold text-gray-600 dark:text-gray-300 mx-1">
                =
              </span>

              {/* Result tile - always visible */}
              <div className="relative">
                <div
                  className={getResultTileStyle(rowIndex)}
                  onMouseEnter={() => setHoveredResultTile(rowIndex)}
                  onMouseLeave={() => setHoveredResultTile(null)}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-sm font-bold">
                      {getResultDisplay(rowIndex).value}
                    </span>
                    {getResultDisplay(rowIndex).arrow && (
                      <span className="text-xs">
                        {getResultDisplay(rowIndex).arrow}
                      </span>
                    )}
                  </div>
                </div>

                {/* Custom tooltip */}
                {hoveredResultTile === rowIndex && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
                    <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {getResultTooltip(rowIndex)}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Keyboard */}
      <div className="space-y-2 relative z-10">
        <div className="flex gap-1 justify-center">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((key) => {
            const { className, style } = getKeyboardKeyStyle();
            return (
              <button
                key={key}
                onClick={() => handleVirtualKeyboard(key)}
                className={className}
                style={style}
              >
                {key}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 justify-center">
          {["+", "-", "*", "/"].map((key) => {
            const { className, style } = getKeyboardKeyStyle();
            return (
              <button
                key={key}
                onClick={() => handleVirtualKeyboard(key)}
                className={className}
                style={style}
              >
                {key}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 justify-center mt-4">
          <button
            onClick={() => handleVirtualKeyboard("Enter")}
            className="px-4 py-2 text-white rounded font-semibold transition-colors duration-200 hover:opacity-80"
            style={{ backgroundColor: "#0AD9DC" }}
          >
            Enter
          </button>
          <button
            onClick={() => handleVirtualKeyboard("Backspace")}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-semibold
                       transition-colors duration-200"
          >
            ⌫
          </button>
        </div>
      </div>

      {/* Win/Loss Message - shown when game is over */}
      {gameState?.isGameComplete && (
        <div className="mt-6 text-center relative z-10">
          {gameState?.hasWon ? (
            <div className="mb-4">
              <div className="text-2xl font-bold text-green-400 mb-2">
                Congratulations!
              </div>
              <div className="text-lg text-gray-300">
                You found the correct equation!
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="text-xl font-bold text-red-400 mb-2">
                Game Over
              </div>
              <div className="text-lg text-gray-300">
                Better luck next time!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
