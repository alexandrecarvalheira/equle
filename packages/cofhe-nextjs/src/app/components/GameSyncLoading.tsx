"use client";

interface GameSyncLoadingProps {
  message?: string;
}

export function GameSyncLoading({ 
  message = "Synchronizing with blockchain..." 
}: GameSyncLoadingProps) {
  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-cyan-400 mx-auto mb-4"></div>
        <p className="text-white text-lg font-semibold mb-2">
          {message}
        </p>
        <p className="text-gray-300 text-sm">
          Validating game progress and ensuring data consistency
        </p>
      </div>
    </div>
  );
}