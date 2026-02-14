import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying P2P Escrow to Binance Smart Chain (BSC)...");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer Address:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "BNB");

    if (balance === BigInt(0)) {
        console.error("❌ Balance is 0! Send BNB to deployer.");
        process.exit(1);
    }

    // Deploy
    const Escrow = await ethers.getContractFactory("P2PEscrow");
    const feeCollector = deployer.address;
    console.log("🏦 Fee Collector set as:", feeCollector);

    // BSC Addresses (BEP20)
    // USDC: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
    const usdcAddress = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";

    console.log("💵 USDC Address (BSC):", usdcAddress);

    const escrow = await Escrow.deploy(feeCollector, usdcAddress);

    console.log("⏳ Waiting for deployment...");
    await escrow.waitForDeployment();

    const address = await escrow.getAddress();
    console.log("✅ P2PEscrow Deployed to BSC at:", address);

    console.log("\n👇 NEXT STEPS:");
    console.log(`1. Update .env with ESCROW_CONTRACT_ADDRESS_BSC=${address}`);
    console.log(`2. Verify contract: npx hardhat verify --network bsc ${address} ${feeCollector} ${usdcAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
