# 🚩 Challenge #5 : ZKP - Age Verifier

> ⚠️ **Important:** Please complete **Challenge #4** first if you haven't already, as it contains essential instructions related to all upcoming challenges.

🎫 Build an Age Verifier using Zero-Knowledge Proofs (ZKP) on Arbitrum Stylus:

👷‍♀️ In this challenge, you'll build and deploy a smart contract that utilizes Zero-Knowledge Proofs for private age verification. You'll work with ZKP circuits, deploy them to an Arbitrum Stylus dev node, and create a frontend that allows users to generate and verify proofs! 🚀

🌟 The final deliverable is a full-stack application featuring age verification. Deploy your contract to a testnet, then build and upload your app to a public web server.

### How ZKP Integration Works
This project leverages Zero-Knowledge Proofs (ZKPs) to enable private verification of age on Arbitrum Stylus. Here's the workflow:

1. **Circuit Design**: The ZKP logic is defined in `.circom` files (e.g., `AgeVerifier.circom`) using the Circom language. These circuits encode the rules for verification (e.g., "is age ≥ 18?") without revealing the inputs.
2. **Proof System Setup**: We use the `snarkjs` library with the Groth16 proving system to generate proving and verification keys. The trusted setup is simulated using a pre-existing `pot12_final.ptau` file.
3. **Contract Generation**: The verification key is exported to a Solidity contract (e.g., `AgeVerifier.sol`) that runs on Arbitrum Stylus, allowing on-chain verification of zk-proofs.
4. **Frontend Interaction**: The Next.js frontend uses WebAssembly (`.wasm`) outputs from Circom to generate proofs locally, which are then submitted to the deployed contract for verification.
5. **Arbitrum Stylus Advantage**: Stylus' Rust-based environment enables efficient execution of the verifier contract, reducing gas costs compared to traditional EVM-based ZKP verification.

This integration ensures privacy (inputs remain off-chain) and scalability (proof verification is lightweight on-chain).

## Checkpoint 0: 📦 Environment Setup 📚

Before starting, ensure you have the following installed:

