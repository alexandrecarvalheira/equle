"use client";

import { useAuthenticate, useMiniKit } from "@coinbase/onchainkit/minikit";
import { useState } from "react";

interface SignInResult {
  signature: string;
  message: string;
  authMethod: "custody" | "authAddress";
}

export function WalletConnect() {
  const { signIn } = useAuthenticate();
  const [user, setUser] = useState<SignInResult | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { context } = useMiniKit();

  const handleAuth = async () => {
    setIsAuthenticating(true);
    try {
      const result = await signIn();
      console.log("result", result);
      if (result && typeof result === "object") {
        console.log("Authenticated user:", result);
        setUser(result);
      } else {
        console.log("Authentication was cancelled or failed");
      }
    } catch (error) {
      console.error("Authentication failed:", error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-green-600">✅ Authenticated as display name: </p>
        <button
          onClick={() => {
            setUser(null);
            window.location.reload();
          }}
          className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleAuth}
      disabled={isAuthenticating}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
    >
      {isAuthenticating ? "Authenticating..." : "Sign In with Farcaster"}
    </button>
  );
}
