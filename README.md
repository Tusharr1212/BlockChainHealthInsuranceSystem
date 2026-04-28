**HealthChain — Blockchain Health Insurance System**

A decentralised health insurance platform built on Ethereum. Patients submit claims, doctors certify them, and insurance officers disburse ETH payouts — all transparently recorded on-chain via smart contracts.


**Overview**

HealthChain solves a core problem in traditional health insurance: lack of transparency and trust. Every action — claim submission, doctor signature, officer approval, and ETH payout — is recorded immutably on the Ethereum blockchain.

**Key benefits:**

No central authority can alter or delete a claim record

Payouts are automatic via smart contract — no manual bank transfers

Every participant's action is cryptographically signed and traceable

Fraud is deterred because all records are public and permanent


**Tech Stack:**

Blockchain->Ethereum (local via Hardhat, testnet via Sepolia)

Smart Contract->Solidity ^0.8.19

Frontend->React (Create React App)

Blockchain ↔ Frontend->ethers.js v6

Wallet->MetaMask


**How It Works**

The claim lifecycle follows a strict 3-step on-chain flow:

Patient submits claim

↓

Doctor signs & certifies claim

↓

Officer verifies & approves

↓

Smart contract auto-sends ETH to patient wallet



**Roles:**

-Owner->Account #0 (deployer)->Registers doctors and patients

-Insurance Officer->Set at deploy timeDeposits funds->approves/rejects signed claims

-Doctor->Registered by owner->Signs submitted claims to certify legitimacy

-Patient->Registered by owner->Submits claims, receives ETH payouts


**UI for each role:**
Owner side:
<img width="1457" height="865" alt="image" src="https://github.com/user-attachments/assets/63d8b441-7035-41dc-bc69-6fc906728210" />
Patient side:
<img width="1445" height="780" alt="image" src="https://github.com/user-attachments/assets/b0b45093-c38a-4e9b-8837-3eb3e2259d23" />
Officer side:
<img width="1463" height="789" alt="image" src="https://github.com/user-attachments/assets/6855936f-4184-4607-8e62-66cb52e5be85" />
After Doctor approval:
<img width="1440" height="866" alt="image" src="https://github.com/user-attachments/assets/4812bc5a-afa0-4ea8-b98e-d6968ad04d7b" />

Doctor side:
<img width="1456" height="780" alt="image" src="https://github.com/user-attachments/assets/fbe64e31-5dac-457e-904d-dab107889e61" />



**Getting Started
**

**Prerequisites
**

-Node.js v20 or higher

-0MetaMask browser extension

-VS Code (recommended)

**Installation**

-bash# Clone or create the project folder

-mkdir health-insurance-blockchain

-cd health-insurance-blockchain

**Set up the blockchain workspace
**
-mkdir blockchain && cd blockchain

-npm init -y

-npm install --save-dev hardhat@2.22.0

-npm install --save-dev @nomicfoundation/hardhat-toolbox@4.0.0

-npx hardhat init

**Choose: JavaScript project using Mocha and Ethers.js
**
**When asked to install dependencies: No
**

# Set up the React frontend

-cd ..

-npx create-react-app frontend

-cd frontend

-npm install ethers

**Running the Project**

You need three terminals open at the same time.

Terminal 1 — Start the local blockchain

bashcd blockchain

npx hardhat node

This starts a local Ethereum network at http://127.0.0.1:8545 and prints 20 funded test accounts. Keep this running.

Terminal 2 — Deploy the contract

bashcd blockchain

npx hardhat run scripts/deploy.js --network localhost

node scripts/copyABI.js

This deploys the contract, funds it with 2 ETH, saves the contract address to frontend/src/contractConfig.json, and copies the ABI to frontend/src/HealthInsuranceABI.json.

Terminal 3 — Start the frontend

bashcd frontend

npm start

Open http://localhost:3000 in your browser.

Role Guide

Connect MetaMask to Hardhat

Add a custom network in MetaMask:

FieldValueNetwork NameHardhat LocalRPC URLhttp://127.0.0.1:8545Chain ID31337Currency SymbolETH

Import test accounts

From the npx hardhat node output, import any three private keys into MetaMask via Import Account.



⚠️ These private keys are public Hardhat test keys. Never use them on mainnet or with real funds.


**Register roles (do this once after deploy)
**

Switch MetaMask to Account #0 → refresh the app → you see the Owner panel

Register Account #1 as Doctor (paste its address)

Register Account #2 as Patient (paste its address)

**Full end-to-end flow
**

1. Submit claimAccount #2 (Patient)Fill in treatment details and submit

2. Sign claimAccount #1 (Doctor)Review and sign the claim

3. Approve & payAccount #0 (Officer)Approve — ETH is sent automatically
Refresh the page each time you switch MetaMask accounts.