- [Node.js (>= v18.17)](https://nodejs.org/en/download/)
- [Yarn](https://classic.yarnpkg.com/en/docs/install/)
- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Install Rust and Cargo

1. Install Rust using `rustup`, which is the recommended way to install Rust:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   Follow the on-screen instructions to complete the installation.

2. After installation, ensure that the Cargo and Rust binaries are in your `PATH`. You can do this by adding the following line to your shell configuration file (e.g., `~/.bashrc` or `~/.zshrc`):
   ```bash
   export PATH="$HOME/.cargo/bin:$PATH"
   ```
   Then, run:
   ```bash
   source ~/.bashrc  # or source ~/.zshrc
   ```

### Install Circom

1. Install `circom` globally using npm:
   ```bash
   npm install -g circom
   ```

2. Verify the installation by checking the version:
   ```bash
   circom --version
   ```

### Clone the Repository

```bash
git clone -b stylus-zkp-age-verifier https://github.com/abhi152003/speedrun_stylus.git
cd speedrun_stylus
```

### Install Dependencies

Run the following command to install all necessary dependencies:

```bash
yarn install
```

## Checkpoint 1: 🚀 Start Your Dev Environment

### Step 1: Start the Nitro Dev Node

1. Ensure Docker is running on your machine. You can start Docker Desktop if it's not already running.
2. Navigate to the `cargo-stylus` folder:
   ```bash
   cd packages/cargo-stylus
   ```

3. Run the `run-dev-node.sh` script:
   ```bash
   bash run-dev-node.sh
   ```
   This script:
   - Spins up an Arbitrum Stylus Nitro dev node in Docker.
   - Deploys the `AgeVerifier.sol` contract.
   - Generates the ABI for interacting with the contract.

> The dev node will be accessible at `http://localhost:8547`.

**Important:** After deploying a contract, update the contract address in `packages/nextjs/app/ageVerifier/_components/AgeVerifier.tsx`:

```ts
const CONTRACT_ADDRESS = "<your_new_contract_address>";
```

### Step 2: Start the Frontend

> ⚠️ **Before running the frontend:**
> 
>    Go to the `packages/nextjs` directory:
>    ```bash
>    cd packages/nextjs
>    cp .env.example .env
>    ```
>    Open the `.env` file and set:
>    ```env
>    NEXT_PUBLIC_RPC_URL=http://localhost:8547
>    NEXT_PUBLIC_PRIVATE_KEY=your_private_key_of_your_ethereum_wallet
>    ```

Start the development server :
```bash
yarn dev
```

> The app will be available at [http://localhost:3000/ageVerifier](http://localhost:3000/ageVerifier).

## Checkpoint 2: 💫 Explore the Features

### Age Verifier

- **Purpose**: Prove that a user's age meets a threshold (e.g., ≥ 18) without disclosing their birthdate.
- **Circuit Logic**: The `AgeVerifier.circom` circuit takes a private input (birthdate) and a public input (threshold year). It computes the age and outputs a proof if the condition is met.
- **On-Chain Verification**: The generated proof is submitted to `AgeVerifier.sol` on the Stylus dev node, which uses the verification key to confirm validity.

![Age Verifier Interface](https://github.com/user-attachments/assets/36c8961b-a3c2-4dee-ab53-929ddb8a265b)
*Age verification interface and process flow*

- Navigate to the "Debug Contracts" tab in the frontend.
- This feature interacts with the **Age Verifier** contract, which was generated from the `AgeVerifier.circom` circuit located in `packages/circuits`.
- Circuit generation commands:
  ```bash
  circom AgeVerifier.circom --r1cs --wasm --sym
  npx snarkjs groth16 setup AgeVerifier.r1cs pot12_final.ptau AgeVerifier_0000.zkey
  npx snarkjs zkey contribute AgeVerifier_0000.zkey AgeVerifier_final.zkey --name="Contributor" -v
  npx snarkjs zkey export verificationkey AgeVerifier_final.zkey verification_key.json
  npx snarkjs zkey export solidityverifier AgeVerifier_final.zkey AgeVerifier.sol
  ```
- Choose a birthdate in the frontend to generate a zk-proof, which will be verified on-chain using the deployed `AgeVerifier.sol` contract.

## Checkpoint 3: 🛠 Modify and Deploy Contracts

You can tinker with circuit logic by modifying files in the `packages/circuits` folder. After making changes, regenerate contracts using these commands:

```bash
circom AgeVerifier.circom --r1cs --wasm --sym
npx snarkjs groth16 setup AgeVerifier.r1cs pot12_final.ptau AgeVerifier_0000.zkey
npx snarkjs zkey contribute AgeVerifier_0000.zkey AgeVerifier_final.zkey --name="Contributor" -v
npx snarkjs zkey export verificationkey AgeVerifier_final.zkey verification_key.json
npx snarkjs zkey export solidityverifier AgeVerifier_final.zkey AgeVerifier.sol
```

Deploy new contracts by placing them in `packages/cargo-stylus/contracts` and running:

```bash
bash run-dev-node.sh
```

This ensures the frontend interacts with the correct deployed contract.

## 🛠️ Debugging Tips

### Fixing Line Endings for Shell Scripts on Windows (CRLF Issue)

If you encounter errors like `Command not found`, convert line endings to LF:

```bash
sudo apt install dos2unix
dos2unix run-dev-node.sh
chmod +x run-dev-node.sh
```

Run the script again:
```bash
bash run-dev-node.sh
```

## Checkpoint 4: 🚢 Ship your frontend! 🚁

To deploy your app to Vercel:

```bash
vercel
```

Follow Vercel's instructions to get a public URL.

For production deployment:
```bash
vercel --prod
```

## Checkpoint 5: 📜 Contract Verification

You can verify your deployed smart contract using:

```bash
cargo stylus verify -e http://127.0.0.1:8547 --deployment-tx "$deployment_tx"
```

Replace `$deployment_tx` with your deployment transaction hash.

## 🚀 Deploying to Arbitrum Sepolia

If you want to deploy your Age Verifier contract to the Arbitrum Sepolia testnet, follow these steps:

1. **Export your private key in the terminal**
   ```bash
   export PRIVATE_KEY=your_private_key_of_your_ethereum_wallet
   ```

2. **Run the Sepolia Deployment Script**
   ```bash
   cd packages/cargo-stylus/zkp_age_verifier
   bash run-sepolia-deploy.sh
   ```
   This will deploy your contract to Arbitrum Sepolia and output the contract address and transaction hash.

3. **Configure the Frontend for Sepolia**
   - Go to the `packages/nextjs` directory:
     ```bash
     cd packages/nextjs
     cp .env.example .env
     ```
   - Open the `.env` file and set the following variables:
     ```env
     NEXT_PUBLIC_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
     NEXT_PUBLIC_PRIVATE_KEY=your_private_key_of_your_ethereum_wallet
     ```
     Replace `your_private_key_of_your_ethereum_wallet` with your actual Ethereum wallet private key (never share this key publicly).

4. **Start the Frontend**
   ```bash
   yarn run dev
   ```
   Your frontend will now connect to the Arbitrum Sepolia network and interact with your deployed contract.


---

## ⚡️ Cache Your Deployed Contract for Faster, Cheaper Access

> 📖 Contracts deployed on Arbitrum Sepolia can use this command for gas benefits, time savings, and cheaper contract function calls. Our backend will benchmark and place bids on your behalf to ensure your contract is not evicted from the CacheManager contract, fully automating this process for you.

Before caching your contract, make sure you have installed the Smart Cache CLI globally:

```bash
npm install -g smart-cache-cli
```

After deploying your contract to Arbitrum Sepolia, you can cache your contract address using the `smart-cache` CLI. Caching your contract enables:
- 🚀 **Faster contract function calls** by reducing lookup time
- 💸 **Cheaper interactions** by optimizing access to contract data
- 🌐 **Seamless access** to your contract from any environment or system

> 💡 **Info:** Both the `<address>` and `--deployed-by` flags are **mandatory** when adding a contract to the cache.

### 📝 Simple Example

```bash
smart-cache add <CONTRACT_ADDRESS> --deployed-by <YOUR_WALLET_ADDRESS_WITH_WHOM_YOU_HAVE_DEPLOYED_CONTRACT>
```

### 🛠️ Advanced Example

```bash
smart-cache add 0xYourContractAddress \
  --deployed-by 0xYourWalletAddress \
  --network arbitrum-sepolia \
  --tx-hash 0xYourDeploymentTxHash \
  --name "YourContractName" \
  --version "1.0.0"
```

- `<CONTRACT_ADDRESS>`: The address of your deployed contract (**required**)
- `--deployed-by`: The wallet address you used to deploy the contract (**required**)
- `--network arbitrum-sepolia`: By default, contracts are cached for the Arbitrum Sepolia network for optimal benchmarking and compatibility
- `--tx-hash`, `--name`, `--version`: Optional metadata for better organization

> ⚠️ **Warning:** If you omit the required fields, the command will not work as expected.

> 💡 For more options, run `smart-cache add --help`.

For more in-depth details and the latest updates, visit the [smart-cache-cli package on npmjs.com](https://www.npmjs.com/package/smart-cache-cli).

---

## 🏁 Next Steps

Explore more challenges or contribute to this project!

> 🏃 Head to your next challenge [here](https://speedrunstylus.com/challenge/zkp-balance).