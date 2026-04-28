import { useState, useEffect } from "react";
import { ethers } from "ethers";

const STATUS_LABEL = ["Submitted", "Doctor Signed", "Approved", "Rejected"];
const STATUS_COLOR = ["#854F0B", "#534AB7", "#0F6E56", "#A32D2D"];
const STATUS_BG = ["#FAEEDA", "#EEEDFE", "#E1F5EE", "#FCEBEB"];

export default function PatientDashboard({ contract, account }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    patientName: "",
    treatment: "",
    hospitalName: "",
    amountEth: "",
  });

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const ids = await contract.getPatientClaims(account);
      const fetched = await Promise.all(
        ids.map((id) => contract.getClaim(id))
      );
      setClaims(fetched.reverse());
    } catch (e) {
      setError("Failed to load claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract && account) fetchClaims();
  }, [contract, account]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const amountWei = ethers.parseEther(form.amountEth);
      const tx = await contract.submitClaim(
        form.patientName,
        form.treatment,
        form.hospitalName,
        amountWei
      );
      await tx.wait();
      setSuccess("Claim submitted successfully! The doctor will review it shortly.");
      setForm({ patientName: "", treatment: "", hospitalName: "", amountEth: "" });
      fetchClaims();
    } catch (e) {
      setError(e.reason || e.message || "Transaction failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={{ ...styles.badge, background: "#E1F5EE", color: "#0F6E56" }}>Patient</span>
        <h2 style={styles.title}>My Insurance Claims</h2>
      </div>

      {/* Submit Form */}
      <div style={styles.card}>
        <p style={styles.sectionLabel}>Submit new claim</p>
        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Full name</label>
              <input style={styles.input} value={form.patientName}
                onChange={e => setForm({ ...form, patientName: e.target.value })}
                placeholder="Elena Fischer" required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Claim amount (ETH)</label>
              <input style={styles.input} type="number" step="0.001" value={form.amountEth}
                onChange={e => setForm({ ...form, amountEth: e.target.value })}
                placeholder="1.5" required />
            </div>
          </div>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Hospital / Clinic</label>
              <input style={styles.input} value={form.hospitalName}
                onChange={e => setForm({ ...form, hospitalName: e.target.value })}
                placeholder="Dresden University Hospital" required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Treatment description</label>
              <input style={styles.input} value={form.treatment}
                onChange={e => setForm({ ...form, treatment: e.target.value })}
                placeholder="Appendectomy" required />
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>{success}</p>}

          <button style={styles.btnPrimary} type="submit" disabled={submitting}>
            {submitting ? "Submitting to blockchain..." : "Submit claim"}
          </button>
        </form>
      </div>

      {/* Claims List */}
      <div style={styles.card}>
        <p style={styles.sectionLabel}>My claims ({claims.length})</p>
        {loading && <p style={styles.muted}>Loading claims...</p>}
        {!loading && claims.length === 0 && (
          <p style={styles.muted}>No claims submitted yet.</p>
        )}
        {claims.map((claim) => (
          <div key={claim.id.toString()} style={styles.claimCard}>
            <div style={styles.claimRow}>
              <div>
                <p style={styles.claimId}>CLM-{claim.id.toString().padStart(5, "0")}</p>
                <p style={styles.claimTitle}>{claim.treatment}</p>
                <p style={styles.muted}>{claim.hospitalName}</p>
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
            {claim.doctorNotes && (
              <p style={styles.notes}>Doctor notes: {claim.doctorNotes}</p>
            )}
            {claim.rejectionReason && (
              <p style={{ ...styles.notes, color: "#A32D2D" }}>
                Rejection reason: {claim.rejectionReason}
              </p>
            )}
            <p style={styles.hash}>
              Claim #{claim.id.toString()} · Patient: {claim.patient.slice(0, 8)}...
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
  row: { display: "flex", gap: 12, marginBottom: 12 },
  field: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: "#666" },
  input: { padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, outline: "none" },
  btnPrimary: { marginTop: 8, padding: "10px 20px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  error: { color: "#A32D2D", fontSize: 13, margin: "8px 0" },
  success: { color: "#0F6E56", fontSize: 13, margin: "8px 0" },
  claimCard: { border: "1px solid #eee", borderRadius: 8, padding: "14px", marginBottom: 10, background: "#fafafa" },
  claimRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  claimId: { fontSize: 11, fontFamily: "monospace", color: "#888", margin: "0 0 4px" },
  claimTitle: { fontSize: 14, fontWeight: 500, margin: 0 },
  muted: { fontSize: 13, color: "#888", margin: "4px 0" },
  pill: { fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20 },
  notes: { fontSize: 12, color: "#555", marginTop: 8, padding: "6px 10px", background: "#f0f0f0", borderRadius: 6 },
  hash: { fontSize: 11, fontFamily: "monospace", color: "#aaa", marginTop: 8 },
};
