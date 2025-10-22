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
  describe("Functionality", function () {
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

      await equle.connect(bob).ClaimVictory();

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

      await equle.connect(bob).ClaimVictory();

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

      await equle.connect(bob).ClaimVictory();

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

      await equle.connect(bob).ClaimVictory();

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

      await equle.connect(bob).ClaimVictory();

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
      await equle.connect(bob).ClaimVictory();

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
      await equle.connect(bob).ClaimVictory();

      // Should be 2 attempts and won
      [currentAttempt, hasWon] = await equle.getPlayerGameState(
        gameId,
        bob.address
      );
      expect(currentAttempt).to.equal(2);
      expect(hasWon).to.equal(true);
    });
  });

  describe("NFT Functionality", function () {
    it("Should verify NFT initialization after deployment", async function () {
      const { equle } = await loadFixture(deployEquleFixture);

      // Verify that equleNFT address is set
      const nftAddress = await equle.equleNFT();
      expect(nftAddress).to.not.equal(hre.ethers.ZeroAddress);

      // Get EquleNFT contract instance
      const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
      const nft = EquleNFT.attach(nftAddress);

      // Verify that EquleNFT owner is the Equle contract address
      const nftOwner = await nft.owner();
      expect(nftOwner).to.equal(await equle.getAddress());
    });

    it("Should mint NFT on first win with correct stats", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

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

      // Submit the guess
      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      // Finalize and claim victory
      await equle.connect(bob).finalizeGame();
      await time.increase(100);

      // Get NFT contract instance
      const nftAddress = await equle.equleNFT();
      const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
      const nft = EquleNFT.attach(nftAddress);

      // Verify no NFT before claiming
      expect(await nft.balanceOf(bob.address)).to.equal(0);

      // Claim victory (should mint NFT)
      await expect(equle.connect(bob).ClaimVictory())
        .to.emit(equle, "NFTMinted")
        .withArgs(bob.address, gameId, 1);

      // Verify NFT is minted (balanceOf = 1)
      expect(await nft.balanceOf(bob.address)).to.equal(1);

      // Verify player has correct tokenId
      const tokenId = await nft.tokenId(bob.address);
      expect(tokenId).to.equal(1);

      // Verify PlayerStats
      const stats = await nft.getPlayerStats(bob.address);
      expect(stats.totalWins).to.equal(1);
      expect(stats.currentStreak).to.equal(1);
      expect(stats.maxStreak).to.equal(1);
      expect(stats.lastGamePlayed).to.equal(gameId);

      // Verify hasNFT returns true
      expect(await nft.hasNFT(bob.address)).to.equal(true);

      // Verify NFT metadata contains correct attributes
      const tokenURI = await nft.tokenURI(tokenId);
      expect(tokenURI).to.include("data:application/json;base64,");
    });

    it("Should update NFT on consecutive wins without minting new token", async function () {
      const { equle, bob, owner, gameId } = await loadFixture(
        deployWithGameSetup
      );

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Get NFT contract instance
      const nftAddress = await equle.equleNFT();
      const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
      const nft = EquleNFT.attach(nftAddress);

      // Player wins day 1 game
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
      await equle.connect(bob).ClaimVictory();

      // Verify first win stats
      let stats = await nft.getPlayerStats(bob.address);
      expect(stats.totalWins).to.equal(1);
      expect(stats.currentStreak).to.equal(1);
      expect(stats.maxStreak).to.equal(1);
      expect(await nft.balanceOf(bob.address)).to.equal(1);

      // Advance time by 1 day
      await time.increase(86400);

      // Setup day 2 game
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(owner)
      );

      const gameId2 = await equle.getCurrentGameId();
      const equation2 = "2+3*4";
      const result2 = 14;

      const equationSame100Bits2 = equationToAllSame(equation2);
      const [encryptedEquation2] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(equationSame100Bits2)] as const)
      );

      const [encryptedResult2] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(result2))] as const)
      );

      await equle
        .connect(owner)
        .setGame(gameId2, encryptedEquation2, encryptedResult2);

      // Player wins day 2 game
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      const player2ndGuess = "2+3*4";
      const player2ndResult = 14;

      const player2ndEquationBits = equationToAllRotations(player2ndGuess);
      const [encrypted2ndGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(player2ndEquationBits)] as const)
      );

      const [encrypted2ndPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(player2ndResult))] as const)
      );

      await equle
        .connect(bob)
        .guess(encrypted2ndGuess, encrypted2ndPlayerResult);
      await equle.connect(bob).finalizeGame();
      await time.increase(100);

      // Expect NFTUpdated event instead of NFTMinted
      await expect(equle.connect(bob).ClaimVictory()).to.emit(
        equle,
        "NFTMinted"
      );

      // Verify balanceOf still = 1 (no second NFT minted)
      expect(await nft.balanceOf(bob.address)).to.equal(1);

      // Verify stats updated
      stats = await nft.getPlayerStats(bob.address);
      expect(stats.totalWins).to.equal(2);
      expect(stats.currentStreak).to.equal(2);
      expect(stats.maxStreak).to.equal(2);
      expect(stats.lastGamePlayed).to.equal(gameId2);
    });

    it("Should reset current streak when days are skipped", async function () {
      const { equle, bob, owner, gameId } = await loadFixture(
        deployWithGameSetup
      );

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Get NFT contract instance
      const nftAddress = await equle.equleNFT();
      const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
      const nft = EquleNFT.attach(nftAddress);

      // Player wins day 1
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
      await equle.connect(bob).ClaimVictory();

      // Advance time by 2 days (skip day 2)
      await time.increase(86400 * 2);

      // Setup day 3 game
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(owner)
      );

      const gameId3 = await equle.getCurrentGameId();
      const equation3 = "5+6*2";
      const result3 = 17;

      const equationSame100Bits3 = equationToAllSame(equation3);
      const [encryptedEquation3] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(equationSame100Bits3)] as const)
      );

      const [encryptedResult3] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(result3))] as const)
      );

      await equle
        .connect(owner)
        .setGame(gameId3, encryptedEquation3, encryptedResult3);

      // Player wins day 3
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      const player3rdGuess = "5+6*2";
      const player3rdResult = 17;

      const player3rdEquationBits = equationToAllRotations(player3rdGuess);
      const [encrypted3rdGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(player3rdEquationBits)] as const)
      );

      const [encrypted3rdPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(player3rdResult))] as const)
      );

      await equle
        .connect(bob)
        .guess(encrypted3rdGuess, encrypted3rdPlayerResult);
      await equle.connect(bob).finalizeGame();
      await time.increase(100);
      await equle.connect(bob).ClaimVictory();

      // Verify: totalWins=2, currentStreak=1, maxStreak=1
      const stats = await nft.getPlayerStats(bob.address);
      expect(stats.totalWins).to.equal(2);
      expect(stats.currentStreak).to.equal(1);
      expect(stats.maxStreak).to.equal(1);
    });

    it("Should preserve max streak even after current streak resets", async function () {
      const { equle, bob, owner, gameId } = await loadFixture(
        deployWithGameSetup
      );

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Get NFT contract instance
      const nftAddress = await equle.equleNFT();
      const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
      const nft = EquleNFT.attach(nftAddress);

      // Win day 1
      const playerGuess1 = "1+2*3";
      const playerResult1 = 9;
      const playerEquationBits1 = equationToAllRotations(playerGuess1);
      const [encryptedGuess1] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits1)] as const)
      );
      const [encryptedPlayerResult1] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult1))] as const)
      );
      await equle.connect(bob).guess(encryptedGuess1, encryptedPlayerResult1);
      await equle.connect(bob).finalizeGame();
      await time.increase(100);
      await equle.connect(bob).ClaimVictory();

      // Advance to day 2
      await time.increase(86400);
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(owner)
      );
      const gameId2 = await equle.getCurrentGameId();
      const equation2 = "2+3*4";
      const result2 = 14;
      const equationSame100Bits2 = equationToAllSame(equation2);
      const [encryptedEquation2] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(equationSame100Bits2)] as const)
      );
      const [encryptedResult2] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(result2))] as const)
      );
      await equle
        .connect(owner)
        .setGame(gameId2, encryptedEquation2, encryptedResult2);

      // Win day 2
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );
      const playerGuess2 = "2+3*4";
      const playerResult2 = 14;
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
      await equle.connect(bob).ClaimVictory();

      // Advance to day 3
      await time.increase(86400);
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(owner)
      );
      const gameId3 = await equle.getCurrentGameId();
      const equation3 = "5+6*2";
      const result3 = 17;
      const equationSame100Bits3 = equationToAllSame(equation3);
      const [encryptedEquation3] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(equationSame100Bits3)] as const)
      );
      const [encryptedResult3] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(result3))] as const)
      );
      await equle
        .connect(owner)
        .setGame(gameId3, encryptedEquation3, encryptedResult3);

      // Win day 3
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );
      const playerGuess3 = "5+6*2";
      const playerResult3 = 17;
      const playerEquationBits3 = equationToAllRotations(playerGuess3);
      const [encryptedGuess3] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits3)] as const)
      );
      const [encryptedPlayerResult3] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult3))] as const)
      );
      await equle.connect(bob).guess(encryptedGuess3, encryptedPlayerResult3);
      await equle.connect(bob).finalizeGame();
      await time.increase(100);
      await equle.connect(bob).ClaimVictory();

      // Verify maxStreak=3
      let stats = await nft.getPlayerStats(bob.address);
      expect(stats.totalWins).to.equal(3);
      expect(stats.currentStreak).to.equal(3);
      expect(stats.maxStreak).to.equal(3);

      // Skip day 4, advance to day 5
      await time.increase(86400 * 2);
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(owner)
      );
      const gameId5 = await equle.getCurrentGameId();
      const equation5 = "7+8*1";
      const result5 = 15;
      const equationSame100Bits5 = equationToAllSame(equation5);
      const [encryptedEquation5] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(equationSame100Bits5)] as const)
      );
      const [encryptedResult5] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(result5))] as const)
      );
      await equle
        .connect(owner)
        .setGame(gameId5, encryptedEquation5, encryptedResult5);

      // Win day 5
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );
      const playerGuess5 = "7+8*1";
      const playerResult5 = 15;
      const playerEquationBits5 = equationToAllRotations(playerGuess5);
      const [encryptedGuess5] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits5)] as const)
      );
      const [encryptedPlayerResult5] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult5))] as const)
      );
      await equle.connect(bob).guess(encryptedGuess5, encryptedPlayerResult5);
      await equle.connect(bob).finalizeGame();
      await time.increase(100);
      await equle.connect(bob).ClaimVictory();

      // Advance to day 6
      await time.increase(86400);
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(owner)
      );
      const gameId6 = await equle.getCurrentGameId();
      const equation6 = "9-3*2";
      const result6 = 3;
      const equationSame100Bits6 = equationToAllSame(equation6);
      const [encryptedEquation6] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(equationSame100Bits6)] as const)
      );
      const [encryptedResult6] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(result6))] as const)
      );
      await equle
        .connect(owner)
        .setGame(gameId6, encryptedEquation6, encryptedResult6);

      // Win day 6
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );
      const playerGuess6 = "9-3*2";
      const playerResult6 = 3;
      const playerEquationBits6 = equationToAllRotations(playerGuess6);
      const [encryptedGuess6] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits6)] as const)
      );
      const [encryptedPlayerResult6] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult6))] as const)
      );
      await equle.connect(bob).guess(encryptedGuess6, encryptedPlayerResult6);
      await equle.connect(bob).finalizeGame();
      await time.increase(100);
      await equle.connect(bob).ClaimVictory();

      // Verify: totalWins=5, currentStreak=2, maxStreak=3 (preserved)
      stats = await nft.getPlayerStats(bob.address);
      expect(stats.totalWins).to.equal(5);
      expect(stats.currentStreak).to.equal(2);
      expect(stats.maxStreak).to.equal(3);
    });

    it("Should mint separate unique NFTs for multiple players", async function () {
      const { equle, bob, alice, gameId } = await loadFixture(
        deployWithGameSetup
      );

      // Get NFT contract instance
      const nftAddress = await equle.equleNFT();
      const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
      const nft = EquleNFT.attach(nftAddress);

      // Bob wins
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );
      const bobGuess = "1+2*3";
      const bobResult = 9;
      const bobEquationBits = equationToAllRotations(bobGuess);
      const [bobEncryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(bobEquationBits)] as const)
      );
      const [bobEncryptedResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(bobResult))] as const)
      );
      await equle.connect(bob).guess(bobEncryptedGuess, bobEncryptedResult);
      await equle.connect(bob).finalizeGame();
      await time.increase(100);
      await equle.connect(bob).ClaimVictory();

      // Verify Bob has NFT
      expect(await nft.balanceOf(bob.address)).to.equal(1);
      const bobTokenId = await nft.tokenId(bob.address);
      expect(bobTokenId).to.equal(1);
      const bobStats = await nft.getPlayerStats(bob.address);
      expect(bobStats.totalWins).to.equal(1);

      // Alice wins
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(alice)
      );
      const aliceGuess = "1+2*3";
      const aliceResult = 9;
      const aliceEquationBits = equationToAllRotations(aliceGuess);
      const [aliceEncryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(aliceEquationBits)] as const)
      );
      const [aliceEncryptedResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(aliceResult))] as const)
      );
      await equle
        .connect(alice)
        .guess(aliceEncryptedGuess, aliceEncryptedResult);
      await equle.connect(alice).finalizeGame();
      await time.increase(100);
      await equle.connect(alice).ClaimVictory();

      // Verify Alice has separate NFT
      expect(await nft.balanceOf(alice.address)).to.equal(1);
      const aliceTokenId = await nft.tokenId(alice.address);
      expect(aliceTokenId).to.equal(2);
      expect(aliceTokenId).to.not.equal(bobTokenId);

      // Verify both have independent stats
      const aliceStats = await nft.getPlayerStats(alice.address);
      expect(aliceStats.totalWins).to.equal(1);
      expect(aliceStats.currentStreak).to.equal(1);
      expect(aliceStats.lastGamePlayed).to.equal(gameId);

      // Bob's stats should be unchanged
      const bobStatsAfter = await nft.getPlayerStats(bob.address);
      expect(bobStatsAfter.totalWins).to.equal(1);
      expect(bobStatsAfter.currentStreak).to.equal(1);
    });

    it("Should not mint NFT on loss", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Get NFT contract instance
      const nftAddress = await equle.equleNFT();
      const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
      const nft = EquleNFT.attach(nftAddress);

      // Player makes an incorrect guess
      const playerGuess = "5-7/6";
      const playerResult = 9;

      const playerEquationBits = equationToAllRotations(playerGuess);
      const [encryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
      );

      const [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
      );

      // Submit the guess
      await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

      // Finalize and claim victory
      await equle.connect(bob).finalizeGame();
      await time.increase(100);
      await equle.connect(bob).ClaimVictory();

      // Verify hasWon = false
      const hasWon = await equle.hasPlayerWon(gameId, bob.address);
      expect(hasWon).to.equal(false);

      // Verify balanceOf = 0 (no NFT minted)
      expect(await nft.balanceOf(bob.address)).to.equal(0);

      // Verify hasNFT returns false
      expect(await nft.hasNFT(bob.address)).to.equal(false);
    });

    it("Should correctly return player stats via getPlayerStats", async function () {
      const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

      // Initialize CoFHE for the player (bob)
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );

      // Get NFT contract instance
      const nftAddress = await equle.equleNFT();
      const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
      const nft = EquleNFT.attach(nftAddress);

      // Player wins
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
      await equle.connect(bob).ClaimVictory();

      // Test getPlayerStats returns correct stats
      const stats = await nft.getPlayerStats(bob.address);
      expect(stats.totalWins).to.equal(1);
      expect(stats.currentStreak).to.equal(1);
      expect(stats.maxStreak).to.equal(1);
      expect(stats.lastGamePlayed).to.equal(gameId);
    });

    it("Should return correct hasNFT status", async function () {
      const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

      // Get NFT contract instance
      const nftAddress = await equle.equleNFT();
      const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
      const nft = EquleNFT.attach(nftAddress);

      // Both should not have NFT initially
      expect(await nft.hasNFT(bob.address)).to.equal(false);
      expect(await nft.hasNFT(alice.address)).to.equal(false);

      // Bob wins and gets NFT
      await hre.cofhe.expectResultSuccess(
        hre.cofhe.initializeWithHardhatSigner(bob)
      );
      const bobGuess = "1+2*3";
      const bobResult = 9;
      const bobEquationBits = equationToAllRotations(bobGuess);
      const [bobEncryptedGuess] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint128(bobEquationBits)] as const)
      );
      const [bobEncryptedResult] = await hre.cofhe.expectResultSuccess(
        cofhejs.encrypt([Encryptable.uint16(BigInt(bobResult))] as const)
      );
      await equle.connect(bob).guess(bobEncryptedGuess, bobEncryptedResult);
      await equle.connect(bob).finalizeGame();
      await time.increase(100);
      await equle.connect(bob).ClaimVictory();

      // Bob should have NFT, Alice should not
      expect(await nft.hasNFT(bob.address)).to.equal(true);
      expect(await nft.hasNFT(alice.address)).to.equal(false);
    });

    it("Should revert tokenId call for player without NFT", async function () {
      const { equle, bob } = await loadFixture(deployWithGameSetup);

      // Get NFT contract instance
      const nftAddress = await equle.equleNFT();
      const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
      const nft = EquleNFT.attach(nftAddress);

      // Should revert when player has no NFT
      await expect(nft.tokenId(bob.address)).to.be.revertedWith(
        "Player has no NFT"
      );
    });

    describe("Guess Distribution Tracking", function () {
      it("Should correctly track single win in guess distribution", async function () {
        const { equle, bob, gameId } = await loadFixture(deployWithGameSetup);

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
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        const stats = await nft.getPlayerStats(bob.address);

        // Player won on first attempt (index 0, but passed as 0 which should be rejected)
        // Note: There's a bug in Equle.sol line 273 - it passes lastAttempt (0-5) instead of lastAttempt+1 (1-6)
        // For now, testing the current behavior where attempt 0 is passed
        // This will show [1, 0, 0, 0, 0, 0] once the bug is fixed
        expect(stats.guessDistribution[0]).to.equal(1);
        expect(stats.guessDistribution[1]).to.equal(0);
        expect(stats.guessDistribution[2]).to.equal(0);
        expect(stats.guessDistribution[3]).to.equal(0);
        expect(stats.guessDistribution[4]).to.equal(0);
        expect(stats.guessDistribution[5]).to.equal(0);
      });

      it("Should correctly accumulate multiple wins at different attempts", async function () {
        const { equle, bob, owner } = await loadFixture(deployWithGameSetup);

        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Win 1: First attempt (day 1)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        let playerGuess = "1+2*3";
        let playerResult = 9;
        let playerEquationBits = equationToAllRotations(playerGuess);
        let [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        let [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );

        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        let stats = await nft.getPlayerStats(bob.address);
        expect(stats.guessDistribution[0]).to.equal(1);

        // Setup day 2 game
        await time.increase(86400);
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(owner)
        );

        const gameId2 = await equle.getCurrentGameId();
        const equation2 = "2+3*4";
        const result2 = 14;

        const equationSame100Bits2 = equationToAllSame(equation2);
        const [encryptedEquation2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(equationSame100Bits2)] as const)
        );
        const [encryptedResult2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(result2))] as const)
        );
        await equle
          .connect(owner)
          .setGame(gameId2, encryptedEquation2, encryptedResult2);

        // Win 2: Third attempt (day 2) - make 2 wrong guesses first
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Wrong guess 1
        playerGuess = "1+1*1";
        playerResult = 3;
        playerEquationBits = equationToAllRotations(playerGuess);
        [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );
        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

        // Wrong guess 2
        playerGuess = "2+2*2";
        playerResult = 6;
        playerEquationBits = equationToAllRotations(playerGuess);
        [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );
        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

        // Correct guess (3rd attempt)
        playerGuess = "2+3*4";
        playerResult = 14;
        playerEquationBits = equationToAllRotations(playerGuess);
        [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );
        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        stats = await nft.getPlayerStats(bob.address);
        expect(stats.totalWins).to.equal(2);
        expect(stats.guessDistribution[0]).to.equal(1); // 1 win on attempt 1
        expect(stats.guessDistribution[1]).to.equal(0); // 0 wins on attempt 2
        expect(stats.guessDistribution[2]).to.equal(1); // 1 win on attempt 3
        expect(stats.guessDistribution[3]).to.equal(0);
        expect(stats.guessDistribution[4]).to.equal(0);
        expect(stats.guessDistribution[5]).to.equal(0);
      });

      it("Should correctly accumulate multiple wins at the same attempt", async function () {
        const { equle, bob, owner } = await loadFixture(deployWithGameSetup);

        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Win 1: First attempt (day 1)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        let playerGuess = "1+2*3";
        let playerResult = 9;
        let playerEquationBits = equationToAllRotations(playerGuess);
        let [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        let [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );

        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        let stats = await nft.getPlayerStats(bob.address);
        expect(stats.guessDistribution[0]).to.equal(1);

        // Setup day 2 game
        await time.increase(86400);
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(owner)
        );

        const gameId2 = await equle.getCurrentGameId();
        const equation2 = "2+3*4";
        const result2 = 14;

        const equationSame100Bits2 = equationToAllSame(equation2);
        const [encryptedEquation2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(equationSame100Bits2)] as const)
        );
        const [encryptedResult2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(result2))] as const)
        );
        await equle
          .connect(owner)
          .setGame(gameId2, encryptedEquation2, encryptedResult2);

        // Win 2: Also first attempt (day 2)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        playerGuess = "2+3*4";
        playerResult = 14;
        playerEquationBits = equationToAllRotations(playerGuess);
        [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );

        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        stats = await nft.getPlayerStats(bob.address);
        expect(stats.totalWins).to.equal(2);
        expect(stats.guessDistribution[0]).to.equal(2); // 2 wins on attempt 1
        expect(stats.guessDistribution[1]).to.equal(0);
        expect(stats.guessDistribution[2]).to.equal(0);
        expect(stats.guessDistribution[3]).to.equal(0);
        expect(stats.guessDistribution[4]).to.equal(0);
        expect(stats.guessDistribution[5]).to.equal(0);
      });

      it("Should format guess distribution as percentages correctly", async function () {
        const { equle, bob, owner } = await loadFixture(deployWithGameSetup);

        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Create wins with a known distribution
        // Win on attempt 1
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        let playerGuess = "1+2*3";
        let playerResult = 9;
        let playerEquationBits = equationToAllRotations(playerGuess);
        let [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        let [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );

        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Get metadata and verify distribution format
        const tokenId = await nft.tokenId(bob.address);
        const tokenURI = await nft.tokenURI(tokenId);

        // Decode base64 metadata
        const base64Data = tokenURI.replace(
          "data:application/json;base64,",
          ""
        );
        const jsonString = Buffer.from(base64Data, "base64").toString("utf-8");
        const metadata = JSON.parse(jsonString);

        // Find the Guess Distribution attribute
        const guessDistAttr = metadata.attributes.find(
          (attr: any) => attr.trait_type === "Guess Distribution"
        );

        expect(guessDistAttr).to.not.be.undefined;
        // With 1 win on attempt 1: should be "100,0,0,0,0,0"
        expect(guessDistAttr.value).to.equal("100,0,0,0,0,0");

        // Setup day 2 and win on attempt 1 again
        await time.increase(86400);
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(owner)
        );

        const gameId2 = await equle.getCurrentGameId();
        const equation2 = "2+3*4";
        const result2 = 14;

        const equationSame100Bits2 = equationToAllSame(equation2);
        const [encryptedEquation2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(equationSame100Bits2)] as const)
        );
        const [encryptedResult2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(result2))] as const)
        );
        await equle
          .connect(owner)
          .setGame(gameId2, encryptedEquation2, encryptedResult2);

        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        playerGuess = "2+3*4";
        playerResult = 14;
        playerEquationBits = equationToAllRotations(playerGuess);
        [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );

        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Check updated metadata
        const tokenURI2 = await nft.tokenURI(tokenId);
        const base64Data2 = tokenURI2.replace(
          "data:application/json;base64,",
          ""
        );
        const jsonString2 = Buffer.from(base64Data2, "base64").toString(
          "utf-8"
        );
        const metadata2 = JSON.parse(jsonString2);

        const guessDistAttr2 = metadata2.attributes.find(
          (attr: any) => attr.trait_type === "Guess Distribution"
        );

        // With 2 wins on attempt 1: should still be "100,0,0,0,0,0"
        expect(guessDistAttr2.value).to.equal("100,0,0,0,0,0");
      });

      it("Should format guess distribution with multiple different attempts correctly", async function () {
        const { equle, bob, owner } = await loadFixture(deployWithGameSetup);

        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Win 1: First attempt
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        let playerGuess = "1+2*3";
        let playerResult = 9;
        let playerEquationBits = equationToAllRotations(playerGuess);
        let [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        let [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );

        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Setup day 2, win on 2nd attempt
        await time.increase(86400);
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(owner)
        );

        const gameId2 = await equle.getCurrentGameId();
        const equation2 = "2+3*4";
        const result2 = 14;

        const equationSame100Bits2 = equationToAllSame(equation2);
        const [encryptedEquation2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(equationSame100Bits2)] as const)
        );
        const [encryptedResult2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(result2))] as const)
        );
        await equle
          .connect(owner)
          .setGame(gameId2, encryptedEquation2, encryptedResult2);

        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Wrong guess
        playerGuess = "1+1*1";
        playerResult = 3;
        playerEquationBits = equationToAllRotations(playerGuess);
        [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );
        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

        // Correct guess (2nd attempt)
        playerGuess = "2+3*4";
        playerResult = 14;
        playerEquationBits = equationToAllRotations(playerGuess);
        [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );
        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Check metadata: 1 win on attempt 1, 1 win on attempt 2 = 50% each
        const tokenId = await nft.tokenId(bob.address);
        const tokenURI = await nft.tokenURI(tokenId);
        const base64Data = tokenURI.replace(
          "data:application/json;base64,",
          ""
        );
        const jsonString = Buffer.from(base64Data, "base64").toString("utf-8");
        const metadata = JSON.parse(jsonString);

        const guessDistAttr = metadata.attributes.find(
          (attr: any) => attr.trait_type === "Guess Distribution"
        );

        // With 1 win each on attempts 1 and 2: should be "50,50,0,0,0,0"
        expect(guessDistAttr.value).to.equal("50,50,0,0,0,0");
      });

      it("Should return '0,0,0,0,0,0' for zero wins (edge case)", async function () {
        const { equle, bob } = await loadFixture(deployEquleFixture);

        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Check player with no NFT (should revert)
        await expect(nft.getPlayerStats(bob.address)).to.not.be.reverted;

        const stats = await nft.getPlayerStats(bob.address);
        expect(stats.totalWins).to.equal(0);
        expect(stats.guessDistribution[0]).to.equal(0);
        expect(stats.guessDistribution[1]).to.equal(0);
        expect(stats.guessDistribution[2]).to.equal(0);
        expect(stats.guessDistribution[3]).to.equal(0);
        expect(stats.guessDistribution[4]).to.equal(0);
        expect(stats.guessDistribution[5]).to.equal(0);
      });

      it("Should include Guess Distribution in NFT metadata", async function () {
        const { equle, bob } = await loadFixture(deployWithGameSetup);

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
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        const tokenId = await nft.tokenId(bob.address);
        const tokenURI = await nft.tokenURI(tokenId);

        // Decode base64 metadata
        const base64Data = tokenURI.replace(
          "data:application/json;base64,",
          ""
        );
        const jsonString = Buffer.from(base64Data, "base64").toString("utf-8");
        const metadata = JSON.parse(jsonString);

        // Verify metadata structure
        expect(metadata).to.have.property("name");
        expect(metadata).to.have.property("description");
        expect(metadata).to.have.property("image");
        expect(metadata).to.have.property("attributes");

        // Verify attributes array contains Guess Distribution
        const attributes = metadata.attributes;
        expect(attributes).to.be.an("array");

        const attributeTypes = attributes.map((attr: any) => attr.trait_type);
        expect(attributeTypes).to.include("Total Wins");
        expect(attributeTypes).to.include("Current Streak");
        expect(attributeTypes).to.include("Max Streak");
        expect(attributeTypes).to.include("Guess Distribution");

        // Verify Guess Distribution attribute has correct format
        const guessDistAttr = attributes.find(
          (attr: any) => attr.trait_type === "Guess Distribution"
        );
        expect(guessDistAttr).to.not.be.undefined;
        expect(guessDistAttr.value).to.be.a("string");
        expect(guessDistAttr.value).to.match(/^\d+,\d+,\d+,\d+,\d+,\d+$/);
      });

      it("Should handle percentage calculation with integer division correctly", async function () {
        const { equle, bob, owner } = await loadFixture(deployWithGameSetup);

        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Create 3 wins: 2 on attempt 1, 1 on attempt 2
        // This should give us 66% and 33% (with integer division)

        // Win 1
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        let playerGuess = "1+2*3";
        let playerResult = 9;
        let playerEquationBits = equationToAllRotations(playerGuess);
        let [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        let [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );

        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Win 2
        await time.increase(86400);
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(owner)
        );

        const gameId2 = await equle.getCurrentGameId();
        const equation2 = "2+3*4";
        const result2 = 14;

        const equationSame100Bits2 = equationToAllSame(equation2);
        const [encryptedEquation2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(equationSame100Bits2)] as const)
        );
        const [encryptedResult2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(result2))] as const)
        );
        await equle
          .connect(owner)
          .setGame(gameId2, encryptedEquation2, encryptedResult2);

        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        playerGuess = "2+3*4";
        playerResult = 14;
        playerEquationBits = equationToAllRotations(playerGuess);
        [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );

        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Win 3 - on attempt 2
        await time.increase(86400);
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(owner)
        );

        const gameId3 = await equle.getCurrentGameId();
        const equation3 = "3+4*5";
        const result3 = 23;

        const equationSame100Bits3 = equationToAllSame(equation3);
        const [encryptedEquation3] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(equationSame100Bits3)] as const)
        );
        const [encryptedResult3] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(result3))] as const)
        );
        await equle
          .connect(owner)
          .setGame(gameId3, encryptedEquation3, encryptedResult3);

        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Wrong guess
        playerGuess = "1+1*1";
        playerResult = 3;
        playerEquationBits = equationToAllRotations(playerGuess);
        [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );
        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

        // Correct guess
        playerGuess = "3+4*5";
        playerResult = 23;
        playerEquationBits = equationToAllRotations(playerGuess);
        [encryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(playerEquationBits)] as const)
        );
        [encryptedPlayerResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(playerResult))] as const)
        );
        await equle.connect(bob).guess(encryptedGuess, encryptedPlayerResult);

        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Check metadata: 2 wins on attempt 1 (66%), 1 win on attempt 2 (33%)
        const tokenId = await nft.tokenId(bob.address);
        const tokenURI = await nft.tokenURI(tokenId);
        const base64Data = tokenURI.replace(
          "data:application/json;base64,",
          ""
        );
        const jsonString = Buffer.from(base64Data, "base64").toString("utf-8");
        const metadata = JSON.parse(jsonString);

        const guessDistAttr = metadata.attributes.find(
          (attr: any) => attr.trait_type === "Guess Distribution"
        );

        // 2/3 = 66%, 1/3 = 33% (integer division)
        expect(guessDistAttr.value).to.equal("66,33,0,0,0,0");
      });
    });
  });

  describe("Soulbound NFT Features (ERC-5192)", function () {
    describe("ERC-5192 Interface Support", function () {
      it("Should support ERC-5192 interface", async function () {
        const { equle } = await loadFixture(deployEquleFixture);

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // ERC-5192 interface ID is 0xb45a3c0e
        const ERC5192_INTERFACE_ID = "0xb45a3c0e";
        expect(await nft.supportsInterface(ERC5192_INTERFACE_ID)).to.equal(
          true
        );
      });

      it("Should support ERC721 interface", async function () {
        const { equle } = await loadFixture(deployEquleFixture);

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // ERC721 interface ID is 0x80ac58cd
        const ERC721_INTERFACE_ID = "0x80ac58cd";
        expect(await nft.supportsInterface(ERC721_INTERFACE_ID)).to.equal(true);
      });

      it("Should return true for locked() on existing token", async function () {
        const { equle, bob } = await loadFixture(deployWithGameSetup);

        // Initialize CoFHE for the player (bob)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Player wins and gets NFT
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
        await equle.connect(bob).ClaimVictory();

        // Get token ID
        const tokenId = await nft.tokenId(bob.address);

        // Verify locked() returns true for existing token
        expect(await nft.locked(tokenId)).to.equal(true);
      });

      it("Should return true for locked() on multiple tokens", async function () {
        const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Bob wins
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );
        const bobGuess = "1+2*3";
        const bobResult = 9;
        const bobEquationBits = equationToAllRotations(bobGuess);
        const [bobEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(bobEquationBits)] as const)
        );
        const [bobEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(bobResult))] as const)
        );
        await equle.connect(bob).guess(bobEncryptedGuess, bobEncryptedResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Alice wins
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(alice)
        );
        const aliceGuess = "1+2*3";
        const aliceResult = 9;
        const aliceEquationBits = equationToAllRotations(aliceGuess);
        const [aliceEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(aliceEquationBits)] as const)
        );
        const [aliceEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(aliceResult))] as const)
        );
        await equle
          .connect(alice)
          .guess(aliceEncryptedGuess, aliceEncryptedResult);
        await equle.connect(alice).finalizeGame();
        await time.increase(100);
        await equle.connect(alice).ClaimVictory();

        // Get token IDs
        const bobTokenId = await nft.tokenId(bob.address);
        const aliceTokenId = await nft.tokenId(alice.address);

        // Verify both tokens are locked
        expect(await nft.locked(bobTokenId)).to.equal(true);
        expect(await nft.locked(aliceTokenId)).to.equal(true);
      });

      it("Should revert locked() for non-existent token", async function () {
        const { equle } = await loadFixture(deployEquleFixture);

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Try to check locked status of non-existent token
        const nonExistentTokenId = 9999;
        await expect(nft.locked(nonExistentTokenId)).to.be.revertedWith(
          "Token does not exist"
        );
      });
    });

    describe("Transfer Prevention", function () {
      it("Should revert transferFrom with TokenIsSoulbound error", async function () {
        const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

        // Initialize CoFHE for the player (bob)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Player wins and gets NFT
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
        await equle.connect(bob).ClaimVictory();

        // Get token ID
        const tokenId = await nft.tokenId(bob.address);

        // Attempt to transfer from bob to alice should revert
        await expect(
          nft.connect(bob).transferFrom(bob.address, alice.address, tokenId)
        ).to.be.revertedWithCustomError(nft, "TokenIsSoulbound");
      });

      it("Should revert safeTransferFrom with TokenIsSoulbound error", async function () {
        const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

        // Initialize CoFHE for the player (bob)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Player wins and gets NFT
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
        await equle.connect(bob).ClaimVictory();

        // Get token ID
        const tokenId = await nft.tokenId(bob.address);

        // Attempt to safeTransferFrom bob to alice should revert
        await expect(
          nft
            .connect(bob)
            ["safeTransferFrom(address,address,uint256)"](
              bob.address,
              alice.address,
              tokenId
            )
        ).to.be.revertedWithCustomError(nft, "TokenIsSoulbound");
      });

      it("Should revert safeTransferFrom with data parameter with TokenIsSoulbound error", async function () {
        const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

        // Initialize CoFHE for the player (bob)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Player wins and gets NFT
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
        await equle.connect(bob).ClaimVictory();

        // Get token ID
        const tokenId = await nft.tokenId(bob.address);

        // Attempt to safeTransferFrom with data parameter should revert
        await expect(
          nft
            .connect(bob)
            ["safeTransferFrom(address,address,uint256,bytes)"](
              bob.address,
              alice.address,
              tokenId,
              "0x"
            )
        ).to.be.revertedWithCustomError(nft, "TokenIsSoulbound");
      });

      it("Should revert transfer even with approval", async function () {
        const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

        // Initialize CoFHE for the player (bob)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Player wins and gets NFT
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
        await equle.connect(bob).ClaimVictory();

        // Get token ID
        const tokenId = await nft.tokenId(bob.address);

        // Approve alice to transfer the token
        await nft.connect(bob).approve(alice.address, tokenId);

        // Verify approval was set
        expect(await nft.getApproved(tokenId)).to.equal(alice.address);

        // Even with approval, alice should not be able to transfer
        await expect(
          nft.connect(alice).transferFrom(bob.address, alice.address, tokenId)
        ).to.be.revertedWithCustomError(nft, "TokenIsSoulbound");
      });

      it("Should revert transfer even with setApprovalForAll", async function () {
        const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

        // Initialize CoFHE for the player (bob)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Player wins and gets NFT
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
        await equle.connect(bob).ClaimVictory();

        // Get token ID
        const tokenId = await nft.tokenId(bob.address);

        // Set alice as approved operator for all of bob's tokens
        await nft.connect(bob).setApprovalForAll(alice.address, true);

        // Verify operator approval was set
        expect(await nft.isApprovedForAll(bob.address, alice.address)).to.equal(
          true
        );

        // Even as an approved operator, alice should not be able to transfer
        await expect(
          nft.connect(alice).transferFrom(bob.address, alice.address, tokenId)
        ).to.be.revertedWithCustomError(nft, "TokenIsSoulbound");
      });

      it("Should revert transfer by token owner", async function () {
        const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

        // Initialize CoFHE for the player (bob)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Player wins and gets NFT
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
        await equle.connect(bob).ClaimVictory();

        // Get token ID
        const tokenId = await nft.tokenId(bob.address);

        // Even the owner should not be able to transfer their own token
        await expect(
          nft.connect(bob).transferFrom(bob.address, alice.address, tokenId)
        ).to.be.revertedWithCustomError(nft, "TokenIsSoulbound");
      });

      it("Should revert transfer by NFT contract owner", async function () {
        const { equle, bob, alice, owner } = await loadFixture(
          deployWithGameSetup
        );

        // Initialize CoFHE for the player (bob)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Player wins and gets NFT
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
        await equle.connect(bob).ClaimVictory();

        // Get token ID
        const tokenId = await nft.tokenId(bob.address);

        // Verify equle contract (which owns the NFT contract) is the owner
        const nftOwner = await nft.owner();
        expect(nftOwner).to.equal(await equle.getAddress());

        // The NFT contract owner cannot transfer the token either
        // Note: We need to use the equle contract address, not the owner signer
        // This test verifies that even privileged accounts cannot override soulbound
        await expect(
          nft.connect(bob).transferFrom(bob.address, alice.address, tokenId)
        ).to.be.revertedWithCustomError(nft, "TokenIsSoulbound");
      });

      it("Should allow multiple players to have non-transferable NFTs", async function () {
        const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Bob wins
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );
        const bobGuess = "1+2*3";
        const bobResult = 9;
        const bobEquationBits = equationToAllRotations(bobGuess);
        const [bobEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(bobEquationBits)] as const)
        );
        const [bobEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(bobResult))] as const)
        );
        await equle.connect(bob).guess(bobEncryptedGuess, bobEncryptedResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Alice wins
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(alice)
        );
        const aliceGuess = "1+2*3";
        const aliceResult = 9;
        const aliceEquationBits = equationToAllRotations(aliceGuess);
        const [aliceEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(aliceEquationBits)] as const)
        );
        const [aliceEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(aliceResult))] as const)
        );
        await equle
          .connect(alice)
          .guess(aliceEncryptedGuess, aliceEncryptedResult);
        await equle.connect(alice).finalizeGame();
        await time.increase(100);
        await equle.connect(alice).ClaimVictory();

        // Get token IDs
        const bobTokenId = await nft.tokenId(bob.address);
        const aliceTokenId = await nft.tokenId(alice.address);

        // Verify both NFTs are non-transferable
        await expect(
          nft.connect(bob).transferFrom(bob.address, alice.address, bobTokenId)
        ).to.be.revertedWithCustomError(nft, "TokenIsSoulbound");

        await expect(
          nft
            .connect(alice)
            .transferFrom(alice.address, bob.address, aliceTokenId)
        ).to.be.revertedWithCustomError(nft, "TokenIsSoulbound");
      });
    });

    describe("Locked Event Emission", function () {
      it("Should emit Locked event on NFT mint", async function () {
        const { equle, bob } = await loadFixture(deployWithGameSetup);

        // Initialize CoFHE for the player (bob)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Player wins and gets NFT
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

        // Claim victory should emit Locked event
        await expect(equle.connect(bob).ClaimVictory())
          .to.emit(nft, "Locked")
          .withArgs(1);
      });

      it("Should emit Locked event with correct tokenId for multiple mints", async function () {
        const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Bob wins
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );
        const bobGuess = "1+2*3";
        const bobResult = 9;
        const bobEquationBits = equationToAllRotations(bobGuess);
        const [bobEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(bobEquationBits)] as const)
        );
        const [bobEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(bobResult))] as const)
        );
        await equle.connect(bob).guess(bobEncryptedGuess, bobEncryptedResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);

        // Should emit Locked with tokenId 1
        await expect(equle.connect(bob).ClaimVictory())
          .to.emit(nft, "Locked")
          .withArgs(1);

        // Alice wins
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(alice)
        );
        const aliceGuess = "1+2*3";
        const aliceResult = 9;
        const aliceEquationBits = equationToAllRotations(aliceGuess);
        const [aliceEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(aliceEquationBits)] as const)
        );
        const [aliceEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(aliceResult))] as const)
        );
        await equle
          .connect(alice)
          .guess(aliceEncryptedGuess, aliceEncryptedResult);
        await equle.connect(alice).finalizeGame();
        await time.increase(100);

        // Should emit Locked with tokenId 2
        await expect(equle.connect(alice).ClaimVictory())
          .to.emit(nft, "Locked")
          .withArgs(2);
      });

      it("Should not emit Locked event on NFT update", async function () {
        const { equle, bob, owner } = await loadFixture(deployWithGameSetup);

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Bob wins day 1
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );
        const bobGuess = "1+2*3";
        const bobResult = 9;
        const bobEquationBits = equationToAllRotations(bobGuess);
        const [bobEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(bobEquationBits)] as const)
        );
        const [bobEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(bobResult))] as const)
        );
        await equle.connect(bob).guess(bobEncryptedGuess, bobEncryptedResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Advance to day 2
        await time.increase(86400);
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(owner)
        );
        const gameId2 = await equle.getCurrentGameId();
        const equation2 = "2+3*4";
        const result2 = 14;
        const equationSame100Bits2 = equationToAllSame(equation2);
        const [encryptedEquation2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(equationSame100Bits2)] as const)
        );
        const [encryptedResult2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(result2))] as const)
        );
        await equle
          .connect(owner)
          .setGame(gameId2, encryptedEquation2, encryptedResult2);

        // Bob wins day 2
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );
        const bob2ndGuess = "2+3*4";
        const bob2ndResult = 14;
        const bob2ndEquationBits = equationToAllRotations(bob2ndGuess);
        const [bob2ndEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(bob2ndEquationBits)] as const)
        );
        const [bob2ndEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(bob2ndResult))] as const)
        );
        await equle
          .connect(bob)
          .guess(bob2ndEncryptedGuess, bob2ndEncryptedResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);

        // Should NOT emit Locked event on update (only on initial mint)
        await expect(equle.connect(bob).ClaimVictory()).to.not.emit(
          nft,
          "Locked"
        );
      });
    });

    describe("Minting Still Works", function () {
      it("Should allow minting from address(0) to player", async function () {
        const { equle, bob } = await loadFixture(deployWithGameSetup);

        // Initialize CoFHE for the player (bob)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Player wins and gets NFT
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

        // Verify no NFT before minting
        expect(await nft.balanceOf(bob.address)).to.equal(0);

        // Claim victory should successfully mint NFT
        await equle.connect(bob).ClaimVictory();

        // Verify NFT was minted
        expect(await nft.balanceOf(bob.address)).to.equal(1);
        const tokenId = await nft.tokenId(bob.address);
        expect(tokenId).to.equal(1);
      });

      it("Should successfully mint NFTs to multiple players", async function () {
        const { equle, bob, alice } = await loadFixture(deployWithGameSetup);

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Bob wins
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );
        const bobGuess = "1+2*3";
        const bobResult = 9;
        const bobEquationBits = equationToAllRotations(bobGuess);
        const [bobEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(bobEquationBits)] as const)
        );
        const [bobEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(bobResult))] as const)
        );
        await equle.connect(bob).guess(bobEncryptedGuess, bobEncryptedResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Alice wins
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(alice)
        );
        const aliceGuess = "1+2*3";
        const aliceResult = 9;
        const aliceEquationBits = equationToAllRotations(aliceGuess);
        const [aliceEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(aliceEquationBits)] as const)
        );
        const [aliceEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(aliceResult))] as const)
        );
        await equle
          .connect(alice)
          .guess(aliceEncryptedGuess, aliceEncryptedResult);
        await equle.connect(alice).finalizeGame();
        await time.increase(100);
        await equle.connect(alice).ClaimVictory();

        // Verify both players have NFTs
        expect(await nft.balanceOf(bob.address)).to.equal(1);
        expect(await nft.balanceOf(alice.address)).to.equal(1);

        const bobTokenId = await nft.tokenId(bob.address);
        const aliceTokenId = await nft.tokenId(alice.address);

        expect(bobTokenId).to.equal(1);
        expect(aliceTokenId).to.equal(2);
        expect(bobTokenId).to.not.equal(aliceTokenId);
      });

      it("Should allow minting after NFT update", async function () {
        const { equle, bob, owner } = await loadFixture(deployWithGameSetup);

        // Get NFT contract instance
        const nftAddress = await equle.equleNFT();
        const EquleNFT = await hre.ethers.getContractFactory("EquleNFT");
        const nft = EquleNFT.attach(nftAddress);

        // Bob wins day 1 (mint)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );
        const bobGuess = "1+2*3";
        const bobResult = 9;
        const bobEquationBits = equationToAllRotations(bobGuess);
        const [bobEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(bobEquationBits)] as const)
        );
        const [bobEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(bobResult))] as const)
        );
        await equle.connect(bob).guess(bobEncryptedGuess, bobEncryptedResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        expect(await nft.balanceOf(bob.address)).to.equal(1);

        // Advance to day 2
        await time.increase(86400);
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(owner)
        );
        const gameId2 = await equle.getCurrentGameId();
        const equation2 = "2+3*4";
        const result2 = 14;
        const equationSame100Bits2 = equationToAllSame(equation2);
        const [encryptedEquation2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(equationSame100Bits2)] as const)
        );
        const [encryptedResult2] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(result2))] as const)
        );
        await equle
          .connect(owner)
          .setGame(gameId2, encryptedEquation2, encryptedResult2);

        // Bob wins day 2 (update, not mint)
        await hre.cofhe.expectResultSuccess(
          hre.cofhe.initializeWithHardhatSigner(bob)
        );
        const bob2ndGuess = "2+3*4";
        const bob2ndResult = 14;
        const bob2ndEquationBits = equationToAllRotations(bob2ndGuess);
        const [bob2ndEncryptedGuess] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint128(bob2ndEquationBits)] as const)
        );
        const [bob2ndEncryptedResult] = await hre.cofhe.expectResultSuccess(
          cofhejs.encrypt([Encryptable.uint16(BigInt(bob2ndResult))] as const)
        );
        await equle
          .connect(bob)
          .guess(bob2ndEncryptedGuess, bob2ndEncryptedResult);
        await equle.connect(bob).finalizeGame();
        await time.increase(100);
        await equle.connect(bob).ClaimVictory();

        // Still only 1 NFT (update, not new mint)
        expect(await nft.balanceOf(bob.address)).to.equal(1);

        // Verify stats were updated
        const stats = await nft.getPlayerStats(bob.address);
        expect(stats.totalWins).to.equal(2);
        expect(stats.currentStreak).to.equal(2);
      });
    });
  });
});
