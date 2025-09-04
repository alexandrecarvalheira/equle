import { create } from "zustand";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { Equle } from "../../../types/contracts/Equle";
import { GetContractReturnType, PublicClient, WalletClient } from "viem";

type EquleContract = GetContractReturnType<
  typeof CONTRACT_ABI,
  PublicClient | WalletClient,
  `0x${string}`
> & Equle;

interface ContractState {
  equle: EquleContract | null;
  setEqule: (equle: EquleContract) => void;
}

export const contractStore = create<ContractState>((set) => ({
  equle: null,
  setEqule: (equle) => set(() => ({ equle })),
}));
