import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying P2P Escrow to Base Mainnet...");

    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer Address:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

    if (balance === BigInt(0)) {
        console.error("❌ Balance is 0! Send ETH to deployer.");
        process.exit(1);
    }

    // Deploy
    const Escrow = await ethers.getContractFactory("Escrow");
    // Set feeCollector as deployer (or env variable if you prefer)
    const feeCollector = deployer.address;
    console.log("🏦 Fee Collector set as:", feeCollector);

    const escrow = await Escrow.deploy(feeCollector);

    await escrow.waitForDeployment();
    const address = await escrow.getAddress();

    console.log("✅ Escrow Contract Deployed to:", address);
    console.log("\n IMPORTANT: Update .env with ESCROW_CONTRACT_ADDRESS=" + address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
