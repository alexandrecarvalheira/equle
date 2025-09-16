"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { cofhejs } from "cofhejs/web";
import { useCofheStore } from "../store/cofheStore";

export function usePermit(currentGameId?: number | null) {
  const { address } = useAccount();
  const { isInitialized: isCofheInitialized } = useCofheStore();

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
      expirationDate.setDate(expirationDate.getDate() + 1); // 1 day expiration

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

  return {
    hasValidPermit,
    isGeneratingPermit,
    error,
    generatePermit,
    checkPermit,
  };
}
