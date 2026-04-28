const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HealthInsurance", function () {
  let contract;
  let owner, officer, doctor, patient, stranger;

  // Amount: 1 ETH in wei
  const claimAmount = ethers.parseEther("1.0");

  // Run before every test — deploy a fresh contract
  beforeEach(async function () {
    [owner, officer, doctor, patient, stranger] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("HealthInsurance");
    contract = await Factory.deploy(officer.address);
    await contract.waitForDeployment();

    // Register doctor and patient
    await contract.connect(owner).registerDoctor(doctor.address);
    await contract.connect(owner).registerPatient(patient.address);

    // Officer deposits 5 ETH so contract can pay out claims
    await contract.connect(officer).depositFunds({ value: ethers.parseEther("5.0") });
  });

  // ─────────────────────────────────────────────
  //  REGISTRATION TESTS
  // ─────────────────────────────────────────────

  describe("Registration", function () {
    it("should register a doctor", async function () {
      expect(await contract.registeredDoctors(doctor.address)).to.equal(true);
    });

    it("should register a patient", async function () {
      expect(await contract.registeredPatients(patient.address)).to.equal(true);
    });

    it("should NOT let a non-owner register a doctor", async function () {
      await expect(
        contract.connect(stranger).registerDoctor(stranger.address)
      ).to.be.revertedWith("Only owner can call this");
    });
  });

  // ─────────────────────────────────────────────
  //  CLAIM SUBMISSION TESTS
  // ─────────────────────────────────────────────

  describe("Claim Submission", function () {
    it("should allow a patient to submit a claim", async function () {
      await contract
        .connect(patient)
        .submitClaim("Elena Fischer", "Appendectomy", "Dresden Hospital", claimAmount);

      const claim = await contract.getClaim(1);
      expect(claim.patientName).to.equal("Elena Fischer");
      expect(claim.status).to.equal(0); // 0 = Submitted
      expect(claim.amount).to.equal(claimAmount);
    });

    it("should NOT allow an unregistered address to submit a claim", async function () {
      await expect(
        contract
          .connect(stranger)
          .submitClaim("Hacker", "Fake Treatment", "Fake Hospital", claimAmount)
      ).to.be.revertedWith("Only registered patients can call this");
    });

    it("should NOT allow a claim with zero amount", async function () {
      await expect(
        contract.connect(patient).submitClaim("Elena", "Treatment", "Hospital", 0)
      ).to.be.revertedWith("Claim amount must be greater than zero");
    });

    it("should increment claim counter", async function () {
      await contract
        .connect(patient)
        .submitClaim("Patient One", "Treatment A", "Hospital A", claimAmount);
      await contract
        .connect(patient)
        .submitClaim("Patient One", "Treatment B", "Hospital B", claimAmount);

      expect(await contract.getTotalClaims()).to.equal(2);
    });
  });

  // ─────────────────────────────────────────────
  //  DOCTOR SIGNING TESTS
  // ─────────────────────────────────────────────

  describe("Doctor Signing", function () {
    beforeEach(async function () {
      await contract
        .connect(patient)
        .submitClaim("Elena Fischer", "Appendectomy", "Dresden Hospital", claimAmount);
    });

    it("should allow a doctor to sign a claim", async function () {
      await contract.connect(doctor).signClaim(1, "Procedure confirmed, legitimate claim.");

      const claim = await contract.getClaim(1);
      expect(claim.status).to.equal(1); // 1 = DoctorSigned
      expect(claim.doctor).to.equal(doctor.address);
      expect(claim.doctorNotes).to.equal("Procedure confirmed, legitimate claim.");
    });

    it("should NOT allow an unregistered doctor to sign", async function () {
      await expect(
        contract.connect(stranger).signClaim(1, "Some notes")
      ).to.be.revertedWith("Only registered doctors can call this");
    });

    it("should NOT allow signing an already-signed claim", async function () {
      await contract.connect(doctor).signClaim(1, "First signature");
      await expect(
        contract.connect(doctor).signClaim(1, "Second signature")
      ).to.be.revertedWith("Claim must be in Submitted status");
    });
  });

  // ─────────────────────────────────────────────
  //  OFFICER APPROVAL TESTS
  // ─────────────────────────────────────────────

  describe("Officer Approval & Payout", function () {
    beforeEach(async function () {
      // Submit and sign a claim so it's ready for officer
      await contract
        .connect(patient)
        .submitClaim("Elena Fischer", "Appendectomy", "Dresden Hospital", claimAmount);
      await contract.connect(doctor).signClaim(1, "Confirmed.");
    });

    it("should approve a claim and send ETH to patient", async function () {
      const balanceBefore = await ethers.provider.getBalance(patient.address);

      await contract.connect(officer).approveClaim(1);

      const balanceAfter = await ethers.provider.getBalance(patient.address);
      const claim = await contract.getClaim(1);

      expect(claim.status).to.equal(2); // 2 = Approved
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });

    it("should NOT approve a claim that has not been doctor-signed", async function () {
      // Submit a second claim but don't sign it
      await contract
        .connect(patient)
        .submitClaim("Tobias Braun", "MRI Scan", "Leipzig Clinic", claimAmount);

      await expect(
        contract.connect(officer).approveClaim(2)
      ).to.be.revertedWith("Claim must be doctor-signed first");
    });

    it("should NOT allow a non-officer to approve", async function () {
      await expect(
        contract.connect(stranger).approveClaim(1)
      ).to.be.revertedWith("Only insurance officer can call this");
    });
  });

  // ─────────────────────────────────────────────
  //  REJECTION TESTS
  // ─────────────────────────────────────────────

  describe("Officer Rejection", function () {
    beforeEach(async function () {
      await contract
        .connect(patient)
        .submitClaim("Elena Fischer", "Appendectomy", "Dresden Hospital", claimAmount);
      await contract.connect(doctor).signClaim(1, "Confirmed.");
    });

    it("should allow officer to reject a claim", async function () {
      await contract.connect(officer).rejectClaim(1, "Policy limit exceeded");

      const claim = await contract.getClaim(1);
      expect(claim.status).to.equal(3); // 3 = Rejected
      expect(claim.rejectionReason).to.equal("Policy limit exceeded");
    });

    it("should NOT allow rejecting an already approved claim", async function () {
      await contract.connect(officer).approveClaim(1);
      await expect(
        contract.connect(officer).rejectClaim(1, "Too late")
      ).to.be.revertedWith("Cannot reject an already finalised claim");
    });
  });

  // ─────────────────────────────────────────────
  //  FULL FLOW TEST
  // ─────────────────────────────────────────────

  describe("Full claim lifecycle", function () {
    it("should complete the full flow: submit → sign → approve → payout", async function () {
      // 1. Patient submits
      await contract
        .connect(patient)
        .submitClaim("Elena Fischer", "Appendectomy", "Dresden Hospital", claimAmount);
      let claim = await contract.getClaim(1);
      expect(claim.status).to.equal(0); // Submitted

      // 2. Doctor signs
      await contract.connect(doctor).signClaim(1, "Treatment verified.");
      claim = await contract.getClaim(1);
      expect(claim.status).to.equal(1); // DoctorSigned

      // 3. Officer approves + ETH sent
      const balanceBefore = await ethers.provider.getBalance(patient.address);
      await contract.connect(officer).approveClaim(1);
      const balanceAfter = await ethers.provider.getBalance(patient.address);

      claim = await contract.getClaim(1);
      expect(claim.status).to.equal(2); // Approved
      expect(balanceAfter).to.be.greaterThan(balanceBefore);

      console.log("     Full lifecycle passed! ETH successfully sent to patient.");
    });
  });
});
