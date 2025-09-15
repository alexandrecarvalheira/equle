"use client";

// Force dynamic rendering, skip prerendering
export const dynamic = "force-dynamic";

// import { ContractInteraction } from "./components/ContractInteraction";
import { NumberleGame } from "./components/NumberleGame";
import { NumberleGameSkeleton } from "./components/NumberleGameSkeleton";
import { DisconnectedScreen } from "./components/DisconnectedScreen";
import { MonitorFrame } from "./components/MonitorFrame";
import { Footer } from "./components/Footer";
import { useAccount } from "wagmi";
import { UserInfo } from "./components/Userinfo";
import { Navbar } from "./components/Navbar";
import { useCofheStore } from "./store/cofheStore";
import { useCurrentGameId } from "./hooks/useCurrentGameId";
import { useGameStateValidator } from "./hooks/useGameStateValidator";
import { GameSyncLoading } from "./components/GameSyncLoading";
import { GameSyncError } from "./components/GameSyncError";
import { VirtualKeyboardSkeleton } from "./components/VirtualKeyboardSkeleton";
import { FHEModal } from "./components/FHEModal";
import { useState } from "react";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { isInitialized: isCofheInitialized } = useCofheStore();
  const { gameId: currentGameId } = useCurrentGameId();
  const { syncStatus, isValidating, error, validateAndSync } =
    useGameStateValidator(address, currentGameId);
  const [showFHE, setShowFHE] = useState(false);
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: "#001623",
        backgroundImage: "url('/background.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {isConnected ? <Navbar /> : null}

            {/* Game Day Display */}
            {isConnected && currentGameId !== null && (
              <div className="text-center mb-4">
                <p className="text-white text-xl font-visitor1 uppercase tracking-widest">
                  Game <span style={{ color: "#0AD9DC" }}>{currentGameId}</span>
                </p>
              </div>
            )}

            <div className="mt-8">
              {!isConnected ? (
                <DisconnectedScreen />
              ) : !isCofheInitialized ? (
                <>
                  <MonitorFrame>
                    <div className="px-4 w-full">
                      <div className="max-w-2xl mx-auto text-center">
                        <div
                          className="font-visitor1 uppercase text-white text-xl sm:text-2xl md:text-3xl tracking-widest px-4 py-4"
                          style={{
                            borderTop: "2px dotted #0AD9DC",
                            borderBottom: "2px dotted #0AD9DC",
                          }}
                        >
                          Initializing CoFHE
                        </div>

                        <p className="text-gray-300 text-sm mt-4 font-visitor1 uppercase tracking-widest">
                          Setting up fully homomorphic encryption for secure
                          gameplay
                        </p>
                      </div>
                    </div>
                  </MonitorFrame>
                  <div className="mt-6 flex justify-center">
                    <VirtualKeyboardSkeleton />
                  </div>
                </>
              ) : syncStatus === "loading" || syncStatus === "needs-sync" ? (
                <>
                  <MonitorFrame>
                    <div className="px-4 w-full">
                      <GameSyncLoading
                        message={
                          isValidating
                            ? "Rebuilding game progress..."
                            : "Synchronizing with blockchain..."
                        }
                      />
                    </div>
                  </MonitorFrame>
                  <div className="mt-6 flex justify-center">
                    <VirtualKeyboardSkeleton />
                  </div>
                </>
              ) : syncStatus === "error" ? (
                <MonitorFrame>
                  <GameSyncError
                    error={error || "Failed to sync game state"}
                    onRetry={validateAndSync}
                  />
                </MonitorFrame>
              ) : (
                <NumberleGame gameId={currentGameId} />
              )}
            </div>

            {/* FHE Information Button */}
            {isConnected && isCofheInitialized && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setShowFHE(true)}
                  className="text-sm underline hover:opacity-80 transition-opacity duration-200"
                  style={{ color: "#0AD9DC" }}
                >
                  🔐 Why is this game secure? Learn about FHE
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* FHE Modal */}
      <FHEModal isOpen={showFHE} onClose={() => setShowFHE(false)} />
    </div>
  );
}
