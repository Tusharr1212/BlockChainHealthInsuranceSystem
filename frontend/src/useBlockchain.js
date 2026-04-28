import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import contractConfig from "./contractConfig.json";
import HealthInsuranceABI from "./HealthInsuranceABI.json";

export function useBlockchain() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [role, setRole] = useState(null); // "owner" | "officer" | "doctor" | "patient" | "unknown"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const detectRole = useCallback(async (contractInstance, address) => {
    try {
      const owner = await contractInstance.owner();
      const officer = await contractInstance.insuranceOfficer();
      const isDoctor = await contractInstance.registeredDoctors(address);
      const isPatient = await contractInstance.registeredPatients(address);

      if (address.toLowerCase() === owner.toLowerCase()) return "owner";
      if (address.toLowerCase() === officer.toLowerCase()) return "officer";
      if (isDoctor) return "doctor";
      if (isPatient) return "patient";
      return "unknown";
    } catch {
      return "unknown";
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found. Please install MetaMask.");
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });

      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _account = await _signer.getAddress();

      const _contract = new ethers.Contract(
        contractConfig.contractAddress,
        HealthInsuranceABI,
        _signer
      );

      const _role = await detectRole(_contract, _account);

      setProvider(_provider);
      setSigner(_signer);
      setContract(_contract);
      setAccount(_account);
      setRole(_role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [detectRole]);

  // Auto-reconnect if already connected
  useEffect(() => {
    if (window.ethereum?.selectedAddress) {
      connect();
    }
  }, [connect]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handler = () => connect();
    window.ethereum.on("accountsChanged", handler);
    return () => window.ethereum.removeListener("accountsChanged", handler);
  }, [connect]);

  return { provider, signer, contract, account, role, loading, error, connect };
}
