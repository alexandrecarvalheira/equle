import { useState, useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { useGameStore } from "../store/gameStore";

export function useDecryptEquation(address?: `0x${string}`) {
  const [isFinalizingGame, setIsFinalizingGame] = useState(false);
  const [finalizeMessage, setFinalizeMessage] = useState<string>("");

  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const { gameState, setGameState, setGameStateSynced } = useGameStore();

  // Read contract for polling decrypted finalized equation
  const {
    data: decryptedEquation,
    refetch: refetchDecryptedEquation,
    error: decryptedEquationError,
  } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getDecryptedfinalizedEquation",
    args: [],
    account: address,
  });

  // Check if decrypted equation is already available (0n means finalized, ready to claim)
  const hasDecryptedEquation = (): boolean => {
    return decryptedEquation !== undefined && decryptedEquation !== null;
  };

  // Check if the last guess is all correct (all green)
  const isLastGuessAllCorrect = (): boolean => {
    if (!gameState?.guesses || gameState.guesses.length === 0) return false;
    const lastGuess = gameState.guesses[gameState.guesses.length - 1];
    return lastGuess.feedback.every((feedback) => feedback === "correct");
  };

  // Check if game is won but not finalized yet
  const isWonButNotFinalized = (): boolean => {
    return isLastGuessAllCorrect() && !gameState?.hasWon;
  };

  // Check if game is already won and we need to claim victory
  const isWonAndNeedsVictoryClaim = (): boolean => {
    return !!(gameState?.hasWon && !hasDecryptedEquation());
  };

  // Call DecryptFinalizedEquation when equation is already decrypted
  const decryptFinalizedEquation = async () => {
    setIsFinalizingGame(true);
    setFinalizeMessage("Finalizing win status...");

    try {
      // Call DecryptFinalizedEquation to update hasWon status
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "DecryptfinalizedEquation",
        args: [],
      });

      console.log("DecryptFinalizedEquation transaction initiated");

      // After transaction confirms, check player status will be handled by useEffect
    } catch (error) {
      console.error("Error calling DecryptFinalizedEquation:", error);
      setFinalizeMessage("Error finalizing game. Please try again.");
      setTimeout(() => setFinalizeMessage(""), 5000);
      setIsFinalizingGame(false);
    }
  };

  // Finalize game when player has won
  const finalizeGame = async () => {
    if (!address) {
      setFinalizeMessage("Wallet not connected");
      return;
    }

    setIsFinalizingGame(true);
    setFinalizeMessage("Finalizing game...");

    try {
      // Call finalizeGame on the contract
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "finalizeGame",
        args: [],
      });

      console.log("Finalize game transaction initiated");

      // Wait for transaction confirmation, then start polling for decrypted equation
    } catch (error) {
      console.error("Error finalizing game:", error);
      setFinalizeMessage("Error finalizing game. Please try again.");
      setTimeout(() => setFinalizeMessage(""), 5000);
      setIsFinalizingGame(false);
    }
  };

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

  // Check if player has won on-chain and update game state
  const checkPlayerWinStatus = async (): Promise<void> => {
    if (!address || !gameState) return;

    console.log("🔍 Checking player win status...");
    console.log("Current local game state:", {
      hasWon: gameState.hasWon,
      isGameComplete: gameState.isGameComplete,
      currentAttempt: gameState.currentAttempt
    });

    try {
      const result = await refetchPlayerGameState();
      if (result.data) {
        const [, hasWon] = result.data as [bigint, boolean];
        
        console.log("🏆 On-chain win status:", hasWon);
        console.log("🎯 Local win status:", gameState.hasWon);

        if (hasWon && !gameState.hasWon) {
          console.log("Player has won on-chain but not locally, updating game state");

          // Update the game state to reflect the win
          const updatedGameState = {
            ...gameState,
            hasWon: true,
            isGameComplete: true,
          };

          setGameState(updatedGameState);
          setGameStateSynced(true);

          // Show success message and finish finalization
          setFinalizeMessage("🎉 Game finalized successfully! 🎉");
          setTimeout(() => {
            setFinalizeMessage("");
            setIsFinalizingGame(false);
          }, 3000);
        } else if (hasWon && gameState.hasWon) {
          console.log("✅ Player has already won both on-chain and locally - no update needed");
          
          // Just show success message and finish finalization
          setFinalizeMessage("🎉 Victory claimed successfully! 🎉");
          setTimeout(() => {
            setFinalizeMessage("");
            setIsFinalizingGame(false);
          }, 3000);
        } else {
          console.log("⚠️ On-chain status doesn't match expected win state");
        }
      }
    } catch (error) {
      console.error("Error checking player win status:", error);
      setFinalizeMessage("Error updating win status");
      setTimeout(() => {
        setFinalizeMessage("");
        setIsFinalizingGame(false);
      }, 3000);
    }
  };

  // Effect to handle finalize game transaction confirmation and refetch decrypted equation
  useEffect(() => {
    if (isConfirmed && isFinalizingGame) {
      console.log(
        "Finalize game transaction confirmed, starting to poll for decrypted equation"
      );
      setFinalizeMessage("Waiting for equation decryption...");

      // Start polling for decrypted equation
      const pollDecryptedEquation = async () => {
        try {
          console.log("Attempting to refetch decrypted equation...");
          const result = await refetchDecryptedEquation();
          console.log("Refetch result:", result);

          if (result.error) {
            console.log(
              "Function reverted (equation not ready), will retry automatically"
            );
            // The query will automatically retry due to retry: true
          }
        } catch (error) {
          console.error("Error during refetch:", error);
        }
      };

      pollDecryptedEquation();
    }
  }, [isConfirmed, isFinalizingGame, refetchDecryptedEquation]);

  // Effect to handle when decrypted equation is received - ONLY when player has won
  useEffect(() => {
    // Only process decrypted equation if player has actually won
    if (!isWonButNotFinalized() && !isFinalizingGame) {
      return;
    }

    console.log("Decrypted equation state changed:", {
      decryptedEquation,
      error: decryptedEquationError,
      isWonButNotFinalized: isWonButNotFinalized(),
      isFinalizingGame,
    });

    if (
      decryptedEquation &&
      decryptedEquation !== "0x" &&
      decryptedEquation !== "0x0000000000000000000000000000000000000000"
    ) {
      console.log("✅ Successfully got decrypted equation:", decryptedEquation);
      setFinalizeMessage("Equation decrypted! Finalizing win status...");

      // Call DecryptFinalizedEquation to update hasWon status
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "DecryptfinalizedEquation",
        args: [],
      });
    } else if (
      decryptedEquationError &&
      (isWonButNotFinalized() || isFinalizingGame)
    ) {
      console.log("decryptedEquationError", decryptedEquationError);
      console.log("❌ Equation not ready yet (function reverted), retrying...");
      setFinalizeMessage("Waiting for equation decryption... (retrying)");
    }
  }, [
    decryptedEquation,
    decryptedEquationError,
    isWonButNotFinalized(),
    isFinalizingGame,
    writeContract,
  ]);

  // Effect to refetch player status after DecryptFinalizedEquation call
  useEffect(() => {
    if (isConfirmed && finalizeMessage.includes("Finalizing win status")) {
      console.log("DecryptFinalizedEquation confirmed, checking player status");
      setFinalizeMessage("Updating win status...");
      // Check player status after a short delay
      setTimeout(() => {
        checkPlayerWinStatus();
      }, 2000);
    }
  }, [isConfirmed, finalizeMessage]);

  // Effect to check for decrypted equation when player first wins
  useEffect(() => {
    if (isWonButNotFinalized()) {
      console.log(
        "Player won! Checking if decrypted equation is already available..."
      );
      refetchDecryptedEquation();
    }
  }, [isWonButNotFinalized(), refetchDecryptedEquation]);

  // Effect to check for decrypted equation on component mount/game state load - ONLY when player has won
  useEffect(() => {
    const checkDecryptedEquationOnLoad = async () => {
      // Only check if player has actually won but game is not finalized
      if (gameState && isWonButNotFinalized() && !decryptedEquation) {
        console.log(
          "Game state loaded, player won but not finalized - checking for decrypted equation..."
        );
        console.log(
          "Current decryptedEquation before refetch:",
          decryptedEquation
        );

        try {
          const result = await refetchDecryptedEquation();
          console.log("Refetch result:", result);
          console.log("decryptedEquation after refetch:", result.data);
        } catch (error) {
          console.log("Refetch failed (equation not ready):", error);
        }
      }
    };

    checkDecryptedEquationOnLoad();
  }, [gameState, refetchDecryptedEquation, decryptedEquation]);

  // Effect to track decryptedEquation value changes
  useEffect(() => {
    console.log("🔍 decryptedEquation value changed:", {
      value: decryptedEquation,
      hasDecryptedEquation: hasDecryptedEquation(),
      isWonButNotFinalized: isWonButNotFinalized(),
    });
  }, [decryptedEquation]);

  return {
    // State
    isFinalizingGame,
    finalizeMessage,
    decryptedEquation,

    // Functions
    finalizeGame,
    decryptFinalizedEquation,
    hasDecryptedEquation,
    isWonButNotFinalized,
    refetchDecryptedEquation,

    // Computed values
    shouldShowFinalizeButton: isWonButNotFinalized() || isWonAndNeedsVictoryClaim(),
  };
}
