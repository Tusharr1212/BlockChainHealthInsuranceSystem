// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Health Insurance Smart Contract
/// @notice Manages the full lifecycle of health insurance claims on-chain
contract HealthInsurance {

    // ─────────────────────────────────────────────
    //  ROLES
    // ─────────────────────────────────────────────

    address public owner;           // Contract deployer (admin)
    address public insuranceOfficer; // The officer who approves/rejects claims

    mapping(address => bool) public registeredDoctors;   // Doctors allowed to sign claims
    mapping(address => bool) public registeredPatients;  // Patients allowed to submit claims

    // ─────────────────────────────────────────────
    //  CLAIM DATA
    // ─────────────────────────────────────────────

    enum ClaimStatus {
        Submitted,      // 0 - Patient submitted, waiting for doctor
        DoctorSigned,   // 1 - Doctor verified and signed
        Approved,       // 2 - Officer approved, ETH sent
        Rejected        // 3 - Officer rejected
    }

    struct Claim {
        uint256 id;
        address patient;        // Who submitted the claim
        address doctor;         // Who signed the claim
        string patientName;
        string treatment;
        string hospitalName;
        uint256 amount;         // Amount in wei (ETH)
        ClaimStatus status;
        string doctorNotes;     // Doctor adds notes when signing
        string rejectionReason; // Officer adds reason if rejected
        uint256 submittedAt;    // Timestamp of submission
        uint256 updatedAt;      // Timestamp of last update
    }

    uint256 public claimCounter;                     // Auto-increment ID
    mapping(uint256 => Claim) public claims;         // claimId => Claim
    mapping(address => uint256[]) public patientClaims; // patient => list of claim IDs

    // ─────────────────────────────────────────────
    //  EVENTS (logged on-chain for transparency)
    // ─────────────────────────────────────────────

    event PatientRegistered(address indexed patient);
    event DoctorRegistered(address indexed doctor);
    event ClaimSubmitted(uint256 indexed claimId, address indexed patient, uint256 amount);
    event ClaimSigned(uint256 indexed claimId, address indexed doctor);
    event ClaimApproved(uint256 indexed claimId, address indexed patient, uint256 amount);
    event ClaimRejected(uint256 indexed claimId, string reason);
    event FundsDeposited(address indexed from, uint256 amount);

    // ─────────────────────────────────────────────
    //  MODIFIERS (access control checks)
    // ─────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyOfficer() {
        require(msg.sender == insuranceOfficer, "Only insurance officer can call this");
        _;
    }

    modifier onlyDoctor() {
        require(registeredDoctors[msg.sender], "Only registered doctors can call this");
        _;
    }

    modifier onlyPatient() {
        require(registeredPatients[msg.sender], "Only registered patients can call this");
        _;
    }

    modifier claimExists(uint256 _claimId) {
        require(_claimId > 0 && _claimId <= claimCounter, "Claim does not exist");
        _;
    }

    // ─────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────

    constructor(address _insuranceOfficer) {
        owner = msg.sender;
        insuranceOfficer = _insuranceOfficer;
    }

    // ─────────────────────────────────────────────
    //  REGISTRATION (owner registers doctors & patients)
    // ─────────────────────────────────────────────

    function registerDoctor(address _doctor) external onlyOwner {
        require(_doctor != address(0), "Invalid address");
        registeredDoctors[_doctor] = true;
        emit DoctorRegistered(_doctor);
    }

    function registerPatient(address _patient) external onlyOwner {
        require(_patient != address(0), "Invalid address");
        registeredPatients[_patient] = true;
        emit PatientRegistered(_patient);
    }

    // ─────────────────────────────────────────────
    //  PATIENT — Submit a claim
    // ─────────────────────────────────────────────

    function submitClaim(
        string memory _patientName,
        string memory _treatment,
        string memory _hospitalName,
        uint256 _amount          // Amount in wei
    ) external onlyPatient returns (uint256) {
        require(_amount > 0, "Claim amount must be greater than zero");
        require(bytes(_patientName).length > 0, "Patient name required");
        require(bytes(_treatment).length > 0, "Treatment description required");
        require(bytes(_hospitalName).length > 0, "Hospital name required");

        claimCounter++;

        claims[claimCounter] = Claim({
            id: claimCounter,
            patient: msg.sender,
            doctor: address(0),
            patientName: _patientName,
            treatment: _treatment,
            hospitalName: _hospitalName,
            amount: _amount,
            status: ClaimStatus.Submitted,
            doctorNotes: "",
            rejectionReason: "",
            submittedAt: block.timestamp,
            updatedAt: block.timestamp
        });

        patientClaims[msg.sender].push(claimCounter);

        emit ClaimSubmitted(claimCounter, msg.sender, _amount);
        return claimCounter;
    }

    // ─────────────────────────────────────────────
    //  DOCTOR — Sign a claim to certify it
    // ─────────────────────────────────────────────

    function signClaim(
        uint256 _claimId,
        string memory _notes
    ) external onlyDoctor claimExists(_claimId) {
        Claim storage claim = claims[_claimId];

        require(claim.status == ClaimStatus.Submitted, "Claim must be in Submitted status");

        claim.doctor = msg.sender;
        claim.doctorNotes = _notes;
        claim.status = ClaimStatus.DoctorSigned;
        claim.updatedAt = block.timestamp;

        emit ClaimSigned(_claimId, msg.sender);
    }

    // ─────────────────────────────────────────────
    //  OFFICER — Approve a claim and send ETH
    // ─────────────────────────────────────────────

    function approveClaim(uint256 _claimId)
        external
        onlyOfficer
        claimExists(_claimId)
    {
        Claim storage claim = claims[_claimId];

        require(claim.status == ClaimStatus.DoctorSigned, "Claim must be doctor-signed first");
        require(address(this).balance >= claim.amount, "Insufficient contract funds");

        claim.status = ClaimStatus.Approved;
        claim.updatedAt = block.timestamp;

        // Transfer ETH to patient wallet
        (bool sent, ) = payable(claim.patient).call{value: claim.amount}("");
        require(sent, "ETH transfer failed");

        emit ClaimApproved(_claimId, claim.patient, claim.amount);
    }

    // ─────────────────────────────────────────────
    //  OFFICER — Reject a claim
    // ─────────────────────────────────────────────

    function rejectClaim(
        uint256 _claimId,
        string memory _reason
    ) external onlyOfficer claimExists(_claimId) {
        Claim storage claim = claims[_claimId];

        require(
            claim.status == ClaimStatus.Submitted || claim.status == ClaimStatus.DoctorSigned,
            "Cannot reject an already finalised claim"
        );

        claim.status = ClaimStatus.Rejected;
        claim.rejectionReason = _reason;
        claim.updatedAt = block.timestamp;

        emit ClaimRejected(_claimId, _reason);
    }

    // ─────────────────────────────────────────────
    //  FUND MANAGEMENT
    // ─────────────────────────────────────────────

    /// @notice Officer or owner deposits ETH into contract for payouts
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    function depositFunds() external payable onlyOfficer {
        require(msg.value > 0, "Must deposit more than 0 ETH");
        emit FundsDeposited(msg.sender, msg.value);
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ─────────────────────────────────────────────
    //  VIEW FUNCTIONS (read data without gas cost)
    // ─────────────────────────────────────────────

    function getClaim(uint256 _claimId)
        external
        view
        claimExists(_claimId)
        returns (Claim memory)
    {
        return claims[_claimId];
    }

    function getPatientClaims(address _patient)
        external
        view
        returns (uint256[] memory)
    {
        return patientClaims[_patient];
    }

    function getTotalClaims() external view returns (uint256) {
        return claimCounter;
    }
}
