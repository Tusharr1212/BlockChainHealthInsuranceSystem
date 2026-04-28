import { useState, useEffect } from "react";
import { ethers } from "ethers";

export default function DoctorDashboard({ contract }) {
  const [pendingClaims, setPendingClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState({});
  const [txStatus, setTxStatus] = useState({});

  const fetchPendingClaims = async () => {
    setLoading(true);
    try {
      const total = await contract.getTotalClaims();
      const all = await Promise.all(
        Array.from({ length: Number(total) }, (_, i) => contract.getClaim(i + 1))
      );
      // Show only Submitted (status 0) claims
      setPendingClaims(all.filter((c) => Number(c.status) === 0).reverse());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract) fetchPendingClaims();
  }, [contract]);

  const handleSign = async (claimId) => {
    setTxStatus((prev) => ({ ...prev, [claimId]: "signing" }));
    try {
      const tx = await contract.signClaim(
        claimId,
        notes[claimId] || "Claim verified by doctor."
      );
      await tx.wait();
      setTxStatus((prev) => ({ ...prev, [claimId]: "signed" }));
      fetchPendingClaims();
    } catch (e) {
      setTxStatus((prev) => ({ ...prev, [claimId]: "error: " + (e.reason || e.message) }));
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={{ ...styles.badge, background: "#EEEDFE", color: "#534AB7" }}>Doctor</span>
        <h2 style={styles.title}>Claims awaiting your signature</h2>
      </div>

      <div style={styles.card}>
        <p style={styles.sectionLabel}>
          Pending review ({pendingClaims.length})
        </p>

        {loading && <p style={styles.muted}>Loading claims...</p>}
        {!loading && pendingClaims.length === 0 && (
          <p style={styles.muted}>No claims waiting for your signature.</p>
        )}

        {pendingClaims.map((claim) => (
          <div key={claim.id.toString()} style={styles.claimCard}>
            <div style={styles.claimRow}>
              <div>
                <p style={styles.claimId}>CLM-{claim.id.toString().padStart(5, "0")}</p>
                <p style={styles.claimTitle}>{claim.patientName} — {claim.treatment}</p>
                <p style={styles.muted}>{claim.hospitalName}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={styles.pillPending}>Awaiting signature</span>
                <p style={{ ...styles.claimTitle, marginTop: 6 }}>
                  {ethers.formatEther(claim.amount)} ETH
                </p>
              </div>
            </div>

            <div style={styles.signArea}>
              <p style={styles.signNote}>
                By signing, you confirm this treatment is legitimate and the claim is accurate.
              </p>
              <textarea
                style={styles.textarea}
                placeholder="Add clinical notes (optional)..."
                value={notes[claim.id.toString()] || ""}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, [claim.id.toString()]: e.target.value }))
                }
              />
              <div style={styles.btnRow}>
                <button
                  style={styles.btnSign}
                  onClick={() => handleSign(claim.id)}
                  disabled={txStatus[claim.id] === "signing"}
                >
                  {txStatus[claim.id] === "signing"
                    ? "Signing on-chain..."
                    : "Sign & certify claim"}
                </button>
              </div>
              {txStatus[claim.id] && txStatus[claim.id] !== "signing" && (
                <p style={{
                  fontSize: 12,
                  marginTop: 8,
                  color: txStatus[claim.id] === "signed" ? "#0F6E56" : "#A32D2D",
                }}>
                  {txStatus[claim.id] === "signed"
                    ? "Claim signed and forwarded to insurance officer."
                    : txStatus[claim.id]}
                </p>
              )}
            </div>

            <p style={styles.hash}>
              Patient wallet: {claim.patient.slice(0, 10)}...{claim.patient.slice(-6)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 720, margin: "0 auto", padding: "24px 16px" },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  badge: { fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20 },
  title: { fontSize: 20, fontWeight: 500, margin: 0 },
  card: { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "20px 24px", marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", marginBottom: 16, marginTop: 0 },
  claimCard: { border: "1px solid #eee", borderRadius: 8, padding: "14px", marginBottom: 12, background: "#fafafa" },
  claimRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  claimId: { fontSize: 11, fontFamily: "monospace", color: "#888", margin: "0 0 4px" },
  claimTitle: { fontSize: 14, fontWeight: 500, margin: 0 },
  muted: { fontSize: 13, color: "#888", margin: "4px 0" },
  pillPending: { fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: "#FAEEDA", color: "#854F0B" },
  signArea: { background: "#EEEDFE", border: "1px solid #AFA9EC", borderRadius: 8, padding: 12 },
  signNote: { fontSize: 12, color: "#534AB7", marginBottom: 8, marginTop: 0 },
  textarea: { width: "100%", height: 64, padding: "8px 10px", border: "1px solid #AFA9EC", borderRadius: 6, fontSize: 13, resize: "none", boxSizing: "border-box", background: "#fff" },
  btnRow: { display: "flex", gap: 8, marginTop: 8 },
  btnSign: { padding: "8px 16px", background: "#534AB7", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  hash: { fontSize: 11, fontFamily: "monospace", color: "#aaa", marginTop: 8, marginBottom: 0 },
};
