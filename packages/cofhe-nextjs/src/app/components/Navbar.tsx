"use client";

import { useAccount, useDisconnect } from "wagmi";
import { CofheStatus } from "./CofheStatus";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
export function Navbar() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (!isConnected) return null;
  return (
    <nav className="w-full px-4 py-3 rounded-xl shadow-lg mb-4 overflow-visible relative z-40">
      <div className="mx-auto w-full max-w-screen-lg">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <div
            className="text-center"
            style={{
              backgroundColor: "transparent",
              paddingLeft: "20px",
              paddingRight: "20px",
            }}
          >
            <div className="text-white font-visitor1 uppercase text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-none">
              Equels
            </div>
            <div className="text-gray-300 font-visitor1 uppercase text-xs sm:text-base leading-none mt-1 flex flex-col items-center justify-center gap-1">
              <span>Powered by</span>
              <img
                src="/fhenix_logo_dark.svg"
                alt="fhenix"
                className="h-4 sm:h-6 md:h-7 w-auto"
              />
            </div>
          </div>

          {/* Right: Wallet */}
          <div className="flex items-center justify-end overflow-visible">
            <div className="relative z-50">
              <Wallet>
                <ConnectWallet />
                <WalletDropdown>
                  <Identity hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
        </div>
        {/* Hidden CofheStatus to keep it mounted */}
        <div className="hidden">
          <CofheStatus />
        </div>
      </div>
    </nav>
  );
}
