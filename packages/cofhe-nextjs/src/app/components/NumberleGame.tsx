"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useGameStore } from "../store/gameStore";
import { useDecryptEquation } from "../hooks/useDecryptEquation";
import { useGameSync } from "../hooks/useGameSync";
import { useGuessSubmission } from "../hooks/useGuessSubmission";
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
  const { 
    submitGuess: submitGuessToContract, 
    isSubmitting, 
    submissionError, 
    hash,
    clearError 
  } = useGuessSubmission();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Game state management
  const { gameState, isGameStateSynced } = useGameStore();

  // Game synchronization hook
  const { syncGameStateFromContract, processTransactionSuccess } = useGameSync(
    address,
    propGameId
  );

  // Decryption hook for finalize game functionality
  const {
    isFinalizingGame,
    finalizeMessage,
    finalizeGame,
    decryptFinalizedEquation,
    hasDecryptedEquation,
    shouldShowFinalizeButton,
  } = useDecryptEquation(address);

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

  // Handle transaction confirmation
  useEffect(() => {
    console.log("🔍 Transaction confirmation useEffect triggered:", {
      isConfirmed,
      pendingGuess: !!pendingGuess,
      gameState: !!gameState,
    });
    
    if (isConfirmed && pendingGuess && gameState) {
      console.log("✅ All conditions met, calling handleTransactionSuccess");
      handleTransactionSuccess();
    } else {
      console.log("⏸️ Conditions not met for transaction success processing");
    }
  }, [isConfirmed, pendingGuess, gameState]);

  const handleTransactionSuccess = async () => {
    console.log("🔥 handleTransactionSuccess called", {
      pendingGuess: !!pendingGuess,
      gameState: !!gameState,
    });
    
    if (!pendingGuess) {
      console.log("❌ No pending guess found");
      return;
    }
    
    console.log("📞 Calling processTransactionSuccess...");
    const success = await processTransactionSuccess(pendingGuess, gameState);
    
    console.log("✨ processTransactionSuccess result:", success);
    
    if (success) {
      console.log("🎉 Transaction success! Resetting UI state");
      // Reset input state for next guess
      setCurrentInput("");
      setCurrentCol(0);
      // Clear pending guess
      setPendingGuess(null);
    } else {
      console.log("❌ Transaction success processing failed");
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

  // Use calculateResult from the hook for consistency
  const { calculateResult } = useGuessSubmission();


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
    if (!address || !isConnected) return;
    if (gameState?.isGameComplete || shouldShowFinalizeButton) return;
    if (isSubmitting) return;

    const currentGuess = currentInput;

    // Basic validation - detailed validation is in the hook
    if (!hasAtLeastOneOperation(currentGuess)) {
      setWarningMessage("Please include at least one operation (+, -, *, /)");
      setTimeout(() => setWarningMessage(""), 3000);
      return;
    }

    // Clear any previous errors
    clearError();
    setWarningMessage("");

    const playerResult = calculateResult(currentGuess);

    // Store pending guess for transaction success handling
    const pendingGuessData = {
      equation: currentGuess,
      result: playerResult,
      rowIndex: gameState?.currentAttempt || 0,
    };
    setPendingGuess(pendingGuessData);

    // Submit using the hook with success and error callbacks
    const success = await submitGuessToContract(
      currentGuess,
      address,
      (data) => {
        console.log("Guess submitted successfully:", data);
        // The hook will trigger writeContract, and transaction success will be handled in useEffect
      },
      (error) => {
        console.error("Failed to submit guess:", error);
        setWarningMessage(error);
        setTimeout(() => setWarningMessage(""), 3000);
        setPendingGuess(null); // Clear pending guess on error
      }
    );

    if (!success && submissionError) {
      setWarningMessage(submissionError);
      setTimeout(() => setWarningMessage(""), 3000);
      setPendingGuess(null);
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

  // Contract sync effect - runs when wallet state changes
  useEffect(() => {
    if (address && isConnected && propGameId !== null && !isGameStateSynced) {
      syncGameStateFromContract();
    }
  }, [address, isConnected, propGameId, isGameStateSynced, syncGameStateFromContract]);

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
