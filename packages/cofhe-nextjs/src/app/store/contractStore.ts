import { create } from "zustand";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../../contract/contract";
import { Equle } from "../../../types/contracts/Equle";
interface ContractState {
  equle: Equle | null;
  setEqule: (equle: Equle) => void;
}

export const contractStore = create<ContractState>((set) => ({
  equle: null,
  setEqule: (equle) => set(() => ({ equle })),
}));
