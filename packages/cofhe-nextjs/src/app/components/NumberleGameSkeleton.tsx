"use client";

const EQUATION_LENGTH = 5;
const MAX_ATTEMPTS = 6;

export function NumberleGameSkeleton() {
  return (
    <div
      className="max-w-lg mx-auto p-4 rounded-xl shadow-lg relative"
      style={{ backgroundColor: "#122531" }}
    >
      <div className="text-center mb-6 relative z-10">
        <button
          disabled
          className="mt-2 text-sm underline opacity-50 cursor-not-allowed"
          style={{ color: "#0AD9DC" }}
        >
          How to play
        </button>
      </div>

      {/* Game Board Skeleton */}
      <div className="flex justify-center mb-6 relative z-10">
        <div className="grid gap-2">
          {Array.from({ length: MAX_ATTEMPTS }, (_, rowIndex) => (
            <div key={rowIndex} className="flex gap-2 items-center">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: EQUATION_LENGTH }, (_, colIndex) => (
                  <div
                    key={colIndex}
                    className="w-12 h-12 rounded flex items-center justify-center bg-gray-100 dark:bg-gray-700 animate-pulse"
                  >
                    <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                ))}
              </div>

              {/* Equals sign */}
              <span className="text-lg font-bold text-gray-600 dark:text-gray-300 mx-1 opacity-50">
                =
              </span>

              {/* Result tile skeleton */}
              <div className="w-12 h-12 rounded flex items-center justify-center bg-gray-100 dark:bg-gray-700 animate-pulse">
                <div className="w-8 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Keyboard Skeleton */}
      <div className="space-y-2 relative z-10">
        <div className="flex gap-1 justify-center">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((key) => (
            <button
              key={key}
              disabled
              className="w-8 h-10 rounded text-sm font-semibold bg-gray-400 text-gray-600 cursor-not-allowed opacity-50"
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex gap-1 justify-center">
          {["+", "-", "*", "/"].map((key) => (
            <button
              key={key}
              disabled
              className="w-8 h-10 rounded text-sm font-semibold bg-gray-400 text-gray-600 cursor-not-allowed opacity-50"
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-center mt-4">
          <button
            disabled
            className="px-4 py-2 text-white rounded font-semibold opacity-50 cursor-not-allowed"
            style={{ backgroundColor: "#0AD9DC" }}
          >
            Enter
          </button>
          <button
            disabled
            className="px-4 py-2 bg-gray-500 text-white rounded font-semibold opacity-50 cursor-not-allowed"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
