# Cofhe Templates

## Deployed Counter Contract
- Sepolia: `0x0D719dd073f4B3e36D0D263F4bb76F9B7E46D0c2`
- Arbitrum Sepolia: `0x83d6d706b9A597EF43c487e5E50c25b0Aa131b8a`

## Available Templates

- [x] Next.js
- [x] React (Vite)
- [ ] Nuxt.js

## About cofhejs

[cofhejs](https://cofhe-docs.fhenix.zone/docs/devdocs/cofhejs) is a TypeScript library that enables seamless interaction with FHE-enabled smart contracts via the CoFHE service. CoFHE is a privacy-preserving computation service for EVM-compatible networks, currently supporting Ethereum Sepolia and Arbitrum Sepolia. The library handles encryption, decryption, and permit management, allowing dApps to keep user data private while leveraging fully homomorphic encryption on-chain.

- **Encrypt input data** before sending to smart contracts.
- **Create and manage permits** for secure access and decryption.
- **Unseal and decrypt** contract outputs for user display.

For more details, see the [cofhejs documentation](https://cofhe-docs.fhenix.zone/docs/devdocs/cofhejs).

![CoFHE Counter Demo](cofhe-demo.png)

*Example: CoFHE Counter Demo dApp using cofhejs for encrypted smart contract interactions.*
