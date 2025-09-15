"use client";

import { useAccount, useDisconnect } from "wagmi";
import { CofheStatus } from "./CofheStatus";

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (!isConnected) return null;
  return (
    <nav className="w-full px-4 py-3 rounded-xl shadow-lg mb-4">
      <CofheStatus />
      <div className="container mx-auto">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <div className="w-full flex items-center justify-center text-sm sm:text-base md:text-lg text-gray-300 uppercase tracking-widest font-visitor1">
            Find the mathematical expression
          </div>

          <div
            className="justify-self-center text-center "
            style={{
              backgroundColor: "transparent",
              paddingLeft: "20px",
              paddingRight: "20px",
              borderLeft: "2px dotted #0AD9DC",
              borderRight: "2px dotted #0AD9DC",
            }}
          >
            <div className="text-white font-visitor1 uppercase text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-none">
              Equels
            </div>
            <div className="text-gray-300 font-visitor1 uppercase text-sm sm:text-base leading-none mt-1 flex flex-col items-center justify-center gap-1">
              <span>Powered by</span>
              <img
                src="/fhenix_logo_dark.svg"
                alt="fhenix"
                className="h-4 sm:h-6 md:h-7 w-auto"
              />
            </div>
          </div>

          <div className="w-full flex items-center justify-end">
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 w-full justify-end">
              <span className="text-green-400 text-xs sm:text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="px-4 py-1 text-xs sm:text-sm text-white uppercase tracking-widest"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
