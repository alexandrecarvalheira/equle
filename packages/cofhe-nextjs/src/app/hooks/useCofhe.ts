"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Encryptable,
  Environment,
  FheTypes,
  Permit,
  cofhejs,
  permitStore,
} from "cofhejs/web";
import { Address, Chain } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  hardhat,
  mainnet,
  sepolia,
} from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { wagmiConfig } from "../wagmi.config";
import { useCofheStore } from "../store/cofheStore";

interface CofheConfig {
  environment: Environment;
  coFheUrl?: string;
  verifierUrl?: string;
  thresholdNetworkUrl?: string;
  ignoreErrors?: boolean;
  generatePermit?: boolean;
}

const ChainEnvironments = {
  // Ethereum
  [mainnet.id]: "MAINNET",
  // Arbitrum
  [arbitrum.id]: "MAINNET",
  // Ethereum Sepolia
  [sepolia.id]: "TESTNET",
  // Arbitrum Sepolia
  [arbitrumSepolia.id]: "TESTNET",
  // Hardhat
  [hardhat.id]: "MOCK",
} as const;

export const targetNetworksNoHardhat = wagmiConfig.chains.filter(
  (network: Chain) => network.id !== hardhat.id
);

export const useIsConnectedChainSupported = () => {
  const { chainId } = useAccount();
  return useMemo(
    () =>
      targetNetworksNoHardhat.some((network: Chain) => network.id === chainId),
    [chainId]
  );
};

export function useCofhe(config?: Partial<CofheConfig>) {
  // TODO: Only initialize if the user is connected to a supported chain
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isChainSupported = useIsConnectedChainSupported();
  const {
    isInitialized: globalIsInitialized,
    setIsInitialized: setGlobalIsInitialized,
  } = useCofheStore();

  const chainId = publicClient?.chain.id;
  const accountAddress = walletClient?.account.address;

  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [permit, setPermit] = useState<Permit | undefined>(undefined);

  // Add checks to ensure we're in a browser environment
  const isBrowser = typeof window !== "undefined";

  // Reset initialization when chain changes
  useEffect(() => {
    setGlobalIsInitialized(false);
  }, [chainId, accountAddress]);

  // Initialize when wallet is connected
  useEffect(() => {
    // Skip initialization if not in browser
    if (!isBrowser) return;

    const initialize = async () => {
      if (
        globalIsInitialized ||
        isInitializing ||
        !publicClient ||
        !walletClient ||
        !isChainSupported
      )
        return;
      try {
        setIsInitializing(true);

        const environment =
          ChainEnvironments[chainId as keyof typeof ChainEnvironments] ??
          "TESTNET";

        const defaultConfig = {
          environment,
          verifierUrl: undefined,
          coFheUrl: undefined,
          thresholdNetworkUrl: undefined,
          ignoreErrors: false,
          generatePermit: true,
        };

        // Merge default config with user-provided config
        const mergedConfig = { ...defaultConfig, ...config };
        const result = await cofhejs.initializeWithViem({
          viemClient: publicClient,
          viemWalletClient: walletClient,
          environment: mergedConfig.environment,
          verifierUrl: mergedConfig.verifierUrl,
          coFheUrl: mergedConfig.coFheUrl,
          thresholdNetworkUrl: mergedConfig.thresholdNetworkUrl,
          ignoreErrors: mergedConfig.ignoreErrors,
          generatePermit: mergedConfig.generatePermit,
        });

        if (result.success) {
          console.log("Cofhe initialized successfully");
          setGlobalIsInitialized(true);
          setPermit(result.data);
          setError(null);
        } else {
          setError(new Error(result.error.message || String(result.error)));
        }
      } catch (err) {
        console.error("Failed to initialize Cofhe:", err);
        setError(
          err instanceof Error
            ? err
            : new Error("Unknown error initializing Cofhe")
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    walletClient,
    publicClient,
    config,
    chainId,
    isInitializing,
    accountAddress,
    isChainSupported,
    globalIsInitialized,
    setGlobalIsInitialized,
  ]);

  return {
    isInitialized: globalIsInitialized,
    isInitializing,
    error,
    permit,
    // Expose the original library functions directly
    ...cofhejs,
    FheTypes,
    Encryptable,
  };
}

export const useCofhejsInitialized = () => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = cofhejs.store.subscribe((state) =>
      setInitialized(
        state.providerInitialized &&
          state.signerInitialized &&
          state.fheKeysInitialized
      )
    );

    // Initial state
    const initialState = cofhejs.store.getState();
    setInitialized(
      initialState.providerInitialized &&
        initialState.signerInitialized &&
        initialState.fheKeysInitialized
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return initialized;
};

export const useCofhejsAccount = () => {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = cofhejs.store.subscribe((state) => {
      setAccount(state.account);
    });

    // Initial state
    setAccount(cofhejs.store.getState().account);

    return () => {
      unsubscribe();
    };
  }, []);

  return account;
};

export const useCofhejsActivePermitHashes = () => {
  const [activePermitHash, setActivePermitHash] = useState<
    Record<Address, string | undefined>
  >({});

  useEffect(() => {
    const unsubscribe = permitStore.store.subscribe((state) => {
      const hash = state.activePermitHash;
      setActivePermitHash(hash as any); // TODO: fix this
    });

    setActivePermitHash(permitStore.store.getState().activePermitHash as any); // TODO: fix this

    return () => {
      unsubscribe();
    };
  }, []);

  return useMemo(() => activePermitHash, [activePermitHash]);
};

export const useCofhejsActivePermitHash = () => {
  const account = useCofhejsAccount();
  const activePermitHashes = useCofhejsActivePermitHashes();

  return useMemo(() => {
    if (!account) return undefined;
    return activePermitHashes[account as Address];
  }, [account, activePermitHashes]);
};

export const useCofhejsActivePermit = () => {
  const { chainId } = useAccount();
  const account = useCofhejsAccount();
  const initialized = useCofhejsInitialized();
  const activePermitHash = useCofhejsActivePermitHash();

  return useMemo(() => {
    if (!account || !initialized) return undefined;
    console.log("chainId", chainId?.toString());
    return permitStore.getPermit(
      chainId?.toString(),
      account,
      activePermitHash
    );
  }, [account, initialized, activePermitHash]);
};

export const useCofhejsAllPermits = () => {
  const account = useCofhejsAccount();
  const initialized = useCofhejsInitialized();
  const [allPermits, setAllPermits] = useState<Permit[] | undefined>(undefined);

  useEffect(() => {
    if (!account || !initialized) {
      setAllPermits(undefined);
      return;
    }

    const updatePermits = () => {
      // Use cofhejs.getAllPermits() here as it's the correct API
      const permitsFromStore = cofhejs.getAllPermits();
      setAllPermits(Object.values(permitsFromStore?.data ?? {}));
    };

    // Initial state
    updatePermits();

    // Subscribe to store changes
    // Assuming permitStore.store.subscribe will be triggered by permitStore.removePermit
    const unsubscribe = permitStore.store.subscribe(updatePermits);

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, initialized]); // Dependencies: re-run when account or initialized status changes.

  return allPermits;
};

// Export FheTypes directly for convenience
export { FheTypes } from "cofhejs/web";
