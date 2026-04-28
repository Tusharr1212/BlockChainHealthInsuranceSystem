// Run this script from the blockchain/ folder after compiling:
// node scripts/copyABI.js

const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/HealthInsurance.sol/HealthInsurance.json"
);

const outputPath = path.join(
  __dirname,
  "../../frontend/src/HealthInsuranceABI.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

fs.writeFileSync(outputPath, JSON.stringify(artifact.abi, null, 2));

console.log("ABI copied to frontend/src/HealthInsuranceABI.json");