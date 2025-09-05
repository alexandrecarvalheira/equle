"use client";

import { useCofhe } from "../hooks/useCofhe";
import { useEffect, useState } from "react";

export function CofheStatus() {
  const { isInitializing, isInitialized } = useCofhe();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#1a3344" }}>
      {isInitializing ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-cyan-400"></div>
      ) : (
        <div
          className={`w-3 h-3 rounded-full ${
            isInitialized ? "bg-cyan-400" : "bg-red-400"
          }`}
          style={isInitialized ? { backgroundColor: "#0AD9DC" } : {}}
        />
      )}
      <span className="text-sm font-medium text-white">
        {isInitializing
          ? "Initializing CoFHE..."
          : isInitialized
          ? "FHE Ready"
          : "FHE Failed"}
      </span>
    </div>
  );
}
