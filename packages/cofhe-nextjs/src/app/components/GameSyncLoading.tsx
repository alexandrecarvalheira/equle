"use client";

interface GameSyncLoadingProps {
  message?: string;
}

export function GameSyncLoading({
  message = "Synchronizing with blockchain...",
}: GameSyncLoadingProps) {
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
          {message}
        </div>
        <div className="flex items-center justify-center mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-cyan-400"></div>
        </div>
        <p className="text-gray-300 text-sm mt-4">
          Validating game progress and ensuring data consistency
        </p>
      </div>
    </div>
  );
}
