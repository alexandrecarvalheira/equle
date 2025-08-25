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
  { equation: "6+4*2", result: 20 },
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
  const [rowResults, setRowResults] = useState<(number | null)[]>(
    new Array(MAX_ATTEMPTS).fill(null)
  );
  const [keyboardStatus, setKeyboardStatus] = useState<
    Record<string, TileState>
  >({});
  const [hoveredResultTile, setHoveredResultTile] = useState<number | null>(
    null
  );

  const hasAtLeastOneOperation = (expression: string): boolean => {
    return /[+\-*/]/.test(expression);
  };

  const isValidExpression = (expression: string): boolean => {
    if (expression.length !== EQUATION_LENGTH) return false;
    if (expression.includes("=")) return false;
    if (!hasAtLeastOneOperation(expression)) return false;

    try {
      // Check if it's a valid mathematical expression using left-to-right evaluation
      const result = evaluateExpression(expression);
      return typeof result === "number" && !isNaN(result);
    } catch {
      return false;
    }
  };

  const evaluateExpression = (expression: string): number => {
    try {
      // Clean the expression
      const cleanExpression = expression.replace(/[^0-9+\-*/()]/g, "");

      // Parse and evaluate left-to-right
      let result = 0;
      let currentNumber = 0;
      let operator = "+";

      for (let i = 0; i < cleanExpression.length; i++) {
        const char = cleanExpression[i];

        if (!isNaN(Number(char))) {
          currentNumber = currentNumber * 10 + Number(char);
        }

        if (
          ["+", "-", "*", "/"].includes(char) ||
          i === cleanExpression.length - 1
        ) {
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

    // Check for exact equation match (win condition)
    if (currentGuess === currentEquationData.equation) {
      setGameStatus("won");
    }

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
    setRowResults(new Array(MAX_ATTEMPTS).fill(null));
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

  const getResultTileStyle = (rowIndex: number): string => {
    const result = rowResults[rowIndex];
    const baseStyle =
      "w-12 h-12 border-2 rounded flex items-center justify-center text-lg font-bold transition-colors duration-300";

    if (result === null) {
      return `${baseStyle} bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600`;
    }

    if (result === currentEquationData.result) {
      return `${baseStyle} bg-green-500 text-white border-green-500`;
    } else if (result < currentEquationData.result) {
      // Too low - blue/cyan colors
      return `${baseStyle} bg-cyan-400 text-white border-cyan-400`;
    } else {
      // Too high - red/orange colors
      return `${baseStyle} bg-red-400 text-white border-red-400`;
    }
  };

  const getResultDisplay = (
    rowIndex: number
  ): { value: string; arrow: string } => {
    const result = rowResults[rowIndex];
    if (result === null) return { value: "", arrow: "" };

    const value = Number.isInteger(result)
      ? result.toString()
      : result.toFixed(2);
    let arrow = "";

    if (result !== currentEquationData.result) {
      arrow = result < currentEquationData.result ? "↑" : "↓";
    }

    return { value, arrow };
  };

  const getResultTooltip = (rowIndex: number): string => {
    const result = rowResults[rowIndex];
    if (result === null) return "Result will appear here";

    if (result === currentEquationData.result) {
      return "Perfect! Your result matches the target";
    } else if (result < currentEquationData.result) {
      return `Too low. Try a higher result.`;
    } else {
      return `Too high. Try a lower result.`;
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
  }, [board, currentRow, currentCol, gameStatus, currentEquationData.result]);

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

      {/* Game Board */}
      <div className="flex justify-center mb-6 relative z-10">
        <div className="grid gap-2">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2 items-center">
              <div className="grid grid-cols-5 gap-2">
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
                    {tile.value ||
                      (tile.state === "empty" && rowIndex >= currentRow
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
                {hoveredResultTile === rowIndex &&
                  rowResults[rowIndex] !== null && (
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

          {/* Solution section - only shown when game is lost */}
          {gameStatus === "lost" && (
            <div className="mt-4 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
              {/* Solution label */}
              <div className="text-center mb-2">
                <span className="text-xl font-bold text-white">Solution</span>
              </div>

              {/* Solution row */}
              <div className="flex gap-2 items-center">
                <div className="grid grid-cols-5 gap-2">
                  {currentEquationData.equation
                    .split("")
                    .map((char, colIndex) => (
                      <div
                        key={colIndex}
                        className="w-12 h-12 border-2 rounded flex items-center justify-center text-lg font-bold transition-colors duration-300 bg-green-500 text-white border-green-500 shadow-lg"
                      >
                        {char}
                      </div>
                    ))}
                </div>

                {/* Solution equals sign */}
                <span className="text-lg font-bold text-gray-600 dark:text-gray-400 mx-1">
                  =
                </span>

                {/* Solution result tile */}
                <div className="w-12 h-12 border-2 rounded flex items-center justify-center text-lg font-bold bg-green-500 text-white border-green-500 shadow-lg">
                  {currentEquationData.result}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Virtual Keyboard */}
      <div className="space-y-2 relative z-10">
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

      {/* Win/Loss Message and Play Again Button - shown when game is over */}
      {gameStatus !== "playing" && (
        <div className="mt-6 text-center relative z-10">
          {gameStatus === "won" ? (
            <div className="mb-4">
              <div className="text-2xl font-bold text-green-400 mb-2">
                🎉 Congratulations! 🎉
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
          <button
            onClick={resetGame}
            className="px-6 py-2 text-white rounded-lg font-semibold transition-colors duration-200 hover:opacity-80"
            style={{ backgroundColor: "#0AD9DC" }}
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
              <p>
                • <strong>Important:</strong> Math is evaluated left-to-right
                (6+4*2 = 20, not 14)
              </p>
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
                <div className="ml-2 space-y-2">
                  <p>• After each guess, check the result tile for hints:</p>
                  <div className="space-y-1 ml-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        ✓
                      </div>
                      <span>Green: Your result matches exactly!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 border rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{
                          backgroundColor: "#0AD9DC",
                          borderColor: "#0AD9DC",
                        }}
                      >
                        ↑
                      </div>
                      <span>
                        Blue with ↑: Your result is too low (aim higher)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-100 border border-red-300 rounded flex items-center justify-center text-red-800 text-xs font-bold">
                        ↓
                      </div>
                      <span>
                        Red with ↓: Your result is too high (aim lower)
                      </span>
                    </div>
                  </div>
                  <p className="mt-2">
                    <strong>Example:</strong> If target result is 15 and you
                    guess "2*3+4" = 10 (left-to-right: 2*3=6, then 6+4=10),
                    you'll see a blue tile with ↑ (too low)
                  </p>
                </div>
              </div>

              <p>• Win by finding the exact equation structure!</p>
            </div>
            <button
              onClick={() => setShowRules(false)}
              className="mt-4 w-full py-2 text-white rounded font-semibold transition-colors duration-200 hover:opacity-80"
              style={{ backgroundColor: "#0AD9DC" }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
