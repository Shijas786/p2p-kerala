import { ethers } from "ethers";
import { env } from "../src/config/env";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🚀 Deploying P2P Escrow to Base Mainnet...");

    if (!env.RELAYER_PRIVATE_KEY) {
        throw new Error("RELAYER_PRIVATE_KEY missing in .env");
    }

    // Connect to Base
    const provider = new ethers.JsonRpcProvider(env.BASE_RPC_URL);
    const wallet = new ethers.Wallet(env.RELAYER_PRIVATE_KEY, provider);

    console.log(`👤 Deployer Address: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === BigInt(0)) {
        throw new Error("❌ Balance is 0! Send ETH to deployer.");
    }

    // Compile Contract (Simple inline compilation check or assuming Hardhat? No, using ethers directly usually requires ABI/Bytecode or Solc)
    // Wait, we don't have Hardhat configured. We need 'solc' or 'hardhat'.
    // Since this is a TS project, maybe we can use 'solc-js' or simpler:
    // Actually, Hardhat is standard. I'll assume Hardhat or just use pre-compiled ABI/Bytecode?
    // But I just wrote the .sol file. It's raw source.

    // I need to setup Hardhat for reliable compilation/deployment.
    // Or I can use 'solc' directly in this script.
    // Given the environment, setting up Hardhat is cleaner.

    // But for now, I'll assume the user might not want a full Hardhat setup if they are just running a script.
    // I can stick to a simple `solc` compilation within the script.

    // Let's use `solc` (0.8.20) to compile on the fly.
    // I need to install `solc`.

    throw new Error("⚠️ Please install Hardhat to compile and deploy! Run: npx hardhat init");
}

/* 
   WAIT! Setting up Hardhat is the correct way.
   I will create `hardhat.config.ts` instead.
*/
