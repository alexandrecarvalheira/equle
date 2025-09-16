import { useState, useEffect, useCallback } from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { useGameStore } from "../store/gameStore";
import { useGameSync } from "./useGameSync";
import { useCofheStore } from "../store/cofheStore";
import { cofhejs } from "cofhejs/web";

type SyncStatus = "loading" | "synced" | "needs-sync" | "error";

export function useGameStateValidator(
  address?: `0x${string}`,
  currentGameId?: number | null
) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTriggeredValidation, setHasTriggeredValidation] = useState(false);

  const {
    gameState,
    walletAddress,
    isGameStateSynced,
    clearGameState,
    setGameStateSynced,
    setWalletAddress,
  } = useGameStore();
  const { isInitialized: isCofheInitialized } = useCofheStore();
  const { syncGameStateFromContract } = useGameSync(address, currentGameId);

  // Contract hook to fetch current player state
  const { refetch: refetchPlayerGameState } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerGameState",
    args:
      currentGameId !== null && address ? [currentGameId, address] : undefined,
    query: { enabled: false }, // Manual fetching only
  });

  // Smart wallet address management - only clear when different address connects
  useEffect(() => {
    if (address && walletAddress && address !== walletAddress) {
      // Different address connected - clear state and start fresh
      clearGameState();
      setWalletAddress(address);
      setSyncStatus("needs-sync");
      setError(null);
      setHasTriggeredValidation(false); // Reset validation flag for new address
    } else if (address && !walletAddress) {
      // First connection or same address reconnecting - just set the address
      setWalletAddress(address);
    }
  }, [address, walletAddress]);

  // Clear game state when game ID changes
  useEffect(() => {
    if (
      currentGameId !== null &&
      gameState &&
      gameState.gameId !== currentGameId
    ) {
      clearGameState();
      setSyncStatus("needs-sync");
      setError(null);
      setHasTriggeredValidation(false); // Reset validation flag for new game
    }
  }, [currentGameId, gameState, clearGameState]);

  const validateAndSync = useCallback(async () => {
    if (!address || currentGameId === null) {
      setSyncStatus("loading");
      return;
    }

    // Check if CoFHE is initialized before attempting any sync operations
    if (!isCofheInitialized) {
      setSyncStatus("loading");
      return;
    }

    // Check if CoFHE permit is available - use getPermit() to get active permit
    const permitResult = cofhejs?.getPermit();
    if (!permitResult?.success || !permitResult?.data) {
      setSyncStatus("loading");
      return;
    }

    setIsValidating(true);
    setError(null);
    setSyncStatus("loading");

    try {
      // Fetch current on-chain state
      const { data: result } = (await refetchPlayerGameState({
        args: [currentGameId, address],
      } as any)) as { data: [bigint, boolean] };

      if (!result) {
        throw new Error("Failed to fetch on-chain game state");
      }

      const [onChainCurrentAttempt, onChainHasWon] = result;
      const onChainState = {
        gameId: currentGameId,
        currentAttempt: Number(onChainCurrentAttempt),
        hasWon: Boolean(onChainHasWon),
      };

      // Check if local state matches on-chain state
      const isLocalStateSynced =
        gameState &&
        gameState.gameId === onChainState.gameId &&
        gameState.currentAttempt === onChainState.currentAttempt &&
        gameState.hasWon === onChainState.hasWon;

      if (isLocalStateSynced && isGameStateSynced) {
        setSyncStatus("synced");
      } else {
        setSyncStatus("needs-sync");

        // Trigger sync from contract
        await syncGameStateFromContract();

        setSyncStatus("synced");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setSyncStatus("error");
    } finally {
      setIsValidating(false);
    }
  }, [
    address,
    currentGameId,
    gameState,
    isGameStateSynced,
    isCofheInitialized,
    refetchPlayerGameState,
    syncGameStateFromContract,
  ]);

  // Auto-validate when dependencies change (including permit availability)
  useEffect(() => {
    if (address && currentGameId !== null && isCofheInitialized) {
      // Check if permit is available before attempting to sync
      const checkAndValidate = () => {
        const permitResult = cofhejs?.getPermit();
        const hasActivePermit = permitResult?.success && permitResult?.data;

        if (hasActivePermit && !hasTriggeredValidation) {
          console.log("Auto-validation triggered with active permit");
          setHasTriggeredValidation(true);
          validateAndSync();
        } else if (!hasActivePermit) {
          console.log("Auto-validation skipped - no active permit");
          setSyncStatus("loading");
          setHasTriggeredValidation(false); // Reset so it can trigger again when permit becomes available
        }
      };

      // Check immediately
      checkAndValidate();

      // Also check periodically for permit changes (but only trigger validation once)
      const interval = setInterval(checkAndValidate, 2000);
      return () => clearInterval(interval);
    }
  }, [
    address,
    currentGameId,
    isCofheInitialized,
    validateAndSync,
    hasTriggeredValidation,
  ]); // Include CoFHE initialization status

  // Handle sync state changes from other components
  useEffect(() => {
    if (isGameStateSynced && syncStatus !== "synced") {
      setSyncStatus("synced");
    }
  }, [isGameStateSynced, syncStatus]);

  const manualValidateAndSync = useCallback(() => {
    setHasTriggeredValidation(false); // Reset flag to allow manual validation
    validateAndSync();
  }, [validateAndSync]);

  return {
    syncStatus,
    isValidating,
    error,
    validateAndSync: manualValidateAndSync,
  };
}
