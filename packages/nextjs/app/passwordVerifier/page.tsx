"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { groth16 } from "snarkjs";

export default function PasswordVerifier() {
  const [combination, setCombination] = useState(["", "", "", ""]);
  const [expectedHash, setExpectedHash] = useState("");
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [proof, setProof] = useState<any>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Replace with your deployed contract address on Arbitrum Stylus
  const CONTRACT_ADDRESS = "0xA6E41fFD769491a42A6e5Ce453259b93983a22EF";
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

  useEffect(() => {
    loadContract();
  }, []);

  const loadContract = async () => {
    try {
      setError(null);

      // Connect to Arbitrum Stylus dev node
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "");
      const privateKey = process.env.PRIVATE_KEY || "";
      const newSigner = new ethers.Wallet(privateKey, provider);
      setSigner(newSigner);

      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner);
      setContract(contractInstance);
    } catch (err: any) {
      setError(err.message);
      console.error("Contract loading error:", err);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    if (value === "" || (Number(value) >= 0 && Number(value) <= 9)) {
      const newCombination = [...combination];
      newCombination[index] = value;
      setCombination(newCombination);
    }
  };

  const verifyPassword = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!contract || !signer) {
        throw new Error("Contract or signer not initialized");
      }

      // Convert combination to numbers and validate
      const combinationNumbers = combination.map(num => Number(num));
      if (combinationNumbers.some(num => isNaN(num))) {
        throw new Error("Invalid combination");
      }

      const expectedHashNumber = Number(expectedHash);
      if (isNaN(expectedHashNumber)) {
        throw new Error("Invalid hash");
      }

      // Generate the proof
      const { proof, publicSignals } = await groth16.fullProve(
        {
          combination: combinationNumbers,
          expectedHash: expectedHashNumber,
        },
        "/PasswordVerifier.wasm",
        "/PasswordVerifier_final.zkey",
      );

      // Check if publicSignals contains a valid signal
      const isValidSignal = publicSignals.includes("1");

      // Export calldata for the contract
      const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
      const args = JSON.parse(`[${calldata}]`);

      // Call the contract's verifyProof function
      const proofIsValid = await contract.verifyProof(args[0], args[1], args[2], args[3]);

      // Combine contract verification with publicSignals check
      const finalVerificationResult = proofIsValid && isValidSignal;

      setVerificationResult(finalVerificationResult);
      setProof(proof);

      console.log("Proof verification:", proofIsValid);
      console.log("Circuit output (isValid):", isValidSignal);
    } catch (err: any) {
      console.error("Verification failed:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const isInputValid = () => combination.every(digit => digit !== "") && expectedHash.trim() !== "";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-700">Password Verifier</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter 4-digit combination: <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 justify-center">
            {combination.map((digit, index) => (
              <input
                key={index}
                type="text"
                value={digit}
                onChange={e => handleInputChange(index, e.target.value)}
                className="w-12 h-12 text-center border rounded-md"
                maxLength={1}
                required
              />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expected Hash: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={expectedHash}
            onChange={e => setExpectedHash(e.target.value)}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <button
          onClick={verifyPassword}
          disabled={!isInputValid() || loading}
          className={`w-full p-2 rounded-md transition-colors ${
            isInputValid() && !loading
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {loading ? "Verifying..." : "Verify Password"}
        </button>

        {error && <div className="mt-4 p-3 rounded-md bg-red-100 text-red-700">{error}</div>}

        {verificationResult !== null && !error && (
          <div
            className={`mt-4 p-3 rounded-md ${verificationResult ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {verificationResult ? "Password verified successfully!" : "Password verification failed!"}
          </div>
        )}

        {proof && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2 text-gray-700">Proof:</h2>
            <pre className="bg-gray-100 text-gray-700 p-2 rounded-md overflow-x-auto text-xs">
              {JSON.stringify(proof, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
