'use client';

import { useState, useEffect } from 'react';

type TileState = 'empty' | 'correct' | 'present' | 'absent';

interface Tile {
  value: string;
  state: TileState;
}

const EQUATION_LENGTH = 7;
const MAX_ATTEMPTS = 6;

export function NumberleGame() {
  const [board, setBoard] = useState<Tile[][]>([]);
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [showRules, setShowRules] = useState(false);
  const [targetEquation] = useState('10+5=15');

  useEffect(() => {
    initializeBoard();
  }, []);

  const initializeBoard = () => {
    const newBoard: Tile[][] = [];
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const row: Tile[] = [];
      for (let j = 0; j < EQUATION_LENGTH; j++) {
        row.push({ value: '', state: 'empty' });
      }
      newBoard.push(row);
    }
    setBoard(newBoard);
  };

  const isValidEquation = (equation: string): boolean => {
    if (equation.length !== EQUATION_LENGTH) return false;
    if (!equation.includes('=')) return false;
    
    const parts = equation.split('=');
    if (parts.length !== 2) return false;
    
    const leftSide = parts[0];
    const rightSide = parts[1];
    
    try {
      const leftResult = eval(leftSide.replace(/[^0-9+\-*/]/g, ''));
      const rightResult = parseInt(rightSide);
      return leftResult === rightResult;
    } catch {
      return false;
    }
  };

  const handleKeyPress = (key: string) => {
    if (gameStatus !== 'playing') return;

    if (key === 'Enter') {
      submitGuess();
    } else if (key === 'Backspace') {
      if (currentCol > 0) {
        const newBoard = [...board];
        newBoard[currentRow][currentCol - 1] = { value: '', state: 'empty' };
        setBoard(newBoard);
        setCurrentCol(currentCol - 1);
      }
    } else if (isValidInput(key) && currentCol < EQUATION_LENGTH) {
      const newBoard = [...board];
      newBoard[currentRow][currentCol] = { value: key, state: 'empty' };
      setBoard(newBoard);
      setCurrentCol(currentCol + 1);
    }
  };

  const isValidInput = (key: string): boolean => {
    return /^[0-9+\-*/=]$/.test(key);
  };

  const submitGuess = () => {
    if (currentCol !== EQUATION_LENGTH) return;

    const currentGuess = board[currentRow].map(tile => tile.value).join('');
    
    if (!isValidEquation(currentGuess)) {
      alert('Please enter a valid equation');
      return;
    }

    const newBoard = [...board];
    
    for (let i = 0; i < EQUATION_LENGTH; i++) {
      const guessChar = currentGuess[i];
      const targetChar = targetEquation[i];
      
      if (guessChar === targetChar) {
        newBoard[currentRow][i].state = 'correct';
      } else if (targetEquation.includes(guessChar)) {
        newBoard[currentRow][i].state = 'present';
      } else {
        newBoard[currentRow][i].state = 'absent';
      }
    }
    
    setBoard(newBoard);
    
    if (currentGuess === targetEquation) {
      setGameStatus('won');
    } else if (currentRow === MAX_ATTEMPTS - 1) {
      setGameStatus('lost');
    } else {
      setCurrentRow(currentRow + 1);
      setCurrentCol(0);
    }
  };

  const resetGame = () => {
    setCurrentRow(0);
    setCurrentCol(0);
    setGameStatus('playing');
    initializeBoard();
  };

  const getTileStyle = (state: TileState): string => {
    switch (state) {
      case 'correct':
        return 'bg-green-500 text-white border-green-500';
      case 'present':
        return 'bg-yellow-500 text-white border-yellow-500';
      case 'absent':
        return 'bg-gray-500 text-white border-gray-500';
      default:
        return 'bg-white text-black border-gray-300';
    }
  };

  const handleVirtualKeyboard = (key: string) => {
    handleKeyPress(key);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyPress(event.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentRow, currentCol, gameStatus]);

  return (
    <div className="max-w-lg mx-auto p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Numberle
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Guess the mathematical equation!
        </p>
        <button
          onClick={() => setShowRules(true)}
          className="mt-2 text-blue-500 hover:text-blue-600 text-sm underline"
        >
          How to play
        </button>
      </div>

      {/* Game Board */}
      <div className="grid gap-2 mb-6">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-7 gap-2">
            {row.map((tile, colIndex) => (
              <div
                key={colIndex}
                className={`
                  w-12 h-12 border-2 rounded flex items-center justify-center
                  text-lg font-bold transition-colors duration-300
                  ${getTileStyle(tile.state)}
                  ${rowIndex === currentRow && colIndex === currentCol ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                {tile.value}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Virtual Keyboard */}
      <div className="space-y-2">
        <div className="flex gap-1 justify-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((key) => (
            <button
              key={key}
              onClick={() => handleVirtualKeyboard(key)}
              className="w-8 h-10 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 
                         rounded text-sm font-semibold text-gray-800 dark:text-gray-200 
                         transition-colors duration-200"
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex gap-1 justify-center">
          {['+', '-', '*', '/', '='].map((key) => (
            <button
              key={key}
              onClick={() => handleVirtualKeyboard(key)}
              className="w-8 h-10 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 
                         rounded text-sm font-semibold text-gray-800 dark:text-gray-200 
                         transition-colors duration-200"
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-center mt-4">
          <button
            onClick={() => handleVirtualKeyboard('Enter')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold
                       transition-colors duration-200"
          >
            Enter
          </button>
          <button
            onClick={() => handleVirtualKeyboard('Backspace')}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-semibold
                       transition-colors duration-200"
          >
            ⌫
          </button>
        </div>
      </div>

      {/* Game Status */}
      {gameStatus !== 'playing' && (
        <div className="mt-6 text-center">
          <div className="mb-4">
            {gameStatus === 'won' ? (
              <p className="text-green-600 dark:text-green-400 text-lg font-semibold">
                🎉 Congratulations! You solved it!
              </p>
            ) : (
              <p className="text-red-600 dark:text-red-400 text-lg font-semibold">
                😔 Game over! The equation was: {targetEquation}
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
              <p>• Guess the mathematical equation in 6 tries</p>
              <p>• Each guess must be a valid equation with an = sign</p>
              <p>• After each guess, tiles will change color:</p>
              <div className="ml-4 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded"></div>
                  <span>Green: Correct digit/operator in correct position</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                  <span>Yellow: Correct digit/operator in wrong position</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-500 rounded"></div>
                  <span>Gray: Digit/operator not in the equation</span>
                </div>
              </div>
              <p>• Use numbers (0-9) and operators (+, -, *, /, =)</p>
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