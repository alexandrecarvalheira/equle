"use client";

interface GameSyncLoadingProps {
  message?: string;
}

export function GameSyncLoading({
  message = "Synchronizing with blockchain...",
}: GameSyncLoadingProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 py-8">
      <div className="text-center">
        <div
          className="font-visitor1 uppercase text-white text-lg sm:text-xl tracking-widest px-3 py-2"
          style={{
            borderTop: "2px dotted #0AD9DC",
            borderBottom: "2px dotted #0AD9DC",
          }}
        >
          {message}
        </div>
        <p className="text-gray-300 text-xs sm:text-sm mt-3 font-visitor1 uppercase tracking-widest max-w-md">
          Validating game progress and ensuring data consistency
        </p>
      </div>
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-cyan-400"></div>
      </div>
    </div>
  );
}
