import { useState, useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { useGameStore } from "../store/gameStore";

type EndGameState =
  | "idle" // No endgame action needed
  | "can-finalize" // Player won, can finalize game
  | "finalizing" // Executing finalize transaction
  | "decrypting" // Waiting for equation decryption
  | "can-claim" // Equation ready, can claim victory
  | "claiming" // Executing claim victory transaction
  | "claimed"; // Victory claimed, can share

export function useDecryptEquation(address?: `0x${string}`) {
  const [endGameState, setEndGameState] = useState<EndGameState>("idle");
  const [finalizeMessage, setFinalizeMessage] = useState<string>("");

  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const { gameState, setGameState, setGameStateSynced } = useGameStore();

  // Read contract for polling decrypted finalized equation
  const { data: decryptedEquation, refetch: refetchDecryptedEquation } =
    useReadContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "getDecryptedfinalizedEquation",
      args: [],
      account: address,
    });

  // Read player game state
  const { refetch: refetchPlayerGameState } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getPlayerGameState",
    args: gameState ? [gameState.gameId, address] : undefined,
    query: {
      enabled: !!(gameState && address),
    },
  });

  // Check if decrypted equation is available
  const hasDecryptedEquation = (): boolean => {
    return decryptedEquation !== undefined && decryptedEquation !== null;
  };

  // Check if the last guess is all correct (all green) - DON'T CHANGE THIS
  const isLastGuessAllCorrect = (): boolean => {
    if (!gameState?.guesses || gameState.guesses.length === 0) return false;
    const lastGuess = gameState.guesses[gameState.guesses.length - 1];
    return lastGuess.feedback.every((feedback) => feedback === "correct");
  };

  // Check if game is won but not finalized yet - DON'T CHANGE THIS
  const isWonButNotFinalized = (): boolean => {
    return isLastGuessAllCorrect() && !gameState?.hasWon;
  };

  // STEP 1: Finalize game (already working, don't change)
  const finalizeGame = async () => {
    if (!address) {
      setFinalizeMessage("Wallet not connected");
      return;
    }

    setEndGameState("finalizing");
    setFinalizeMessage("Finalizing game...");

    try {
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "finalizeGame",
        args: [],
      });
    } catch (error) {
      setFinalizeMessage("Error finalizing game. Please try again.");
      setTimeout(() => setFinalizeMessage(""), 5000);
      setEndGameState("can-finalize");
    }
  };

  // STEP 3: Claim victory
  const decryptFinalizedEquation = async () => {
    setEndGameState("claiming");
    setFinalizeMessage("Claiming victory...");

    try {
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "ClaimVictory",
        args: [],
      });
    } catch (error) {
      setFinalizeMessage("Error claiming victory NFT. Please try again.");
      setTimeout(() => setFinalizeMessage(""), 5000);
      setEndGameState("can-claim");
    }
  };

  // Handle transaction confirmations
  useEffect(() => {
    if (!isConfirmed) return;

    if (endGameState === "finalizing") {
      // Step 1 complete → Step 2: Wait for decryption
      setEndGameState("decrypting");
      setFinalizeMessage("Decrypting equation...");
      refetchDecryptedEquation();
    } else if (endGameState === "claiming") {
      // Step 3 complete → Step 4: Update win status
      setFinalizeMessage("Updating win status...");
      setTimeout(() => {
        checkPlayerWinStatus();
      }, 2000);
    }
  }, [isConfirmed, endGameState]);

  // Check if equation is decrypted → transition to claim state
  useEffect(() => {
    console.log("Checking decrypted equation:", {
      endGameState,
      hasDecryptedEquation: hasDecryptedEquation(),
      decryptedEquation,
      isValid:
        decryptedEquation !== "0x" &&
        decryptedEquation !== "0x0000000000000000000000000000000000000000",
    });

    if (
      endGameState === "decrypting" &&
      hasDecryptedEquation() &&
      decryptedEquation !== "0x" &&
      decryptedEquation !== "0x0000000000000000000000000000000000000000"
    ) {
      // Step 2 complete → Step 3: Ready to claim
      console.log(
        "✅ Decrypted equation found! Transitioning to can-claim state"
      );
      setEndGameState("can-claim");
      setFinalizeMessage("Equation ready! Claim your victory.");
    }
  }, [endGameState, decryptedEquation]);

  // Polling logic for decrypted equation when in decrypting state
  useEffect(() => {
    if (endGameState !== "decrypting") return;

    console.log("🔄 Starting polling for decrypted equation...");

    const pollInterval = setInterval(async () => {
      console.log("📡 Polling attempt for decrypted equation...");
      try {
        const result = await refetchDecryptedEquation();
        console.log("📡 Poll result:", {
          data: result.data,
          hasData: !!result.data,
          isValid:
            result.data !== "0x" &&
            result.data !== "0x0000000000000000000000000000000000000000",
        });
      } catch (error) {
        console.error("❌ Error polling for decrypted equation:", error);
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup interval when component unmounts or state changes
    return () => {
      console.log("🛑 Stopping decrypted equation polling");
      clearInterval(pollInterval);
    };
  }, [endGameState, refetchDecryptedEquation]);

  // Check player win status after claim
  const checkPlayerWinStatus = async (): Promise<void> => {
    if (!address || !gameState) return;

    try {
      const result = await refetchPlayerGameState();
      if (result.data) {
        const [, hasWon] = result.data as [bigint, boolean];

        if (hasWon) {
          // Update game state if needed
          if (!gameState.hasWon) {
            const updatedGameState = {
              ...gameState,
              hasWon: true,
              isGameComplete: true,
            };
            setGameState(updatedGameState);
            setGameStateSynced(true);
          }

          // Step 4 complete → Ready to share
          setFinalizeMessage(" Victory claimed successfully! ");
          setTimeout(() => {
            setFinalizeMessage("");
            setEndGameState("claimed");
          }, 3000);
        }
      }
    } catch (error) {
      setFinalizeMessage("Error updating win status");
      setTimeout(() => {
        setFinalizeMessage("");
        setEndGameState("can-claim");
      }, 3000);
    }
  };

  // Set initial state based on game state - but don't override active endgame flow
  useEffect(() => {
    // Don't override if we're already in an active endgame flow
    if (endGameState !== "idle") {
      console.log(
        "🚫 Skipping initial state check - endgame flow already active:",
        endGameState
      );
      return;
    }

    if (isWonButNotFinalized()) {
      console.log("🎯 Setting initial state to can-finalize");
      setEndGameState("can-finalize");
    } else if (
      gameState?.hasWon &&
      gameState?.isGameComplete &&
      hasDecryptedEquation() &&
      decryptedEquation !== "0x" &&
      decryptedEquation !== "0x0000000000000000000000000000000000000000"
    ) {
      // Only set to claimed if ALL victory steps have been completed
      console.log("🏆 Setting initial state to claimed");
      setEndGameState("claimed");
    }
  }, [gameState, decryptedEquation, endGameState]);

  return {
    // Functions
    finalizeGame,
    decryptFinalizedEquation,
    hasDecryptedEquation,
    isWonButNotFinalized,

    // State
    finalizeMessage,
    isFinalizingGame:
      endGameState === "finalizing" || endGameState === "claiming",

    // Computed values
    shouldShowFinalizeButton: endGameState === "can-finalize",
    shouldShowClaimButton: endGameState === "can-claim",
    shouldShowShareButton: endGameState === "claimed",
  };
}
