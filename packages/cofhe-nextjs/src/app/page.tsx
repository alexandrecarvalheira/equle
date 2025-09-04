"use client";

// Force dynamic rendering, skip prerendering
export const dynamic = "force-dynamic";

import { CofheStatus } from "./components/CofheStatus";

// import { ContractInteraction } from "./components/ContractInteraction";
import { NumberleGame } from "./components/NumberleGame";
import { Footer } from "./components/Footer";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { UserInfo } from "./components/Userinfo";
import { ContractInteraction } from "./components/ContractInteraction";

export default function Home() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const { address } = useAccount();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);
  console.log("isConnected", address);
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#011623" }}
    >
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <UserInfo />
            <header className="text-center mb-8">
              <h1 className="text-5xl font-bold text-white mb-2">
                <span style={{ color: "grey" }}>(</span>Equle
                <span style={{ color: "#0AD9DC" }}>*</span>
                <span style={{ color: "grey" }}>)</span>
              </h1>
              <p className="text-gray-300">
                Find the exact mathematical expression!
              </p>
            </header>

            <div className="mt-8">
              <NumberleGame />
              <ContractInteraction />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
