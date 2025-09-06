import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";

export function useCurrentGameId() {
  const {
    data: gameId,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getCurrentGameId",
    args: [],
  });

  return {
    gameId: gameId ? Number(gameId) : null,
    isLoading,
    error,
    refetch,
  };
}