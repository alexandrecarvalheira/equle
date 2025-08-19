"use client";

import { useState, useEffect } from "react";

type TileState = "empty" | "correct" | "present" | "absent";

interface Tile {
  value: string;
  state: TileState;
}

const EQUATION_LENGTH = 5;
const MAX_ATTEMPTS = 6;

const EQUATION_POOL = [
  { equation: "8*6-2", result: 46 },
  { equation: "4+3*5", result: 19 },
  { equation: "9/3+7", result: 10 },
  { equation: "2*8-1", result: 15 },
  { equation: "6+4*2", result: 14 },
  { equation: "30/15", result: 2 },
  { equation: "7*2+3", result: 17 },
  { equation: "32-12", result: 20 },
  { equation: "5*4-8", result: 12 },
  { equation: "89-43", result: 46 },
  { equation: "247+9", result: 256 },
  { equation: "873*1", result: 873 },
];

const getRandomEquation = () => {
  const randomIndex = Math.floor(Math.random() * EQUATION_POOL.length);
  return EQUATION_POOL[randomIndex];
};

const initializeBoard = (): Tile[][] => {
  const newBoard: Tile[][] = [];
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const row: Tile[] = [];
    for (let j = 0; j < EQUATION_LENGTH; j++) {
      row.push({ value: "", state: "empty" });
    }
    newBoard.push(row);
  }
  return newBoard;
};

