import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";
import {
  bitsToEquation,
  equationToBits,
  equationToAllRotations,
  equationToAllSame,
  analyzeXorResult,
} from "../utils";

describe("Equle", function () {
  async function deployEquleFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, signer, bob, alice] = await hre.ethers.getSigners();

    const Equle = await hre.ethers.getContractFactory("Equle");
    const equle = await Equle.connect(owner).deploy();

    return { equle, owner, signer, bob, alice };
  }

  async function deployWithGameSetup() {
    const { equle, owner, signer, bob, alice } = await deployEquleFixture();

    // Initialize CoFHE for the owner
    await hre.cofhe.expectResultSuccess(
      hre.cofhe.initializeWithHardhatSigner(owner)
    );

    const gameId = await equle.getCurrentGameId();
    const equation = "1+2*3";
    const result = 9; //

    const equationSame100Bits = equationToAllSame(equation);

    const [encryptedEquation] = await hre.cofhe.expectResultSuccess(
      cofhejs.encrypt([Encryptable.uint128(equationSame100Bits)] as const)
    );

    const [encryptedResult] = await hre.cofhe.expectResultSuccess(
      cofhejs.encrypt([Encryptable.uint16(BigInt(result))] as const)
    );

    // Set the game
    await equle
      .connect(owner)
      .setGame(gameId, encryptedEquation, encryptedResult);

    return {
      equle,
      owner,
      signer,
      bob,
      alice,
      gameId,
      equation,
      result,
      encryptedEquation,
      encryptedResult,
    };
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

    it("Should check gameId and advance to different game days", async function () {
      const { equle } = await loadFixture(deployEquleFixture);

      // Check initial game ID (day 1)
      let gameId = await equle.getCurrentGameId();
      console.log("gameId", gameId);
      expect(gameId).to.equal(1n);

      // Advance time by 1 day (86400 seconds)
      await time.increase(86400);

      // Should now be day 2
      gameId = await equle.getCurrentGameId();
      expect(gameId).to.equal(2n);

      // Advance by 3 more days
      await time.increase(86400 * 3);

      // Should now be day 5
      gameId = await equle.getCurrentGameId();
      expect(gameId).to.equal(5n);
    });
    it("Should set a game", async function () {
      const { equle, owner } = await loadFixture(deployEquleFixture);

      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(owner)
      );

      const gameId = await equle.getCurrentGameId();
      const equation = "1+2*3";
      const result = "9";

      const equationSame100Bits = equationToAllSame(equation);

      const [encryptedEquation] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(equationSame100Bits)] as const)
      );
      await hre.cofhe.mocks.expectPlaintext(
        encryptedEquation.ctHash,
        equationSame100Bits
      );

      const [encryptedResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(result)] as const)
      );
      await hre.cofhe.mocks.expectPlaintext(
        encryptedResult.ctHash,
        BigInt(result)
      );

      await equle.setGame(gameId, encryptedEquation, encryptedResult);
    });
    it("Should revert to set a game not owner", async function () {
      const { equle, bob } = await loadFixture(deployEquleFixture);

      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      const gameId = await equle.getCurrentGameId();
      const equation = "1+2*3";
      const result = "9";

      const equationSame100Bits = equationToAllSame(equation);

      const [encryptedEquation] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(equationSame100Bits)] as const)
      );
      await hre.cofhe.mocks.expectPlaintext(
        encryptedEquation.ctHash,
        equationSame100Bits
      );

      const [encryptedResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(result)] as const)
      );
      await hre.cofhe.mocks.expectPlaintext(
        encryptedResult.ctHash,
        BigInt(result)
      );

      await expect(
        equle.connect(bob).setGame(gameId, encryptedEquation, encryptedResult)
      ).to.be.revertedWithCustomError(equle, "OwnableUnauthorizedAccount");
    });

    it("Should guess correctly on 1st attempt and unseal the XOR matching the target", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Player makes a guess
      const playerGuess = "1+2*3"; // Correct guess
      const playerResult = 9; //

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      // Submit the guess
      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      // Check that the attempt was recorded
      const playerAttempts = await equle.getPlayerAttempts(gameId, bob.address);
      expect(playerAttempts).to.equal(1);

      const playerAttempt = await equle.getPlayerAttempt(
        gameId,
        bob.address,
        playerAttempts - 1n
      );
      console.log("playerAttempt", playerAttempt);

      const unsealedEquationXor = await cofhejs.unseal(
        playerAttempt.equationXor,
        FheTypes.Uint128
      );

      // Analyze the XOR result for Wordle-style feedback
      const feedback = analyzeXorResult(unsealedEquationXor.data!);

      // Test expectations for perfect match (guess = target = "1+2*3")
      expect(feedback.green).to.deep.equal([true, true, true, true, true]);
      expect(feedback.yellow).to.deep.equal([
        false,
        false,
        false,
        false,
        false,
      ]);
      expect(feedback.gray).to.deep.equal([false, false, false, false, false]);
    });
    it("Should guess correctly on 1st attempt and result feedback should be 0", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Player makes a guess
      const playerGuess = "1+2*3"; // Correct guess
      const playerResult = 9; //

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      // Submit the guess
      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      // Check that the attempt was recorded
      const playerAttempts = await equle.getPlayerAttempts(gameId, bob.address);
      expect(playerAttempts).to.equal(1);

      const playerAttempt = await equle.getPlayerAttempt(
        gameId,
        bob.address,
        playerAttempts - 1n
      );
      console.log("playerAttempt", playerAttempt);

      await hre.cofhe.mocks.expectPlaintext(playerAttempt.resultFeedback, 0n);

      const unsealedResultFeedback = await cofhejs.unseal(
        playerAttempt.resultFeedback,
        FheTypes.Uint16
      );
      console.log("unsealedResultFeedback", unsealedResultFeedback);
      await hre.cofhe.expectResultValue(unsealedResultFeedback, 0n);
    });
    it("Result feedback should be 1 for lower than target", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Player makes a guess
      const playerGuess = "1+3*2"; // Correct guess
      const playerResult = 8; //

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      // Submit the guess
      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      // Check that the attempt was recorded
      const playerAttempts = await equle.getPlayerAttempts(gameId, bob.address);
      expect(playerAttempts).to.equal(1);

      const playerAttempt = await equle.getPlayerAttempt(
        gameId,
        bob.address,
        playerAttempts - 1n
      );
      console.log("playerAttempt", playerAttempt);

      await hre.cofhe.mocks.expectPlaintext(playerAttempt.resultFeedback, 1n);

      const unsealedResultFeedback = await cofhejs.unseal(
        playerAttempt.resultFeedback,
        FheTypes.Uint16
      );
      console.log("unsealedResultFeedback", unsealedResultFeedback);
      await hre.cofhe.expectResultValue(unsealedResultFeedback, 1n);
    });
    it("Result feedback should be 2 for higher than target", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Player makes a guess
      const playerGuess = "1+4*2"; // Correct guess
      const playerResult = 10; //

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      // Submit the guess
      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      // Check that the attempt was recorded
      const playerAttempts = await equle.getPlayerAttempts(gameId, bob.address);
      expect(playerAttempts).to.equal(1);

      const playerAttempt = await equle.getPlayerAttempt(
        gameId,
        bob.address,
        playerAttempts - 1n
      );
      console.log("playerAttempt", playerAttempt);

      await hre.cofhe.mocks.expectPlaintext(playerAttempt.resultFeedback, 2n);

      const unsealedResultFeedback = await cofhejs.unseal(
        playerAttempt.resultFeedback,
        FheTypes.Uint16
      );
      console.log("unsealedResultFeedback", unsealedResultFeedback);
      await hre.cofhe.expectResultValue(unsealedResultFeedback, 2n);
    });
    it("Should finalize the game", async function () {});
    it("Should revert to finalize game without attempts", async function () {});
    it("Should revert to attempt more than 5 times", async function () {});
    it("Should revert to game already won", async function () {});
    it("Should lose the game on 5 attempts", async function () {});
    describe("Getter Functions", function () {
      it("Should return correct player win status", async function () {});
      it("Should return correct player attempt count", async function () {});
      it("Should return correct player last equation guess", async function () {});
      it("Should return correct player last result guess", async function () {});
      it("Should return correct player equation XOR", async function () {});
      it("Should return correct player game state", async function () {});
    });
  });
});
