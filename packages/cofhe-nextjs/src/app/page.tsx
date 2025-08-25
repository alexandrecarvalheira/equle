"use client";
import { WalletConnect } from "./components/WalletConnect";
import { CofheStatus } from "./components/CofheStatus";
// import { ContractInteraction } from "./components/ContractInteraction";
import { NumberleGame } from "./components/NumberleGame";
import { Footer } from "./components/Footer";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { ConnectWallet, Wallet } from "@coinbase/onchainkit/wallet";
import { useEffect } from "react";
import { Name } from "@coinbase/onchainkit/identity";

export default function Home() {
  const { setFrameReady, isFrameReady } = useMiniKit();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
    console.log("isFrameReady", isFrameReady);
  }, [isFrameReady, setFrameReady]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#011623" }}
    >
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <header className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                <span style={{ color: "grey" }}>(</span>Equle
                <span style={{ color: "#0AD9DC" }}>*</span>
                <span style={{ color: "grey" }}>)</span>
              </h1>
              <p className="text-gray-300">
                Find the exact mathematical expression!
              </p>
            </header>

            {/* <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
              <CofheStatus />
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <Wallet>
                  <ConnectWallet>
                    <Name />
                  </ConnectWallet>
                </Wallet>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <ContractInteraction /> 
              </div>
            </div> 
            */}

            <div className="mt-8">
              <NumberleGame />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
