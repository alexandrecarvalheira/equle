"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { cofhejs, permitStore } from "cofhejs/web";
import { useCofheStore } from "../store/cofheStore";
import { useGameStore } from "../store/gameStore";

export function usePermit(currentGameId?: number | null) {
  const { address, chainId } = useAccount();
  const { isInitialized: isCofheInitialized } = useCofheStore();
  const { clearGameState } = useGameStore();

  const [hasValidPermit, setHasValidPermit] = useState(false);
  const [isGeneratingPermit, setIsGeneratingPermit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for valid permit
  const checkPermit = useCallback(() => {
    if (!isCofheInitialized) {
      setHasValidPermit(false);
      return false;
    }

    const permitResult = cofhejs?.getPermit();
    const hasActivePermit = permitResult?.success && permitResult?.data;

    setHasValidPermit(!!hasActivePermit);
    return !!hasActivePermit;
  }, [isCofheInitialized]);

  // Generate new permit
  const generatePermit = useCallback(async () => {
    if (!isCofheInitialized || !address || isGeneratingPermit) {
      return { success: false, error: "Not ready to generate permit" };
    }

    try {
      setIsGeneratingPermit(true);
      setError(null);

      const permitName = `equle${currentGameId || ""}`;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30); // 1 day expiration

      const result = await cofhejs.createPermit({
        type: "self",
        name: permitName,
        issuer: address,
        expiration: Math.round(expirationDate.getTime() / 1000),
      });

      if (result?.success) {
        console.log("Permit created successfully");
        setHasValidPermit(true);
        setError(null);
        return { success: true };
      } else {
        const errorMessage =
          result?.error?.message || "Failed to create permit";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error generating permit";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGeneratingPermit(false);
    }
  }, [isCofheInitialized, address, currentGameId, isGeneratingPermit]);

  // Check for permit when CoFHE initializes
  useEffect(() => {
    if (isCofheInitialized) {
      checkPermit();
    }
  }, [isCofheInitialized, checkPermit]);

  // Remove permit function
  const removePermit = useCallback(async () => {
    if (!isCofheInitialized || !chainId || !address) {
      console.log("Cannot remove permit: missing required data");
      return false;
    }

    try {
      // Get current active permit hash
      const activePermitResult = cofhejs?.getPermit();
      if (!activePermitResult?.success || !activePermitResult?.data) {
        console.log("No active permit to remove");
        return false;
      }

      // Remove the permit from the store
      // The permit hash should be available in the permitStore or we can get all permits and find the active one
      const allPermits = permitStore.getPermits(chainId.toString(), address);
      if (allPermits && Object.keys(allPermits).length > 0) {
        // Get the first (and likely only) permit hash
        const permitHash = Object.keys(allPermits)[0];
        // Add force flag to allow removal of the last permit
        permitStore.removePermit(chainId.toString(), address, permitHash, true);
      } else {
        console.log("No permits found to remove");
        return false;
      }

      // Update local state
      setHasValidPermit(false);
      setError(null);

      // Clear game state as well
      clearGameState();

      console.log("Permit and game state removed successfully");
      return true;
    } catch (error) {
      console.error("Error removing permit:", error);
      setError("Failed to remove permit");
      return false;
    }
  }, [isCofheInitialized, chainId, address, clearGameState]);

  return {
    hasValidPermit,
    isGeneratingPermit,
    error,
    generatePermit,
    checkPermit,
    removePermit,
  };
}
