const hre = require("hardhat");

async function main() {
    const contractAddress = "0x5ED1dC490061Bf9e281B849B6D4ed17feE84F260";
    const usdtAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";

    const [deployer] = await hre.ethers.getSigners();
    console.log("Using account:", deployer.address);

    const P2PEscrow = await hre.ethers.getContractAt("P2PEscrow", contractAddress);

    console.log("Approving USDT on contract...");
    const tx = await P2PEscrow.setApprovedToken(usdtAddress, true);
    await tx.wait();

    console.log("✅ USDT Approved!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
