"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { groth16 } from "snarkjs";

export default function LocationVerifier() {
  const [location, setLocation] = useState("");
  const [stateLocation, setStateLocation] = useState("");
  const [minLat, setMinLat] = useState("");
  const [maxLat, setMaxLat] = useState("");
  const [minLon, setMinLon] = useState("");
  const [maxLon, setMaxLon] = useState("");
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [proof, setProof] = useState<any>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocationDisabled, setIsLocationDisabled] = useState<boolean>(false);
  const [areBoundingBoxInputsDisabled, setAreBoundingBoxInputsDisabled] = useState<boolean>(false);

  // Replace with your deployed contract address on Arbitrum Stylus
  const CONTRACT_ADDRESS = "0xda52b25ddB0e3B9CC393b0690Ac62245Ac772527"; // Update with your contract address
  const CONTRACT_ABI = [
    {
      inputs: [
        { internalType: "uint256[2]", name: "_pA", type: "uint256[2]" },
        { internalType: "uint256[2][2]", name: "_pB", type: "uint256[2][2]" },
        { internalType: "uint256[2]", name: "_pC", type: "uint256[2]" },
        { internalType: "uint256[4]", name: "_pubSignals", type: "uint256[4]" },
      ],
      name: "verifyProof",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
  ];

  useEffect(() => {
    const loadContract = async () => {
      try {
        setError(null);
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

    loadContract();
    getLocation();
  }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          setLocation(`Latitude: ${latitude}, Longitude: ${longitude}`);
          setIsLocationDisabled(true);
        },
        error => {
          setError("Unable to retrieve your location. Please allow GPS access.");
          console.error("Geolocation error:", error);
        },
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  };

  const fetchBoundingBox = async (state: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?state=${state}&format=json&polygon=1&addressdetails=1`,
      );
      const data = await response.json();

      if (data.length > 0) {
        const { boundingbox } = data[0];
        setMinLat(boundingbox[0]);
        setMaxLat(boundingbox[1]);
        setMinLon(boundingbox[2]);
        setMaxLon(boundingbox[3]);
        setAreBoundingBoxInputsDisabled(true);
      } else {
        setError("State not found. Please enter a valid state name.");
      }
    } catch (err) {
      setError("Error fetching bounding box data.");
      console.error("Fetch error:", err);
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const state = e.target.value;
    setStateLocation(state);
    if (state) {
      fetchBoundingBox(state);
    } else {
      setMinLat("");
      setMaxLat("");
      setMinLon("");
      setMaxLon("");
      setAreBoundingBoxInputsDisabled(false);
    }
  };

  const verifyLocation = async () => {
    try {
      console.log("Inside verify location");
      setLoading(true);
      setError(null);

      if (!contract || !signer) {
        throw new Error("Contract or signer not initialized");
      }

      // Extract latitude and longitude from the location string
      const [latStr, lonStr] = location.split(", ").map(coord => coord.split(": ")[1]);
      const userLat = Math.round(parseFloat(latStr) * 1e7); // Scale to integer
      const userLon = Math.round(parseFloat(lonStr) * 1e7); // Scale to integer

      // Scale bounding box coordinates to integers
      const minLatScaled = Math.round(parseFloat(minLat) * 1e7);
      const maxLatScaled = Math.round(parseFloat(maxLat) * 1e7);
      const minLonScaled = Math.round(parseFloat(minLon) * 1e7);
      const maxLonScaled = Math.round(parseFloat(maxLon) * 1e7);

      // Generate the proof with all six inputs
      const { proof, publicSignals } = await groth16.fullProve(
        {
          user_lat: userLat, // Private
          user_lon: userLon, // Private
          min_lat: minLatScaled, // Public
          max_lat: maxLatScaled, // Public
          min_lon: minLonScaled, // Public
          max_lon: maxLonScaled, // Public
        },
        "/LocationVerifier.wasm",
        "/LocationVerifier_final.zkey",
      );
      console.log("Proof", proof);

      // Export calldata for the contract
      const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
      console.log("calldataaaaa", calldata);
      const args = JSON.parse(`[${calldata}]`);

      // Call the contract's verifyProof function (matches generated contract)
      const result = await contract.verifyProof(
        args[0], // _pA
        args[1], // _pB
        args[2], // _pC
        args[3], // _pubSignals (array of 4 public signals)
      );

      setVerificationResult(result);
      setProof(proof);

      console.log("Contract verification result:", result);
    } catch (err: any) {
      if (err.message.includes("Assert Failed")) {
        setError("Your current location is not within the selected state’s boundaries.");
      } else {
        setError("An unexpected error occurred during verification.");
      }
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isInputValid = () =>
    location !== "" && stateLocation !== "" && minLat !== "" && maxLat !== "" && minLon !== "" && maxLon !== "";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-700">Location Verifier</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Location: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Fetching your location..."
            disabled={isLocationDisabled}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State Location: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={stateLocation}
            onChange={handleStateChange}
            className="w-full p-2 border rounded-md"
            placeholder="Enter the state you want to verify"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Latitude: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={minLat}
            onChange={e => setMinLat(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Enter minimum latitude"
            disabled={areBoundingBoxInputsDisabled}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Latitude: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={maxLat}
            onChange={e => setMaxLat(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Enter maximum latitude"
            disabled={areBoundingBoxInputsDisabled}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Longitude: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={minLon}
            onChange={e => setMinLon(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Enter minimum longitude"
            disabled={areBoundingBoxInputsDisabled}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Longitude: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={maxLon}
            onChange={e => setMaxLon(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Enter maximum longitude"
            disabled={areBoundingBoxInputsDisabled}
            required
          />
        </div>

        <button
          onClick={verifyLocation}
          disabled={!isInputValid() || loading}
          className={`w-full p-2 rounded-md transition-colors ${
            isInputValid() && !loading
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {loading ? "Verifying..." : "Verify Location"}
        </button>

        {error && <div className="mt-4 p-3 rounded-md bg-red-100 text-red-700">{error}</div>}

        {verificationResult !== null && !error && (
          <div
            className={`mt-4 p-3 rounded-md ${verificationResult ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {verificationResult ? "Verified: Location is valid!" : "Verification failed: Invalid location or proof!"}
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