export function NumberleGame() {
  const [board, setBoard] = useState<Tile[][]>(() => initializeBoard());
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [showRules, setShowRules] = useState(false);
  const [currentEquationData, setCurrentEquationData] = useState(() =>
    getRandomEquation()
  );
  const [resultFeedback, setResultFeedback] = useState<string[]>([]);
  const [rowResults, setRowResults] = useState<(number | null)[]>(
    new Array(MAX_ATTEMPTS).fill(null)
  );
  const [rowFeedback, setRowFeedback] = useState<string[]>(
    new Array(MAX_ATTEMPTS).fill("")
  );
  const [keyboardStatus, setKeyboardStatus] = useState<
    Record<string, TileState>
  >({});

  const hasAtLeastOneOperation = (expression: string): boolean => {
    return /[+\-*/]/.test(expression);
  };

  const isValidExpression = (expression: string): boolean => {
    if (expression.length !== EQUATION_LENGTH) return false;
    if (expression.includes("=")) return false;
    if (!hasAtLeastOneOperation(expression)) return false;

    try {
      // Check if it's a valid mathematical expression
      const result = eval(expression.replace(/[^0-9+\-*/()]/g, ""));
      return typeof result === "number" && !isNaN(result);
    } catch {
      return false;
    }
  };

  const evaluateExpression = (expression: string): number => {
    try {
      return eval(expression.replace(/[^0-9+\-*/()]/g, ""));
    } catch {
      return NaN;
    }
  };

  const handleKeyPress = (key: string) => {
    if (gameStatus !== "playing") return;

    if (key === "Enter") {
      submitGuess();
    } else if (key === "Backspace") {
      if (currentCol > 0) {
        const newBoard = [...board];
        newBoard[currentRow][currentCol - 1] = { value: "", state: "empty" };
        setBoard(newBoard);
        setCurrentCol(currentCol - 1);
      }
    } else if (isValidInput(key) && currentCol < EQUATION_LENGTH) {
      const newBoard = [...board];
      newBoard[currentRow][currentCol] = { value: key, state: "empty" };
      setBoard(newBoard);
      setCurrentCol(currentCol + 1);
    }
  };

  const isValidInput = (key: string): boolean => {
    return /^[0-9+\-*/]$/.test(key);
  };

  const submitGuess = () => {
    if (currentCol !== EQUATION_LENGTH) return;

    const currentGuess = board[currentRow]
      .map((tile: Tile) => tile.value)
      .join("");

    if (!isValidExpression(currentGuess)) {
      if (!hasAtLeastOneOperation(currentGuess)) {
        alert("Please include at least one operation (+, -, *, /)");
      } else {
        alert("Please enter a valid mathematical expression");
      }
      return;
    }

    const guessResult = evaluateExpression(currentGuess);
    const newBoard = [...board];

    // Provide Wordle-style feedback: exact position match vs presence
    for (let i = 0; i < EQUATION_LENGTH; i++) {
      const guessChar = currentGuess[i];
      const targetChar = currentEquationData.equation[i];

      if (guessChar === targetChar) {
        newBoard[currentRow][i].state = "correct";
      } else if (currentEquationData.equation.includes(guessChar)) {
        newBoard[currentRow][i].state = "present";
      } else {
        newBoard[currentRow][i].state = "absent";
      }
    }

    setBoard(newBoard);

    // Update keyboard status based on feedback
    const newKeyboardStatus = { ...keyboardStatus };
    for (let i = 0; i < EQUATION_LENGTH; i++) {
      const guessChar = currentGuess[i];
      const currentStatus = newKeyboardStatus[guessChar];
      const newStatus = newBoard[currentRow][i].state;

      // Only update if the new status is "better" than the current one
      // Priority: correct > present > absent
      if (
        !currentStatus ||
        (currentStatus === "absent" &&
          (newStatus === "present" || newStatus === "correct")) ||
        (currentStatus === "present" && newStatus === "correct")
      ) {
        newKeyboardStatus[guessChar] = newStatus;
      }
    }
    setKeyboardStatus(newKeyboardStatus);

    // Store the result for this row
    const newRowResults = [...rowResults];
    newRowResults[currentRow] = guessResult;
    setRowResults(newRowResults);

    // Provide higher/lower feedback based on result
    const newRowFeedback = [...rowFeedback];
    const newFeedback = [...resultFeedback];

    // Check for exact equation match (win condition)
    if (currentGuess === currentEquationData.equation) {
      newFeedback.push("🎉 Perfect! You found the exact equation!");
      newRowFeedback[currentRow] = "🎉 Exact match!";
      setGameStatus("won");
    } else {
      // Provide result comparison as a helper clue
      if (guessResult === currentEquationData.result) {
        newFeedback.push("🎯 Right result, wrong equation!");
        newRowFeedback[currentRow] = "🎯 Right result";
      } else if (guessResult < currentEquationData.result) {
        newFeedback.push("📈 Your result is too low");
        newRowFeedback[currentRow] = "📈 Too low";
      } else if (guessResult > currentEquationData.result) {
        newFeedback.push("📉 Your result is too high");
        newRowFeedback[currentRow] = "📉 Too high";
      } else {
        newFeedback.push("❌ Invalid expression");
        newRowFeedback[currentRow] = "❌ Invalid";
      }
    }

    setResultFeedback(newFeedback);
    setRowFeedback(newRowFeedback);

    if (
      currentGuess !== currentEquationData.equation &&
      currentRow === MAX_ATTEMPTS - 1
    ) {
      setGameStatus("lost");
    } else if (currentGuess !== currentEquationData.equation) {
      setCurrentRow(currentRow + 1);
      setCurrentCol(0);
    }
  };

  const resetGame = () => {
    setCurrentRow(0);
    setCurrentCol(0);
    setGameStatus("playing");
    setResultFeedback([]);
    setRowResults(new Array(MAX_ATTEMPTS).fill(null));
    setRowFeedback(new Array(MAX_ATTEMPTS).fill(""));
    setBoard(initializeBoard());
    setCurrentEquationData(getRandomEquation());
    setKeyboardStatus({});
  };

  const getTileStyle = (state: TileState): string => {
    switch (state) {
      case "correct":
        return "bg-green-500 text-white border-green-500";
      case "present":
        return "bg-yellow-500 text-white border-yellow-500";
      case "absent":
        return "bg-gray-500 text-white border-gray-500";
      default:
        return "bg-white text-black border-gray-300";
    }
  };

  const getKeyboardKeyStyle = (key: string): string => {
    const status = keyboardStatus[key];
    const baseStyle =
      "w-8 h-10 rounded text-sm font-semibold transition-colors duration-200";

    switch (status) {
      case "correct":
        return `${baseStyle} bg-green-500 text-white hover:bg-green-600`;
      case "present":
        return `${baseStyle} bg-yellow-500 text-white hover:bg-yellow-600`;
      case "absent":
        return `${baseStyle} bg-gray-500 text-white hover:bg-gray-600`;
      default:
        return `${baseStyle} bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200`;
    }
  };

  const handleVirtualKeyboard = (key: string) => {
    handleKeyPress(key);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyPress(event.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    board,
    currentRow,
    currentCol,
    gameStatus,
    currentEquationData.result,
    resultFeedback,
  ]);

  return (
    <div className="max-w-lg mx-auto p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Numberle
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Find the exact mathematical expression!
        </p>
        <button
          onClick={() => setShowRules(true)}
          className="mt-2 text-blue-500 hover:text-blue-600 text-sm underline"
        >
          How to play
        </button>
      </div>

      {/* Game Board */}
      <div className="flex justify-center mb-6">
        <div className="grid gap-2">
          {board.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-5 gap-2 justify-center"
            >
              {row.map((tile, colIndex) => (
                <div
                  key={colIndex}
                  className={`
                    w-12 h-12 border-2 rounded flex items-center justify-center
                    text-lg font-bold transition-colors duration-300
                    ${getTileStyle(tile.state)}
                    ${
                      rowIndex === currentRow && colIndex === currentCol
                        ? "ring-2 ring-blue-500"
                        : ""
                    }
                  `}
                >
                  {tile.value}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Results and Feedback */}
      <div className="mb-6 space-y-2">
        {board.map(
          (row, rowIndex) =>
            rowResults[rowIndex] !== null && (
              <div
                key={rowIndex}
                className="flex items-center justify-center gap-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Row {rowIndex + 1}:
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-mono bg-white dark:bg-gray-600 px-3 py-1 rounded border">
                    {row.map((tile: any) => tile.value).join("")} ={" "}
                    {rowResults[rowIndex]}
                  </div>
                  <div className="text-sm font-medium px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {rowFeedback[rowIndex]}
                  </div>
                </div>
              </div>
            )
        )}
      </div>

      {/* Result Feedback */}
      {resultFeedback.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Feedback:
          </h3>
          <div className="space-y-1">
            {resultFeedback.map((feedback, index) => (
              <div
                key={index}
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                {feedback}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Virtual Keyboard */}
      <div className="space-y-2">
        <div className="flex gap-1 justify-center">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((key) => (
            <button
              key={key}
              onClick={() => handleVirtualKeyboard(key)}
              className={getKeyboardKeyStyle(key)}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex gap-1 justify-center">
          {["+", "-", "*", "/"].map((key) => (
            <button
              key={key}
              onClick={() => handleVirtualKeyboard(key)}
              className={getKeyboardKeyStyle(key)}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-center mt-4">
          <button
            onClick={() => handleVirtualKeyboard("Enter")}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold
                       transition-colors duration-200"
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

      {/* Game Status */}
      {gameStatus !== "playing" && (
        <div className="mt-6 text-center">
          <div className="mb-4">
            {gameStatus === "won" ? (
              <p className="text-green-600 dark:text-green-400 text-lg font-semibold">
                🎉 Perfect! You found the exact equation!
              </p>
            ) : (
              <p className="text-red-600 dark:text-red-400 text-lg font-semibold">
                😔 Game over! The equation was: {currentEquationData.equation} ={" "}
                {currentEquationData.result}
              </p>
            )}
          </div>
          <button
            onClick={resetGame}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold
                       transition-colors duration-200"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              How to Play
            </h3>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p>
                • Find the exact 5-character mathematical expression in 6 tries
              </p>
              <p>• You must match the exact equation, not just the result</p>
              <p>• Each guess must be valid (no = sign, use +, -, *, /)</p>
              <p>• Two types of clues help you:</p>

              <div className="ml-4">
                <p className="font-semibold mb-1">
                  1. Tile Colors (Position Clues):
                </p>
                <div className="space-y-1 ml-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded"></div>
                    <span>Green: Right digit/operator in right position</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                    <span>Yellow: Right digit/operator in wrong position</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-500 rounded"></div>
                    <span>Gray: Not in the target equation</span>
                  </div>
                </div>

                <p className="font-semibold mt-3 mb-1">
                  2. Result Feedback (Math Clues):
                </p>
                <div className="ml-2">
                  <p>
                    • See if your result is higher, lower, or matches the target
                  </p>
                  <p>• Use this to guide your mathematical reasoning</p>
                </div>
              </div>

              <p>• Win by finding the exact equation structure!</p>
            </div>
            <button
              onClick={() => setShowRules(false)}
              className="mt-4 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold
                         transition-colors duration-200"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
