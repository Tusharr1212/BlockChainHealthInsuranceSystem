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
