import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Equle } from "../typechain-types";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";
import { cofhejs_initializeWithHardhatSigner } from "cofhe-hardhat-plugin";
import { getDeployment } from "./utils";
import { equationToAllSame } from "../utils";

// Task to set game on the deployed contract
task("setgame-equle", "Set game on the deployed contract").setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;

    // Get the Equle contract address
    const equleAddress = getDeployment(network.name, "Equle");
    if (!equleAddress) {
      console.error(`No Equle deployment found for network ${network.name}`);
      console.error(
        `Please deploy first using: npx hardhat deploy-equle --network ${network.name}`
      );
      return;
    }

    console.log(`Using Equle at ${equleAddress} on ${network.name}`);

    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    await cofhejs.initializeWithEthers({
      ethersProvider: ethers.provider,
      ethersSigner: signer,
      environment: "TESTNET",
    });
    console.log("Cofhe initialized");

    const Equle = await ethers.getContractFactory("Equle");
    const equle = Equle.attach(equleAddress) as unknown as Equle;

    const gameId = await equle.getCurrentGameId();
    const gameState = await equle.getPlayerAttempt(gameId, signer.address, 0);
    console.log("Game state:", gameState);
    const equation = "1+2*3";
    const result = 9; //

    const equationSame100Bits = equationToAllSame(equation);

    // Get new count
    const encryptedEquation = await cofhejs.encrypt([
      Encryptable.uint128(equationSame100Bits),
    ] as const);

    const encryptedResult = await cofhejs.encrypt([
      Encryptable.uint16(BigInt(result)),
    ] as const);

    if (
      encryptedEquation &&
      encryptedResult &&
      encryptedEquation.data &&
      encryptedResult.data
    ) {
      console.log("Setting game...");
      const tx = await equle.setGame(
        gameId,
        encryptedEquation.data[0],
        encryptedResult.data[0]
      );
      await tx.wait();
      console.log(`Transaction hash: ${tx.hash}`);
    }
  }
);
