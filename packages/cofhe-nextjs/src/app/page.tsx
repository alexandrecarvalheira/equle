"use client";

// Force dynamic rendering, skip prerendering
export const dynamic = "force-dynamic";

// import { ContractInteraction } from "./components/ContractInteraction";
import { NumberleGame } from "./components/NumberleGame";
import { NumberleGameSkeleton } from "./components/NumberleGameSkeleton";
import { Footer } from "./components/Footer";
import { useAccount } from "wagmi";
import { UserInfo } from "./components/Userinfo";
import { useCofheStore } from "./store/cofheStore";
import { useCurrentGameId } from "./hooks/useCurrentGameId";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { isInitialized: isCofheInitialized } = useCofheStore();
  const { gameId: currentGameId } = useCurrentGameId();

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

            {/* Game Day Display */}
            {currentGameId !== null && (
              <div className="text-center mb-4">
                <p className="text-lg font-semibold text-white">
                  Day <span style={{ color: "#0AD9DC" }}>{currentGameId}</span>
                </p>
              </div>
            )}

            <div className="mt-8">
              {isCofheInitialized && isConnected ? (
                <NumberleGame gameId={currentGameId} />
              ) : isConnected ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-cyan-400 mx-auto mb-4"></div>
                    <p className="text-white text-lg font-semibold mb-2">
                      Initializing CoFHE Encryption...
                    </p>
                    <p className="text-gray-300 text-sm">
                      Setting up fully homomorphic encryption for secure
                      gameplay
                    </p>
                  </div>
                </div>
              ) : (
                <NumberleGameSkeleton />
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
