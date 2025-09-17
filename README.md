# Equle 🔢

A privacy-preserving mathematical equation guessing game built with Fully Homomorphic Encryption (FHE) technology. Players attempt to solve daily mathematical equations while keeping their guesses completely private using cutting-edge cryptographic techniques.

## ⚡ Powered by Fhenix

Equle leverages **Fhenix Protocol**, the first Ethereum-compatible blockchain with native Fully Homomorphic Encryption (FHE) support. Fhenix enables developers to build confidential smart contracts where sensitive data remains encrypted during computation, unlocking new possibilities for privacy-preserving applications.

**Why Fhenix?**
- **Native FHE**: Built-in support for encrypted computations without compromising on EVM compatibility
- **Developer-Friendly**: Familiar Solidity development with FHE primitives
- **CoFHE Service**: Seamless encryption/decryption management for dApps
- **Privacy by Design**: True confidentiality for on-chain applications

This project showcases Fhenix's potential for **confidential gaming**, where game state, player strategies, and outcomes can remain private while still being verifiable on-chain.

## 🎮 About the Game

Equle is a Numberle-style game where players guess mathematical equations (like `2+3=5`) within 6 attempts. What makes it unique is the use of **Fully Homomorphic Encryption** to ensure complete privacy - your guesses remain encrypted even when processed on-chain, and only you can decrypt the results.

### Game Mechanics
- 🎯 Guess the daily 5-character mathematical equation
- 🔒 All guesses processed privately using FHE
- ⏱️ New puzzle every 24 hours
- 📊 6 attempts per game
- 🎨 Color-coded feedback (correct/present/absent)

## 🏗️ Project Structure

This monorepo contains two main packages:

### 📱 Frontend (`packages/cofhe-nextjs`)
Next.js application featuring:
- **Farcaster Integration**: Built with Farcaster Frame SDK for seamless miniapp experience
- **Wallet Connectivity**: Rainbow Kit + Wagmi for Web3 wallet integration  
- **Modern UI**: React 19 + TailwindCSS for responsive design
- **Privacy Gaming**: Real-time FHE encryption/decryption of game state

### ⚙️ Smart Contracts (`packages/hardhat`)
Hardhat development environment with:
- **FHE-Enabled Contracts**: Solidity contracts using Fhenix CoFHE libraries
- **Privacy-First Logic**: Encrypted game state and guess verification
- **Multi-Network Support**: Deployments on Ethereum Sepolia and Arbitrum Sepolia

## 🚀 Goals

### Base Network Launch
- Deploy as a **Base miniapp** for optimal performance and low fees
- Leverage Base's growing ecosystem for user acquisition
- Integrate with Base's developer tools and infrastructure

### Farcaster Ecosystem
- Launch as a **Farcaster Frame** for viral social gaming
- Enable seamless sharing of game results without revealing solutions
- Build community engagement through Farcaster's social layer

## 🛠️ Tech Stack

**Frontend**
- Next.js 15 with App Router
- React 19 + TypeScript
- TailwindCSS for styling
- Wagmi + RainbowKit for Web3
- Farcaster Frame SDK
- Zustand for state management

**Smart Contracts**
- Solidity ^0.8.25
- Fhenix CoFHE for FHE operations
- OpenZeppelin contracts
- Hardhat development framework

**Blockchain**
- Base (target deployment)
- Ethereum Sepolia (testnet)
- Arbitrum Sepolia (testnet)

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js ≥18.0.0
- npm ≥8.0.0

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd equle

# Install dependencies for all packages
npm run install:all
```

### Development

```bash
# Start the Next.js development server
npm run dev:nextjs

# In another terminal, compile smart contracts
npm run build:foundry

# Run tests
npm run test:foundry
```

### Frontend Development
```bash
cd packages/cofhe-nextjs
npm run dev
```

### Smart Contract Development
```bash
cd packages/hardhat
npx hardhat compile
npx hardhat test
```

## 🔐 Privacy Technology

Equle uses **Fully Homomorphic Encryption (FHE)** through Fhenix's CoFHE service:

- **Encrypted Guesses**: Player inputs are encrypted before being sent to the smart contract
- **Private Computation**: Game logic operates on encrypted data without decryption
- **Selective Revelation**: Only necessary feedback is decrypted and revealed to players
- **Zero Knowledge**: The daily equation remains completely hidden until the game ends



## 📚 Learn More

- [Fhenix Protocol](https://www.fhenix.io/)
- [CoFHE Documentation](https://cofhe-docs.fhenix.zone/)

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## 📄 License

MIT License - see LICENSE file for details.
