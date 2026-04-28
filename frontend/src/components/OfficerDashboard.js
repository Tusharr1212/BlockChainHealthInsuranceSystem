import { useState, useEffect } from "react";
import { ethers } from "ethers";

const STATUS_LABEL = ["Submitted", "Doctor Signed", "Approved", "Rejected"];

export default function OfficerDashboard({ contract }) {
  const [signedClaims, setSignedClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [contractBalance, setContractBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [txStatus, setTxStatus] = useState({});
  const [activeTab, setActiveTab] = useState("pending");

  const fetchData = async () => {
    setLoading(true);
    try {
      const total = await contract.getTotalClaims();
      const all = await Promise.all(
        Array.from({ length: Number(total) }, (_, i) => contract.getClaim(i + 1))
      );
      setAllClaims(all.reverse());
      setSignedClaims(all.filter((c) => Number(c.status) === 1).reverse());
      const bal = await contract.getContractBalance();
      setContractBalance(ethers.formatEther(bal));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract) fetchData();
  }, [contract]);

  const handleApprove = async (claimId) => {
    setTxStatus((prev) => ({ ...prev, [claimId]: "approving" }));
    try {
      const tx = await contract.approveClaim(claimId);
      await tx.wait();
      setTxStatus((prev) => ({ ...prev, [claimId]: "approved" }));
      fetchData();
    } catch (e) {
      setTxStatus((prev) => ({ ...prev, [claimId]: "error: " + (e.reason || e.message) }));
    }
  };

  const handleReject = async (claimId) => {
    const reason = rejectionReasons[claimId];
    if (!reason) return alert("Please enter a rejection reason.");
    setTxStatus((prev) => ({ ...prev, [claimId]: "rejecting" }));
    try {
      const tx = await contract.rejectClaim(claimId, reason);
      await tx.wait();
      setTxStatus((prev) => ({ ...prev, [claimId]: "rejected" }));
      fetchData();
    } catch (e) {
      setTxStatus((prev) => ({ ...prev, [claimId]: "error: " + (e.reason || e.message) }));
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;
    try {
      const tx = await contract.depositFunds({ value: ethers.parseEther(depositAmount) });
      await tx.wait();
      setDepositAmount("");
      fetchData();
    } catch (e) {
      alert(e.reason || e.message);
    }
  };

  const metrics = [
    { label: "Doctor-signed", value: signedClaims.length },
    { label: "Total approved", value: allClaims.filter(c => Number(c.status) === 2).length },
    { label: "Rejected", value: allClaims.filter(c => Number(c.status) === 3).length },
    { label: "Contract balance", value: parseFloat(contractBalance).toFixed(3) + " ETH" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={{ ...styles.badge, background: "#E6F1FB", color: "#185FA5" }}>Insurance Officer</span>
        <h2 style={styles.title}>Claims Management</h2>
      </div>

      {/* Metrics */}
      <div style={styles.metrics}>
        {metrics.map((m) => (
          <div key={m.label} style={styles.metric}>
            <p style={styles.metricLabel}>{m.label}</p>
            <p style={styles.metricValue}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Deposit Funds */}
      <div style={styles.card}>
        <p style={styles.sectionLabel}>Deposit funds into contract</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            style={{ ...styles.input, width: 160 }}
            type="number"
            step="0.1"
            placeholder="Amount in ETH"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <button style={styles.btnDeposit} onClick={handleDeposit}>
            Deposit ETH
          </button>
          <span style={styles.muted}>Current balance: {parseFloat(contractBalance).toFixed(4)} ETH</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(activeTab === "pending" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("pending")}>
          Pending approval ({signedClaims.length})
        </button>
        <button style={{ ...styles.tab, ...(activeTab === "all" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("all")}>
          All claims ({allClaims.length})
        </button>
      </div>

      <div style={styles.card}>
        {loading && <p style={styles.muted}>Loading claims...</p>}

        {activeTab === "pending" && (
          <>
            {signedClaims.length === 0 && !loading && (
              <p style={styles.muted}>No doctor-signed claims waiting for approval.</p>
            )}
            {signedClaims.map((claim) => (
              <ClaimRow
                key={claim.id.toString()}
                claim={claim}
                rejectionReasons={rejectionReasons}
                setRejectionReasons={setRejectionReasons}
                txStatus={txStatus}
                onApprove={handleApprove}
                onReject={handleReject}
                showActions
              />
            ))}
          </>
        )}

        {activeTab === "all" && (
          <>
            {allClaims.length === 0 && !loading && (
              <p style={styles.muted}>No claims found.</p>
            )}
            {allClaims.map((claim) => (
              <ClaimRow
                key={claim.id.toString()}
                claim={claim}
                rejectionReasons={rejectionReasons}
                setRejectionReasons={setRejectionReasons}
                txStatus={txStatus}
                onApprove={handleApprove}
                onReject={handleReject}
                showActions={Number(claim.status) === 1}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ClaimRow({ claim, rejectionReasons, setRejectionReasons, txStatus, onApprove, onReject, showActions }) {
  const STATUS_BG = ["#FAEEDA", "#EEEDFE", "#E1F5EE", "#FCEBEB"];
  const STATUS_COLOR = ["#854F0B", "#534AB7", "#0F6E56", "#A32D2D"];
  const STATUS_LABEL = ["Submitted", "Doctor Signed", "Approved", "Rejected"];
  const id = claim.id.toString();

  return (
    <div style={styles.claimCard}>
      <div style={styles.claimRow}>
        <div>
          <p style={styles.claimId}>CLM-{id.padStart(5, "0")}</p>
          <p style={styles.claimTitle}>{claim.patientName} — {claim.treatment}</p>
          <p style={styles.muted}>{claim.hospitalName}</p>
          {claim.doctorNotes && (
            <p style={styles.notes}>Doctor: {claim.doctorNotes}</p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{
            ...styles.pill,
            background: STATUS_BG[claim.status],
            color: STATUS_COLOR[claim.status],
          }}>
            {STATUS_LABEL[claim.status]}
          </span>
          <p style={{ ...styles.claimTitle, marginTop: 6 }}>
            {ethers.formatEther(claim.amount)} ETH
          </p>
        </div>
      </div>

      {showActions && (
        <div style={styles.actionArea}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              style={styles.btnApprove}
              onClick={() => onApprove(claim.id)}
              disabled={txStatus[id] === "approving"}
            >
              {txStatus[id] === "approving" ? "Processing..." : "Approve & disburse ETH"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...styles.input, flex: 1 }}
              placeholder="Rejection reason..."
              value={rejectionReasons[id] || ""}
              onChange={(e) =>
                setRejectionReasons((prev) => ({ ...prev, [id]: e.target.value }))
              }
            />
            <button
              style={styles.btnReject}
              onClick={() => onReject(claim.id)}
              disabled={txStatus[id] === "rejecting"}
            >
              {txStatus[id] === "rejecting" ? "Rejecting..." : "Reject"}
            </button>
          </div>
          {txStatus[id] && !["approving", "rejecting"].includes(txStatus[id]) && (
            <p style={{
              fontSize: 12, marginTop: 8,
              color: txStatus[id] === "approved" ? "#0F6E56" : txStatus[id] === "rejected" ? "#A32D2D" : "#A32D2D"
            }}>
              {txStatus[id] === "approved" && "ETH disbursed to patient wallet."}
              {txStatus[id] === "rejected" && "Claim rejected and recorded on-chain."}
              {txStatus[id].startsWith("error") && txStatus[id]}
            </p>
          )}
        </div>
      )}

      {claim.rejectionReason && (
        <p style={{ ...styles.notes, color: "#A32D2D", background: "#FCEBEB" }}>
          Rejection reason: {claim.rejectionReason}
        </p>
      )}

      <p style={styles.hash}>
        Patient: {claim.patient.slice(0, 10)}...{claim.patient.slice(-6)}
        {claim.doctor !== "0x0000000000000000000000000000000000000000" &&
          ` · Doctor: ${claim.doctor.slice(0, 8)}...`}
      </p>
    </div>
  );
}

const styles = {
  page: { maxWidth: 720, margin: "0 auto", padding: "24px 16px" },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  badge: { fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20 },
  title: { fontSize: 20, fontWeight: 500, margin: 0 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 },
  metric: { background: "#f5f5f5", borderRadius: 8, padding: "12px 16px" },
  metricLabel: { fontSize: 11, color: "#888", margin: "0 0 4px" },
  metricValue: { fontSize: 22, fontWeight: 500, margin: 0 },
  card: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "20px 24px", marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", marginBottom: 12, marginTop: 0 },
  input: { padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, outline: "none" },
  btnDeposit: { padding: "8px 16px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  tabs: { display: "flex", gap: 4, marginBottom: 0, borderBottom: "1px solid #eee" },
  tab: { padding: "10px 16px", fontSize: 13, background: "none", border: "none", cursor: "pointer", color: "#888", borderBottom: "2px solid transparent", marginBottom: -1 },
  tabActive: { color: "#185FA5", borderBottomColor: "#185FA5", fontWeight: 500 },
  claimCard: { border: "1px solid #eee", borderRadius: 8, padding: 14, marginBottom: 10, background: "#fafafa" },
  claimRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  claimId: { fontSize: 11, fontFamily: "monospace", color: "#888", margin: "0 0 4px" },
  claimTitle: { fontSize: 14, fontWeight: 500, margin: 0 },
  muted: { fontSize: 13, color: "#888", margin: "4px 0" },
  pill: { fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20 },
  notes: { fontSize: 12, color: "#555", marginTop: 6, padding: "6px 10px", background: "#f0f0f0", borderRadius: 6 },
  actionArea: { background: "#E6F1FB", border: "1px solid #85B7EB", borderRadius: 8, padding: 12, marginTop: 8 },
  btnApprove: { padding: "8px 16px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  btnReject: { padding: "8px 16px", background: "#A32D2D", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  hash: { fontSize: 11, fontFamily: "monospace", color: "#aaa", marginTop: 8, marginBottom: 0 },
};
