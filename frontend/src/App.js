import { useState } from "react";
import { useBlockchain } from "./useBlockchain";
import PatientDashboard from "./components/PatientDashboard";
import DoctorDashboard from "./components/DoctorDashboard";
import OfficerDashboard from "./components/OfficerDashboard";

const ROLE_COLORS = {
  owner:   { bg: "#E6F1FB", color: "#185FA5" },
  officer: { bg: "#E6F1FB", color: "#185FA5" },
  doctor:  { bg: "#EEEDFE", color: "#534AB7" },
  patient: { bg: "#E1F5EE", color: "#0F6E56" },
  unknown: { bg: "#F1EFE8", color: "#5F5E5A" },
};

export default function App() {
  const { contract, account, role, loading, error, connect } = useBlockchain();

  const short = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <div style={styles.app}>
      {/* Top navbar */}
      <nav style={styles.nav}>
        <div style={styles.navBrand}>
          <div style={styles.logo}>+</div>
          <span style={styles.brandName}>HealthChain</span>
          <span style={styles.brandSub}>Insurance</span>
        </div>
        <div style={styles.navRight}>
          {account && role && (
            <span style={{
              ...styles.roleBadge,
              background: ROLE_COLORS[role]?.bg,
              color: ROLE_COLORS[role]?.color,
            }}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
          )}
          {account ? (
            <span style={styles.address}>{short}</span>
          ) : (
            <button style={styles.connectBtn} onClick={connect} disabled={loading}>
              {loading ? "Connecting..." : "Connect MetaMask"}
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <main style={styles.main}>
        {!account && (
          <div style={styles.landing}>
            <div style={styles.landingIcon}>+</div>
            <h1 style={styles.landingTitle}>Blockchain Health Insurance</h1>
            <p style={styles.landingDesc}>
              A transparent, tamper-proof insurance system. Patients submit claims,
              doctors verify them, and officers disburse ETH — all on-chain.
            </p>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.connectBtnLarge} onClick={connect} disabled={loading}>
              {loading ? "Connecting..." : "Connect MetaMask to continue"}
            </button>
            <div style={styles.steps}>
              {[
                { icon: "①", role: "Patient", desc: "Submit insurance claim" },
                { icon: "②", role: "Doctor", desc: "Sign & certify claim" },
                { icon: "③", role: "Officer", desc: "Approve & send ETH" },
              ].map((s) => (
                <div key={s.role} style={styles.stepCard}>
                  <div style={styles.stepIcon}>{s.icon}</div>
                  <p style={styles.stepRole}>{s.role}</p>
                  <p style={styles.stepDesc}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {account && role === "unknown" && (
          <div style={styles.notice}>
            <p style={styles.noticeTitle}>Wallet not registered</p>
            <p style={styles.noticeText}>
              Your wallet (<code>{short}</code>) is not registered as a patient, doctor, or officer.
              Ask the contract owner to register your address.
            </p>
          </div>
        )}

        {account && role === "owner" && (
          <div style={styles.notice}>
            <p style={styles.noticeTitle}>Owner account connected</p>
            <p style={styles.noticeText}>
              You are the contract owner. Use the Hardhat console or a script to register
              doctors and patients. See the README for instructions.
            </p>
            <OwnerPanel contract={contract} />
          </div>
        )}

        {account && role === "patient" && (
          <PatientDashboard contract={contract} account={account} />
        )}
        {account && role === "doctor" && (
          <DoctorDashboard contract={contract} />
        )}
        {account && (role === "officer") && (
          <OfficerDashboard contract={contract} />
        )}
      </main>
    </div>
  );
}

// Simple owner registration panel
function OwnerPanel({ contract }) {
  const [addr, setAddr] = useState("");
  const [regRole, setRegRole] = useState("patient");
  const [status, setStatus] = useState("");

  const register = async () => {
    setStatus("Registering...");
    try {
      const tx = regRole === "patient"
        ? await contract.registerPatient(addr)
        : await contract.registerDoctor(addr);
      await tx.wait();
      setStatus(`${regRole} registered successfully!`);
      setAddr("");
    } catch (e) {
      setStatus("Error: " + (e.reason || e.message));
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Register a wallet address</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={regRole} onChange={e => setRegRole(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }}>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
        </select>
        <input value={addr} onChange={e => setAddr(e.target.value)}
          placeholder="0x wallet address"
          style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, minWidth: 200 }} />
        <button onClick={register}
          style={{ padding: "8px 16px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
          Register
        </button>
      </div>
      {status && <p style={{ fontSize: 12, marginTop: 6, color: status.startsWith("Error") ? "#A32D2D" : "#0F6E56" }}>{status}</p>}
    </div>
  );
}

// useState needed for OwnerPanel


const styles = {
  app: { minHeight: "100vh", background: "#f8f8f6", fontFamily: "system-ui, sans-serif" },
  nav: { background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" },
  navBrand: { display: "flex", alignItems: "center", gap: 8 },
  logo: { width: 28, height: 28, background: "#185FA5", color: "#fff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 },
  brandName: { fontSize: 15, fontWeight: 600, color: "#111" },
  brandSub: { fontSize: 13, color: "#888" },
  navRight: { display: "flex", alignItems: "center", gap: 10 },
  roleBadge: { fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20 },
  address: { fontSize: 12, fontFamily: "monospace", color: "#555", background: "#f0f0f0", padding: "4px 10px", borderRadius: 6 },
  connectBtn: { padding: "7px 14px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  main: { padding: "32px 16px" },
  landing: { maxWidth: 560, margin: "40px auto", textAlign: "center" },
  landingIcon: { width: 56, height: 56, background: "#185FA5", color: "#fff", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 28, margin: "0 auto 20px" },
  landingTitle: { fontSize: 26, fontWeight: 600, margin: "0 0 12px" },
  landingDesc: { fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 24px" },
  connectBtnLarge: { padding: "12px 28px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: "pointer", marginBottom: 40 },
  steps: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, textAlign: "center" },
  stepCard: { background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: "16px 12px" },
  stepIcon: { fontSize: 20, marginBottom: 8 },
  stepRole: { fontWeight: 600, fontSize: 13, margin: "0 0 4px" },
  stepDesc: { fontSize: 12, color: "#888", margin: 0 },
  notice: { maxWidth: 560, margin: "40px auto", background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "24px 28px" },
  noticeTitle: { fontWeight: 600, fontSize: 16, margin: "0 0 8px" },
  noticeText: { fontSize: 13, color: "#555", lineHeight: 1.6, margin: 0 },
  error: { color: "#A32D2D", fontSize: 13, margin: "0 0 16px" },
};
