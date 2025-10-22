"use client";

// Force dynamic rendering, skip prerendering
export const dynamic = "force-dynamic";

import { DisconnectedScreen } from "../components/DisconnectedScreen";
import { MonitorFrame } from "../components/MonitorFrame";
import { Footer } from "../components/Footer";
import { useAccount } from "wagmi";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { Navbar } from "../components/Navbar";
import { VirtualKeyboardSkeleton } from "../components/VirtualKeyboardSkeleton";
import { useEffect, useState } from "react";

export default function StatsPage() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const { address, isConnected } = useAccount();
  const [showFHE, setShowFHE] = useState(false);

  // No CoFHE or permit logic on stats page

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

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

            <div className="mt-8">
              <>
                <MonitorFrame
                  screenInsets={{ top: 6, right: 6, bottom: 8, left: 6 }}
                >
                  {!isConnected ? (
                    <DisconnectedScreen />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </MonitorFrame>

                <div className="mt-6 mx-auto w-fit">
                  <VirtualKeyboardSkeleton />
                </div>
              </>
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* FHE Information Button */}
      {isConnected && (
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
  );
}
