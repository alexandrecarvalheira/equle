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
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isInitializing
              ? "bg-yellow-500 animate-pulse"
              : isInitialized
              ? "bg-green-500"
              : "bg-red-500"
          }`}
        />
        <p>
          Cofhe Status:{" "}
          {isInitializing
            ? "Initializing..."
            : isInitialized
            ? "Initialized"
            : "Not Initialized"}
        </p>
      </div>
      {/* {!isInitialized && !isInitializing && (
        <button
          onClick={() => initialize()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Initialize Cofhe
        </button>
      )} */}
    </div>
  );
}
