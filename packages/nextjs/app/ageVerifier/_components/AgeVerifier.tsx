"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { groth16 } from "snarkjs";

// ABI and Contract Address
const CONTRACT_ADDRESS = "0xda52b25ddB0e3B9CC393b0690Ac62245Ac772527";
const CONTRACT_ABI = [
  {
    inputs: [
      {
        internalType: "uint256[2]",
        name: "_pA",
        type: "uint256[2]",
      },
      {
        internalType: "uint256[2][2]",
        name: "_pB",
        type: "uint256[2][2]",
      },
      {
        internalType: "uint256[2]",
        name: "_pC",
        type: "uint256[2]",
      },
      {
        internalType: "uint256[1]",
        name: "_pubSignals",
        type: "uint256[1]",
      },
    ],
    name: "verifyProof",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// Provider and Signer
const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "");
const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY || "";
const signer = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

export function DebugAgeVerifier() {
  const [birthdate, setBirthdate] = useState<string>("");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parse the birthdate input
      const birthdateTimestamp = Math.floor(new Date(birthdate).getTime() / 1000);
      const currentDateTimestamp = Math.floor(Date.now() / 1000);

      // Calculate user's age in years
      const ageInYears = Math.floor((currentDateTimestamp - birthdateTimestamp) / (365 * 24 * 60 * 60));

      // Set the minimum age threshold (e.g., 18)
      const minAge = 18;

      // Debug info
      setDebugInfo({
        birthdateTimestamp,
        currentDateTimestamp,
        ageInYears,
        minAge,
      });

      console.log("Inputs for generating a proof:", minAge, birthdateTimestamp, currentDateTimestamp);

      // Generate the proof using snarkjs
      const { proof, publicSignals } = await groth16.fullProve(
        {
          minAge,
          birthdate: birthdateTimestamp,
          currentDate: currentDateTimestamp,
        },
        "AgeVerifier.wasm",
        "AgeVerifier_final.zkey",
      );

      console.log("Public Signals", publicSignals);
      console.log("Proof", proof);

      // Export calldata for the contract
      const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
      console.log("Call data", calldata);

      const args = JSON.parse(`[${calldata}]`);

      // Call the contract's view function
      const result = await contract.verifyProof(args[0], args[1], args[2], args[3]);

      console.log("Contract verification result:", result);

      // Semantic validation: combine contract verification with publicSignals check
      const isAbove18 = result && publicSignals.includes("1");

      setDebugInfo((prevInfo: any) => ({
        ...prevInfo,
        proof,
        publicSignals,
        contractResult: result,
        isAbove18,
      }));

      // Set more descriptive verification status
      setVerificationStatus(isAbove18 ? "Verified: User is above 18" : "Not Verified: User is under 18");
    } catch (err: any) {
      setError(err.message);
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto p-6">
      <div className="bg-base-100 shadow-lg rounded-2xl w-full p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Age Verifier</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-2 font-medium">Birth Date</label>
            <input
              type="date"
              onChange={e => setBirthdate(e.target.value)}
              value={birthdate}
              className="input input-bordered w-full bg-base-200"
            />
          </div>

          <button onClick={handleVerify} disabled={loading || !birthdate} className="btn btn-primary w-full">
            {loading ? "Verifying..." : "Verify Age"}
          </button>

          {error && <div className="alert alert-error">{error}</div>}

          {verificationStatus && !error && (
            <div className={`alert ${verificationStatus.includes("Not Verified") ? "alert-error" : "alert-success"}`}>
              {verificationStatus}
            </div>
          )}

          {Object.keys(debugInfo).length > 0 && (
            <div className="bg-base-300 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-3">Information:</h2>
              <div className="space-y-2 font-mono text-sm">
                <p>Birthdate Timestamp: {debugInfo.birthdateTimestamp}</p>
                <p>Current Date Timestamp: {debugInfo.currentDateTimestamp}</p>
                <p>User Age: {debugInfo.ageInYears} years</p>
                <p>Minimum Age Requirement: {debugInfo.minAge} years</p>
                <p>Contract Verification Result: {debugInfo.contractResult ? "True" : "False"}</p>
                <p>Is User Above 18 based on output signal: {debugInfo.isAbove18 ? "Yes" : "No"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
