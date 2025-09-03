import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";
import {
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
  });

  describe("XOR Analysis & Wordle Feedback", function () {
    it("Should analyze XOR for perfect match (all Green)", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Player makes a perfect guess
      const playerGuess = "1+2*3"; // Same as target
      const playerResult = 9;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      const playerAttempts = await equle.getPlayerAttempts(gameId, bob.address);
      const playerAttempt = await equle.getPlayerAttempt(
        gameId,
        bob.address,
        playerAttempts - 1n
      );

      const unsealedEquationXor = await cofhejs.unseal(
        playerAttempt.equationXor,
        FheTypes.Uint128
      );

      const feedback = analyzeXorResult(unsealedEquationXor.data!);

      // Perfect match - all Green
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

    it("Should analyze XOR for mixed Green/Yellow/Gray feedback", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Target: "1+2*3", Player guess: "2+1*3"
      // Expected: Green=[false,true,false,true,true], Yellow=[true,false,true,false,false], Gray=[false,false,false,false,false]
      const playerGuess = "2+1*3";
      const playerResult = 9;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      const playerAttempts = await equle.getPlayerAttempts(gameId, bob.address);
      const playerAttempt = await equle.getPlayerAttempt(
        gameId,
        bob.address,
        playerAttempts - 1n
      );

      const unsealedEquationXor = await cofhejs.unseal(
        playerAttempt.equationXor,
        FheTypes.Uint128
      );

      const feedback = analyzeXorResult(unsealedEquationXor.data!);

      // Target: "1+2*3", Guess: "2+1*3"
      // Pos 0: '2' vs '1' -> Gray (2 not in target)
      // Pos 1: '+' vs '+' -> Green (exact match)
      // Pos 2: '1' vs '2' -> Yellow (1 exists in target at pos 0)
      // Pos 3: '*' vs '*' -> Green (exact match)
      // Pos 4: '3' vs '3' -> Green (exact match)
      expect(feedback.green).to.deep.equal([false, true, false, true, true]);
      expect(feedback.yellow).to.deep.equal([true, false, true, false, false]);
      expect(feedback.gray).to.deep.equal([false, false, false, false, false]);
    });

    it("Should analyze XOR for all Gray feedback", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Target: "1+2*3", Player guess: "4-5/6" (no characters match)
      const playerGuess = "4-5/6";
      const playerResult = 7;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      const playerAttempts = await equle.getPlayerAttempts(gameId, bob.address);
      const playerAttempt = await equle.getPlayerAttempt(
        gameId,
        bob.address,
        playerAttempts - 1n
      );

      const unsealedEquationXor = await cofhejs.unseal(
        playerAttempt.equationXor,
        FheTypes.Uint128
      );

      const feedback = analyzeXorResult(unsealedEquationXor.data!);

      // All characters are different from target
      expect(feedback.green).to.deep.equal([false, false, false, false, false]);
      expect(feedback.yellow).to.deep.equal([
        false,
        false,
        false,
        false,
        false,
      ]);
      expect(feedback.gray).to.deep.equal([true, true, true, true, true]);
    });

    it("Should analyze XOR for all Yellow feedback", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Target: "1+2*3", Player guess: "3*2+1" (all chars exist but wrong positions)
      const playerGuess = "3*1+2";
      const playerResult = 9;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      const playerAttempts = await equle.getPlayerAttempts(gameId, bob.address);
      const playerAttempt = await equle.getPlayerAttempt(
        gameId,
        bob.address,
        playerAttempts - 1n
      );

      const unsealedEquationXor = await cofhejs.unseal(
        playerAttempt.equationXor,
        FheTypes.Uint128
      );

      const feedback = analyzeXorResult(unsealedEquationXor.data!);

      // Target: "1+2*3", Guess: "3*2+1"
      // All characters exist in target but at different positions
      expect(feedback.green).to.deep.equal([false, false, false, false, false]);
      expect(feedback.yellow).to.deep.equal([true, true, true, true, true]);
      expect(feedback.gray).to.deep.equal([false, false, false, false, false]);
    });

    it("Should analyze XOR for complex mixed scenario", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Target: "1+2*3", Player guess: "1+4*2"
      const playerGuess = "1+4*2";
      const playerResult = 10;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      const playerAttempts = await equle.getPlayerAttempts(gameId, bob.address);
      const playerAttempt = await equle.getPlayerAttempt(
        gameId,
        bob.address,
        playerAttempts - 1n
      );

      const unsealedEquationXor = await cofhejs.unseal(
        playerAttempt.equationXor,
        FheTypes.Uint128
      );

      const feedback = analyzeXorResult(unsealedEquationXor.data!);

      // Target: "1+2*3", Guess: "1+4*2"
      // Pos 0: '1' vs '1' -> Green (exact match)
      // Pos 1: '+' vs '+' -> Green (exact match)
      // Pos 2: '4' vs '2' -> Gray (4 not in target)
      // Pos 3: '*' vs '*' -> Green (exact match)
      // Pos 4: '2' vs '3' -> Yellow (2 exists in target at pos 2)
      expect(feedback.green).to.deep.equal([true, true, false, true, false]);
      expect(feedback.yellow).to.deep.equal([false, false, false, false, true]);
      expect(feedback.gray).to.deep.equal([false, false, true, false, false]);
    });

    it("Should analyze XOR for duplicate characters scenario", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Target: "1+2*3", Player guess: "1+1+1"
      const playerGuess = "1+1+1";
      const playerResult = 3;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      const playerAttempts = await equle.getPlayerAttempts(gameId, bob.address);
      const playerAttempt = await equle.getPlayerAttempt(
        gameId,
        bob.address,
        playerAttempts - 1n
      );

      const unsealedEquationXor = await cofhejs.unseal(
        playerAttempt.equationXor,
        FheTypes.Uint128
      );

      const feedback = analyzeXorResult(unsealedEquationXor.data!);

      // Target: "1+2*3", Guess: "1+1+1"
      // Pos 0: '1' vs '1' -> Green (exact match)
      // Pos 1: '+' vs '+' -> Green (exact match)
      // Pos 2: '1' vs '2' -> Yellow (1 exists in target at pos 0, but we already matched it)
      // Pos 3: '+' vs '*' -> Yellow (+ exists in target at pos 1, but we already matched it)
      // Pos 4: '1' vs '3' -> Yellow (1 exists in target at pos 0, but we already matched it)
      expect(feedback.green).to.deep.equal([true, true, false, false, false]);
      expect(feedback.yellow).to.deep.equal([false, false, true, true, true]);
      expect(feedback.gray).to.deep.equal([false, false, false, false, false]);
    });
  });

  describe("Result Feedback Tests", function () {
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

      await hre.cofhe.mocks.expectPlaintext(playerAttempt.resultFeedback, 0n);

      const unsealedResultFeedback = await cofhejs.unseal(
        playerAttempt.resultFeedback,
        FheTypes.Uint16
      );
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

      await hre.cofhe.mocks.expectPlaintext(playerAttempt.resultFeedback, 1n);

      const unsealedResultFeedback = await cofhejs.unseal(
        playerAttempt.resultFeedback,
        FheTypes.Uint16
      );
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

      await hre.cofhe.mocks.expectPlaintext(playerAttempt.resultFeedback, 2n);

      const unsealedResultFeedback = await cofhejs.unseal(
        playerAttempt.resultFeedback,
        FheTypes.Uint16
      );
      await hre.cofhe.expectResultValue(unsealedResultFeedback, 2n);
    });
  });

  describe("Game Finalization", function () {
    it("Should finalize the game", async function () {
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

      await equle.connect(bob).finalizeGame();
      await time.increase(100);

      await equle.connect(bob).getDecryptedfinalizedEquation();

      const hasWon = await equle.hasPlayerWon(gameId, bob.address);
      expect(hasWon).to.equal(true);
    });
    it("Should finalize the game and lose the game", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Player makes a guess
      const playerGuess = "5-7/6"; // Correct guess
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

      await equle.connect(bob).finalizeGame();
      await time.increase(100);

      await equle.connect(bob).getDecryptedfinalizedEquation();

      const hasWon = await equle.hasPlayerWon(gameId, bob.address);
      expect(hasWon).to.equal(false);
    });
    it("Should finalize the game and lose the game on 1st attempt, but 2nd attempt should win", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Player makes a guess
      const playerGuess = "5-7/6"; // Correct guess
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

      await equle.connect(bob).finalizeGame();
      await time.increase(100);

      await equle.connect(bob).getDecryptedfinalizedEquation();

      const hasWon = await equle.hasPlayerWon(gameId, bob.address);
      expect(hasWon).to.equal(false);

      // Player makes a guess
      const player2ndGuess = "1+2*3"; // Correct guess
      const player2ndResult = 9; //

      const player2ndEquationBits = equationToAllRotations(player2ndGuess);
      const [encrypted2ndGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(player2ndEquationBits)] as const)
      );

      const [encrypted2ndPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(player2ndResult))] as const)
      );

      // Submit the guess
      await equle
        .connect(bob)
        .guess(encrypted2ndGuess, encrypted2ndPlayerResult);

      await equle.connect(bob).finalizeGame();
      await time.increase(100);

      await equle.connect(bob).getDecryptedfinalizedEquation();

      const hasWon2nd = await equle.hasPlayerWon(gameId, bob.address);
      expect(hasWon2nd).to.equal(true);
    });
  });

  describe("Error Conditions", function () {
    it("Should revert to finalize game without attempts", async function () {
      const { equle, bob } = await loadFixture(deployWithGameSetup);

      await expect(
        equle.connect(bob).finalizeGame()
      ).to.be.revertedWithCustomError(equle, "NoAttemptsYet");
    });

    it("Should revert to attempt more than MAX_ATTEMPTS", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Player makes a guess
      const player1stGuess = "132*3"; // Correct guess
      const player1stResult = 396; //

      const player1stEquationBits = equationToAllRotations(player1stGuess);
      const [encrypted1stGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(player1stEquationBits)] as const)
      );

      const [encryptedPlayer1stResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(player1stResult))] as const)
      );

      // Submit the guess
      await equle
        .connect(bob)
        .guess(encrypted1stGuess, encryptedPlayer1stResult);

      // Player makes a guess
      const player2ndGuess = "5*3+1"; // Correct guess
      const player2ndResult = 16; //

      const player2ndEquationBits = equationToAllRotations(player2ndGuess);
      const [encrypted2ndGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(player2ndEquationBits)] as const)
      );

      const [encryptedPlayer2ndResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(player2ndResult))] as const)
      );

      // Submit the guess
      await equle
        .connect(bob)
        .guess(encrypted2ndGuess, encryptedPlayer2ndResult);

      // Player makes a guess
      const player3rdGuess = "0*3+1"; // Correct guess
      const player3rdResult = 1; //

      const player3rdEquationBits = equationToAllRotations(player3rdGuess);
      const [encrypted3rdGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(player3rdEquationBits)] as const)
      );

      const [encryptedPlayer3rdResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(player3rdResult))] as const)
      );

      // Submit the guess
      await equle
        .connect(bob)
        .guess(encrypted3rdGuess, encryptedPlayer3rdResult);

      // Player makes a guess
      const player4thGuess = "987/18432"; // Correct guess
      const player4thResult = 1426; //

      const player4thEquationBits = equationToAllRotations(player4thGuess);
      const [encrypted4thGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(player4thEquationBits)] as const)
      );

      const [encryptedPlayer4thResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(player4thResult))] as const)
      );

      // Submit the guess
      await equle
        .connect(bob)
        .guess(encrypted4thGuess, encryptedPlayer4thResult);

      // Player makes a guess
      const player5thGuess = "0"; // Correct guess
      const player5thResult = 0; //

      const player5thEquationBits = equationToAllRotations(player5thGuess);
      const [encrypted5thGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(player5thEquationBits)] as const)
      );

      const [encryptedPlayer5thResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(player5thResult))] as const)
      );

      // Submit the guess
      await equle
        .connect(bob)
        .guess(encrypted5thGuess, encryptedPlayer5thResult);

      // Player makes a guess
      const player6thGuess = "1"; // Correct guess
      const player6thResult = 1; //

      const player6thEquationBits = equationToAllRotations(player6thGuess);
      const [encrypted6thGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(player6thEquationBits)] as const)
      );

      const [encryptedPlayer6thResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(player6thResult))] as const)
      );

      await equle
        .connect(bob)
        .guess(encrypted6thGuess, encryptedPlayer6thResult);

      const playerAttempts = await equle
        .connect(bob)
        .getPlayerAttempts(gameId, bob.address);
      expect(playerAttempts).to.equal(6);

      // Player makes a guess
      const player7thGuess = "*1"; // Correct guess
      const player7thResult = 1; //

      const player7thEquationBits = equationToAllRotations(player7thGuess);
      const [encrypted7thGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(player7thEquationBits)] as const)
      );

      const [encryptedPlayer7thResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(player7thResult))] as const)
      );

      await expect(
        equle.connect(bob).guess(encrypted7thGuess, encryptedPlayer7thResult)
      ).to.be.revertedWithCustomError(equle, "MaxAttemptsReached");
    });
    it("Should revert to game already won", async function () {
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

      await equle.connect(bob).finalizeGame();
      await time.increase(100);

      await equle.connect(bob).getDecryptedfinalizedEquation();

      const hasWon = await equle.hasPlayerWon(gameId, bob.address);
      expect(hasWon).to.equal(true);

      await expect(
        equle.connect(bob).finalizeGame()
      ).to.be.revertedWithCustomError(equle, "GameAlreadyWon");
    });
  });

  describe("Getter Functions", function () {
    it("Should return correct player win status", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initially should be false
      let hasWon = await equle.hasPlayerWon(gameId, bob.address);
      expect(hasWon).to.equal(false);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Player makes a winning guess
      const playerGuess = "1+2*3";
      const playerResult = 9;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);
      await equle.connect(bob).finalizeGame();
      await time.increase(100);
      await equle.connect(bob).getDecryptedfinalizedEquation();

      // Should now be true
      hasWon = await equle.hasPlayerWon(gameId, bob.address);
      expect(hasWon).to.equal(true);
    });

    it("Should return correct player attempt count", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initially should be 0
      let attemptCount = await equle.getPlayerAttempts(gameId, bob.address);
      expect(attemptCount).to.equal(0);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Make first guess
      const playerGuess1 = "5-7/6";
      const playerResult1 = 8;

      const playerEquationBits1 = equationToAllRotations(playerGuess1);
      const [encryptedGuess1] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits1)] as const)
      );

      const [encryptedPlayerResult1] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult1))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess1, encryptedPlayerResult1);

      // Should be 1 after first guess
      attemptCount = await equle.getPlayerAttempts(gameId, bob.address);
      expect(attemptCount).to.equal(1);

      // Make second guess
      const playerGuess2 = "1+2*3";
      const playerResult2 = 9;

      const playerEquationBits2 = equationToAllRotations(playerGuess2);
      const [encryptedGuess2] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits2)] as const)
      );

      const [encryptedPlayerResult2] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult2))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess2, encryptedPlayerResult2);

      // Should be 2 after second guess
      attemptCount = await equle.getPlayerAttempts(gameId, bob.address);
      expect(attemptCount).to.equal(2);
    });

    it("Should return correct player last equation guess", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      const playerGuess = "1+2*3";
      const playerResult = 9;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      // Get the last equation guess
      const lastEquationGuess = await equle.getPlayerLastEquationGuess(
        gameId,
        bob.address
      );

      // Unseal and verify it matches what we sent
      const unsealedEquationGuess = await cofhejs.unseal(
        lastEquationGuess,
        FheTypes.Uint128
      );

      expect(unsealedEquationGuess.data).to.equal(playerEquationBits);
    });

    it("Should return correct player last result guess", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      const playerGuess = "1+2*3";
      const playerResult = 9;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      // Get the last result guess
      const lastResultGuess = await equle.getPlayerLastResultGuess(
        gameId,
        bob.address
      );

      // Unseal and verify it matches what we sent
      const unsealedResultGuess = await cofhejs.unseal(
        lastResultGuess,
        FheTypes.Uint16
      );

      expect(unsealedResultGuess.data).to.equal(BigInt(playerResult));
    });

    it("Should return correct player equation XOR", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      const playerGuess = "419*3"; // Different from target "1+2*3"
      const playerResult = 9;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      // Get the equation XOR
      const equationXor = await equle.getPlayerEquationXor(gameId, bob.address);

      // Unseal and verify it's non-zero (since guess != target)
      const unsealedEquationXor = await cofhejs.unseal(
        equationXor,
        FheTypes.Uint128
      );

      // Should not be zero since the guess is different from target
      expect(unsealedEquationXor.data).to.not.equal(0n);

      // Verify XOR analysis works
      const feedback = analyzeXorResult(unsealedEquationXor.data!);
      expect(feedback.green).to.not.deep.equal([true, true, true, true, true]);
    });

    it("Should return correct player game state", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initially should be 0 attempts and not won
      let [currentAttempt, hasWon] = await equle.getPlayerGameState(
        gameId,
        bob.address
      );
      expect(currentAttempt).to.equal(0);
      expect(hasWon).to.equal(false);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Make a losing guess first
      const playerGuess1 = "5-7/6";
      const playerResult1 = 8;

      const playerEquationBits1 = equationToAllRotations(playerGuess1);
      const [encryptedGuess1] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits1)] as const)
      );

      const [encryptedPlayerResult1] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult1))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess1, encryptedPlayerResult1);

      // Should be 1 attempt and not won
      [currentAttempt, hasWon] = await equle.getPlayerGameState(
        gameId,
        bob.address
      );
      expect(currentAttempt).to.equal(1);
      expect(hasWon).to.equal(false);

      // Make a winning guess
      const playerGuess2 = "1+2*3";
      const playerResult2 = 9;

      const playerEquationBits2 = equationToAllRotations(playerGuess2);
      const [encryptedGuess2] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits2)] as const)
      );

      const [encryptedPlayerResult2] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult2))] as const)
      );

      await equle.connect(bob).guess(encryptedGuess2, encryptedPlayerResult2);
      await equle.connect(bob).finalizeGame();
      await time.increase(100);
      await equle.connect(bob).getDecryptedfinalizedEquation();

      // Should be 2 attempts and won
      [currentAttempt, hasWon] = await equle.getPlayerGameState(
        gameId,
        bob.address
      );
      expect(currentAttempt).to.equal(2);
      expect(hasWon).to.equal(true);
    });
  });
});
