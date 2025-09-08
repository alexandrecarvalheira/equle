import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";

export function usePlayerAttempts(
  address?: `0x${string}`, 
  gameId?: number | null, 
  currentAttempt?: number
) {
  const attempts = [];

  for (let i = 0; i < (currentAttempt || 0); i++) {
    const { data } = useReadContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "getPlayerAttempt",
      args: address && gameId ? [gameId, address, i] : undefined,
    });
    attempts.push(data);
  }

  return attempts;
}