const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying HealthInsurance contract...\n");

  // Get the deployer account (account[0] from Hardhat)
  const [deployer, officer] = await ethers.getSigners();

  console.log("Deployer address :", deployer.address);
  console.log("Officer address  :", officer.address);
  console.log(
    "Deployer balance :",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Deploy the contract — pass the officer's address to the constructor
  const Factory = await ethers.getContractFactory("HealthInsurance");
  const contract = await Factory.deploy(officer.address);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("HealthInsurance deployed to:", contractAddress);

  // ── Optional: Fund the contract with 2 ETH from officer ──────────────────
  console.log("\nFunding contract with 2 ETH from officer...");
  const fundTx = await contract
    .connect(officer)
    .depositFunds({ value: ethers.parseEther("2.0") });
  await fundTx.wait();
  console.log(
    "Contract balance:",
    ethers.formatEther(await contract.getContractBalance()),
    "ETH"
  );

  // ── Save the contract address for the frontend ────────────────────────────
  const fs = await import("fs");
  const config = {
    contractAddress: contractAddress,
    network: "localhost",
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "../frontend/src/contractConfig.json",
    JSON.stringify(config, null, 2)
  );
  console.log("\nContract address saved to frontend/src/contractConfig.json");
  console.log("\nDeployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
