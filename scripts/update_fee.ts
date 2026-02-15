
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const ESCROW_ABI = [
    "function setFeeBps(uint256 _newFeeBps) external",
    "function feeBps() view returns (uint256)"
];

async function main() {
    const chainArg = process.argv[2] || "base";
    const isBsc = chainArg.toLowerCase() === "bsc" || chainArg.toLowerCase() === "bnb";

    const rpcUrl = isBsc ? process.env.BSC_RPC_URL : process.env.BASE_RPC_URL;
    const privateKey = process.env.RELAYER_PRIVATE_KEY;
    const contractAddress = isBsc ? process.env.ESCROW_CONTRACT_ADDRESS_BSC : process.env.ESCROW_CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
        console.error(`Missing env variables for chain: ${chainArg}`);
        console.error(`Checked: RPC=${rpcUrl}, Contract=${contractAddress}`);
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, ESCROW_ABI, wallet);

    console.log(`🌐 Chain: ${isBsc ? "BNB/BSC" : "Base"}`);
    console.log(`📡 Connecting to ${rpcUrl}`);
    console.log(`📝 Contract: ${contractAddress}`);
    console.log(`🔑 Wallet: ${wallet.address}`);

    const currentFee = await contract.feeBps();
    console.log(`💰 Current Fee BPS: ${currentFee.toString()}`);

    if (currentFee.toString() === "100") {
        console.log("✅ Fee is already 100 bps (1%). No action needed.");
        return;
    }

    console.log("⚙️ Updating Fee BPS to 100 (1%)...");
    const tx = await contract.setFeeBps(100);
    console.log(`🚀 Transaction sent: ${tx.hash}`);

    await tx.wait();
    console.log("✅ Fee updated successfully!");

    const newFee = await contract.feeBps();
    console.log(`💰 New Fee BPS: ${newFee.toString()}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
