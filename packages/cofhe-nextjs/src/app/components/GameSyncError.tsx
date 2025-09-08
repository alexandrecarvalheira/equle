"use client";

interface GameSyncErrorProps {
  error: string;
  onRetry?: () => void;
}

export function GameSyncError({ error, onRetry }: GameSyncErrorProps) {
  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-4">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h3 className="text-white text-lg font-semibold mb-2">
            Sync Error
          </h3>
          <p className="text-gray-300 text-sm mb-4">
            {error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-white rounded font-semibold transition-colors duration-200 hover:opacity-90"
              style={{ backgroundColor: "#0AD9DC" }}
            >
              Try Again
            </button>
          )}
        </div>
        <p className="text-gray-400 text-xs">
          If this problem persists, try refreshing the page or reconnecting your wallet
        </p>
      </div>
    </div>
  );
}