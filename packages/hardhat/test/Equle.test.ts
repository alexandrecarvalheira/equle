import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";

describe("Counter", function () {
  async function deployCounterFixture() {
    // Contracts are deployed using the first signer/account by default
    const [signer, signer2, bob, alice] = await hre.ethers.getSigners();

    const Counter = await hre.ethers.getContractFactory("Counter");
    const counter = await Counter.connect(bob).deploy();

    return { counter, signer, bob, alice };
  }

  describe("Functionality", function () {
    beforeEach(function () {
      if (!hre.cofhe.isPermittedEnvironment("MOCK")) this.skip();

      // NOTE: Uncomment for global logging
      // hre.cofhe.mocks.enableLogs()
    });

    afterEach(function () {
      if (!hre.cofhe.isPermittedEnvironment("MOCK")) return;

      // NOTE: Uncomment for global logging
      // hre.cofhe.mocks.disableLogs()
    });

    it("Should increment the counter", async function () {
      const { counter, bob } = await loadFixture(deployCounterFixture);
      const count = await counter.count();
      await hre.cofhe.mocks.expectPlaintext(count, 0n);

      await hre.cofhe.mocks.withLogs("counter.increment()", async () => {
        await counter.connect(bob).increment();
      });

      const count2 = await counter.count();
      await hre.cofhe.mocks.expectPlaintext(count2, 1n);
    });
    it("cofhejs unseal (mocks)", async function () {
      await hre.cofhe.mocks.enableLogs("cofhejs unseal (mocks)");
      const { counter, bob } = await loadFixture(deployCounterFixture);

      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      const count = await counter.count();
      const unsealedResult = await cofhejs.unseal(count, FheTypes.Uint32);
      console.log("unsealedResult", unsealedResult);
      await hre.cofhe.expectResultValue(unsealedResult, 0n);

      await counter.connect(bob).increment();

      const count2 = await counter.count();
      const unsealedResult2 = await cofhejs.unseal(count2, FheTypes.Uint32);
      await hre.cofhe.expectResultValue(unsealedResult2, 1n);

      await hre.cofhe.mocks.disableLogs();
    });
    it("cofhejs encrypt (mocks)", async function () {
      const { counter, bob } = await loadFixture(deployCounterFixture);

      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      const [encryptedInput] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint32(5n)] as const)
      );
      await hre.cofhe.mocks.expectPlaintext(encryptedInput.ctHash, 5n);

      await counter.connect(bob).reset(encryptedInput);

      const count = await counter.count();
      await hre.cofhe.mocks.expectPlaintext(count, 5n);

      const unsealedResult = await cofhejs.unseal(count, FheTypes.Uint32);
      await hre.cofhe.expectResultValue(unsealedResult, 5n);
    });
  });
});

// Deployment Tests

// - ✅ Contract deploys successfully
// - ✅ Owner is set correctly
// - ✅ startTimestamp is set to block.timestamp
// - ✅ Constants are initialized (DAY, MAX_ATTEMPTS)
// - ✅ FHE constants (ZERO, ONE, TWO) are initialized and accessible

// Constructor Tests

// - ✅ ZERO, ONE, TWO FHE values are properly encrypted and allowed

// Game ID Tests

// - ✅ getCurrentGameId() returns correct game ID for day 1
// - ✅ getCurrentGameId() increases after time advances
// - ✅ Game ID calculation works for multiple days
// - ✅ Game ID starts from 1 (not 0)

// setGame Function Tests (Owner Only)

// - ✅ Owner can set game equation and result
// - ✅ Non-owner cannot call setGame() (should revert)
// - ✅ FHE values are properly stored and accessible after setting
// - ✅ Multiple games can be set for different game IDs
// - ✅ Can overwrite existing game settings

// guess Function Tests

// Basic Functionality

// - ✅ Player can submit first guess successfully
// - ✅ Player can submit multiple guesses (up to 5)
// - ✅ Guess increments attempt counter
// - ✅ Stores equation and result guesses correctly
// - ✅ Calculates XOR between guess and target equation
// - ✅ Returns correct result feedback (0=correct, 1=too low, 2=too high)

// Attempt Limits

// - ✅ Rejects 6th attempt with MaxAttemptsReached error
// - ✅ Tracks attempt count correctly for each player
// - ✅ Different players have independent attempt counts

// Game State Management

// - ✅ Cannot guess after winning (GameAlreadyWon error)
// - ✅ Player state is isolated per game ID
// - ✅ Player state is isolated per address

// FHE Operations

// - ✅ XOR operation works correctly between guess and target
// - ✅ Result comparison works for equal values (returns 0)
// - ✅ Result comparison works for lower values (returns 1)
// - ✅ Result comparison works for higher values (returns 2)

// Access Control Lists (ACL)

// - ✅ Player can access their own encrypted guesses
// - ✅ Contract can access stored encrypted values
// - ✅ ACL permissions are set correctly after guess

// Events

// - ✅ GuessSubmitted event is emitted with correct parameters
// - ✅ Event contains correct attempt number
// - ✅ Event contains encrypted guess values

// finalizeGame Function Tests

// - ✅ Player can finalize game after making guesses
// - ✅ Cannot finalize without any attempts (NoAttemptsYet error)
// - ✅ Initiates decryption of equation XOR
// - ✅ Emits GameFinalized event with correct parameters
// - ✅ Can be called multiple times without error

// getDecryptedfinalizedEquation Function Tests

// - ✅ Cannot call without attempts (NoAttemptsYet error)
// - ✅ Cannot get result before decryption is ready (DecryptionNotReady error)
// - ✅ Correctly determines win condition (lower 20 bits == 0)
// - ✅ Correctly determines loss condition (lower 20 bits != 0)
// - ✅ Sets hasWon flag correctly
// - ✅ Emits GameCompleted event with correct parameters

// Getter Function Tests

// - ✅ hasPlayerWon() returns correct boolean
// - ✅ getPlayerAttempts() returns correct attempt count
// - ✅ getPlayerLastEquationGuess() returns correct encrypted value
// - ✅ getPlayerLastResultGuess() returns correct encrypted value
// - ✅ getPlayerEquationXor() returns correct XOR result
// - ✅ getPlayerGameState() returns complete state tuple

// Multi-Player Tests

// - ✅ Multiple players can play same game independently
// - ✅ Player states don't interfere with each other
// - ✅ Each player has independent attempt counters
// - ✅ Each player has independent win states

// Multi-Game Tests

// - ✅ Players can participate in different games
// - ✅ Game states are isolated by game ID
// - ✅ Previous game states don't affect new games

// Edge Cases & Error Conditions

// - ✅ Handles zero values in equations/results
// - ✅ Handles maximum uint128/uint16 values
// - ✅ Proper behavior with unset games
// - ✅ Handles time boundary conditions (exactly at day change)

// FHE-Specific Tests

// - ✅ Encrypted values remain encrypted throughout operations
// - ✅ Decryption only works after finalizeGame() call
// - ✅ Mock environment properly handles FHE operations
// - ✅ ACL permissions work correctly with cofhejs

// Integration Tests

// - ✅ Complete game flow: setGame → guess → finalizeGame → getResult
// - ✅ Winning scenario end-to-end
// - ✅ Losing scenario (5 attempts) end-to-end
// - ✅ Multiple games across different days
