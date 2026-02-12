const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying P2P Escrow to Base...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("👤 Deployer Address:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        console.error("❌ Balance is 0! Send ETH to deployer.");
        process.exit(1);
    }

    // Deploy
    // The contract name is P2PEscrow (defined in contracts/P2PEscrow.sol)
    const Escrow = await hre.ethers.getContractFactory("P2PEscrow");

    // Set feeCollector as deployer for now
    const feeCollector = deployer.address;
    const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base Mainnet USDC
    console.log("🏦 Fee Collector set as:", feeCollector);
    console.log("🪙 USDC Token set as:", usdcAddress);

    // Deploy with viaIR enabled in config
    const escrow = await Escrow.deploy(feeCollector, usdcAddress);

    console.log("⏳ Waiting for deployment...");
    await escrow.waitForDeployment();

    const address = await escrow.getAddress();

    console.log("✅ Escrow Contract Deployed to:", address);
    console.log("\nIMPORTANT: Update .env with ESCROW_CONTRACT_ADDRESS=" + address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
