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
