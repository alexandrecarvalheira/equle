"use client";

import { ConnectWalletButton } from "./ConnectWalletButton";

export function DisconnectedScreen() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 py-6">
      <div className="text-center">
        <h1
          className="text-white font-visitor1 uppercase text-6xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"
          style={{
            lineHeight: "90%",
            letterSpacing: 0,
          }}
        >
          EQULE
        </h1>
        <div
          className="mt-2 text-gray-200 uppercase flex items-center justify-center gap-2 font-visitor1 sm:text-xl md:text-2xl lg:text-3xl"
          style={{
            lineHeight: "110%",
            letterSpacing: 0,
          }}
        >
          <span>Powered By</span>
          <span className="flex items-center gap-1">
            <img
              src="/fhenix_logo_dark.svg"
              alt="fhenix"
              className="h-6 sm:h-7"
            />
          </span>
        </div>
      </div>

      <div className="w-11/12 sm:w-2/3">
        <ConnectWalletButton fullWidth />
      </div>
    </div>
  );
}
