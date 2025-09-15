"use client";

interface GameSyncErrorProps {
  error: string;
  onRetry?: () => void;
}

export function GameSyncError({ error, onRetry }: GameSyncErrorProps) {
  return (
    <div className="px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div
          className="font-visitor1 uppercase text-white text-xl sm:text-2xl md:text-3xl tracking-widest px-4 py-4"
          style={{
            borderTop: "2px dotted #0AD9DC",
            borderBottom: "2px dotted #0AD9DC",
          }}
        >
          Sync Error
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mt-6">
          <p className="text-gray-300 text-sm mb-4">{error}</p>
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
        <p className="text-gray-400 text-xs mt-3">
          If this problem persists, try refreshing the page or reconnecting your
          wallet
        </p>
      </div>
    </div>
  );
}
