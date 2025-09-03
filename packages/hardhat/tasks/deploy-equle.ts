import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { saveDeployment } from "./utils";

// Task to deploy the Equle contract
task(
  "deploy-equle",
  "Deploy the Equle contract to the selected network"
).setAction(async (_, hre: HardhatRuntimeEnvironment) => {
  const { ethers, network } = hre;

  console.log(`Deploying Equle to ${network.name}...`);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // Deploy the contract
  const Equle = await ethers.getContractFactory("Equle");
  const equle = await Equle.deploy();
  await equle.waitForDeployment();

  const equleAddress = await equle.getAddress();
  console.log(`Equle deployed to: ${equleAddress}`);

  // Save the deployment
  saveDeployment(network.name, "Equle", equleAddress);

  return equleAddress;
});
