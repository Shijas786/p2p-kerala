import { ethers } from "ethers";
import { env } from "../config/env";

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
];

class WalletService {
    private provider: ethers.JsonRpcProvider | null = null;
    private masterNode: ethers.HDNodeWallet | null = null;

    private getProvider(): ethers.JsonRpcProvider {
        if (!this.provider) {
            this.provider = new ethers.JsonRpcProvider(env.BASE_RPC_URL);
        }
        return this.provider;
    }

    private getMasterNode(): ethers.HDNodeWallet {
        if (!this.masterNode) {
            const seed = (env as any).MASTER_WALLET_SEED;
            if (!seed) {
                throw new Error(
                    "MASTER_WALLET_SEED not set in .env! Generate one with: node -e \"console.log(require('ethers').Mnemonic.fromEntropy(require('crypto').randomBytes(16)).phrase)\""
                );
            }
            // Create HD wallet from mnemonic
            this.masterNode = ethers.HDNodeWallet.fromPhrase(
                seed,
                undefined, // no password
                "m/44'/60'/0'/0" // BIP-44 Ethereum path
            );
        }
        return this.masterNode;
    }

    private getAdminSigner(): ethers.Wallet {
        if (!env.RELAYER_PRIVATE_KEY) throw new Error("RELAYER_PRIVATE_KEY needed for admin actions");
        return new ethers.Wallet(env.RELAYER_PRIVATE_KEY, this.getProvider());
    }

    /**
     * Get Relayer Address (Admin)
     */
    async getRelayerAddress(): Promise<string> {
        return this.getAdminSigner().getAddress();
    }

    // ═══════════════════════════════════════
    //          WALLET CREATION
    // ═══════════════════════════════════════

    /**
     * Generate a new mnemonic seed phrase (run once during setup)
     */
    static generateMasterSeed(): string {
        const wallet = ethers.Wallet.createRandom();
        return wallet.mnemonic!.phrase;
    }

    /**
     * Derive a wallet for a specific user by their index
     * Same index ALWAYS produces the same wallet (deterministic)
     */
    deriveWallet(userIndex: number): { address: string; privateKey: string } {
        const master = this.getMasterNode();
        const child = master.deriveChild(userIndex);
        return {
            address: child.address,
            privateKey: child.privateKey,
        };
    }

    /**
     * Get a Signer (wallet that can send transactions) for a user
     */
    getUserSigner(userIndex: number): ethers.Wallet {
        const { privateKey } = this.deriveWallet(userIndex);
        return new ethers.Wallet(privateKey, this.getProvider());
    }

    // ═══════════════════════════════════════
    //          BALANCE & INFO
    // ═══════════════════════════════════════

    /**
     * Get ETH balance (needed for gas on non-gasless networks)
     */
    async getEthBalance(address: string): Promise<string> {
        const provider = this.getProvider();
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
    }

    /**
     * Get Token balance (Generic)
     */
    async getTokenBalance(address: string, tokenAddress: string = env.USDC_ADDRESS): Promise<string> {
        const provider = this.getProvider();
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const balance = await token.balanceOf(address);
        const decimals = await token.decimals();
        return ethers.formatUnits(balance, decimals);
    }

    /**
     * Get USDC balance (Legacy Wrapper)
     */
    async getUsdcBalance(address: string): Promise<string> {
        return this.getTokenBalance(address, env.USDC_ADDRESS);
    }

    /**
     * Get all balances for display
     */
    async getBalances(address: string): Promise<{
        eth: string;
        usdc: string;
        usdt: string;
        address: string;
    }> {
        const [eth, usdc, usdt] = await Promise.all([
            this.getEthBalance(address),
            this.getUsdcBalance(address),
            this.getTokenBalance(address, env.USDT_ADDRESS),
        ]);
        return { eth, usdc, usdt, address };
    }

    // ═══════════════════════════════════════
    //          TRANSACTIONS
    // ═══════════════════════════════════════

    /**
     * Send Token (Generic)
     */
    async sendToken(
        userIndex: number,
        toAddress: string,
        amount: number,
        tokenAddress: string = env.USDC_ADDRESS
    ): Promise<string> {
        const signer = this.getUserSigner(userIndex);
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

        const decimalsRaw = await tokenContract.decimals();
        const decimals = Number(decimalsRaw);
        const amountWei = ethers.parseUnits(amount.toFixed(decimals), decimals);

        const tx = await tokenContract.transfer(toAddress, amountWei);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Send USDC (Legacy Wrapper)
     */
    async sendUSDC(
        userIndex: number,
        toAddress: string,
        amount: number
    ): Promise<string> {
        return this.sendToken(userIndex, toAddress, amount, env.USDC_ADDRESS);
    }

    /**
     * Send Native ETH
     */
    async sendEth(
        userIndex: number,
        toAddress: string,
        amount: number
    ): Promise<string> {
        const signer = this.getUserSigner(userIndex);
        const tx = await signer.sendTransaction({
            to: toAddress,
            value: ethers.parseEther(amount.toString())
        });
        const receipt = await tx.wait();
        return receipt!.hash;
    }

    /**
     * Approve the escrow contract to spend user's USDC
     * (Required before creating a trade on the escrow contract)
     */
    async approveEscrow(
        userIndex: number,
        amount: number
    ): Promise<string> {
        if (!env.ESCROW_CONTRACT_ADDRESS) {
            throw new Error("Escrow contract not configured");
        }

        const signer = this.getUserSigner(userIndex);
        const usdc = new ethers.Contract(env.USDC_ADDRESS, ERC20_ABI, signer);

        const amountWei = ethers.parseUnits(amount.toString(), 6);
        const tx = await usdc.approve(env.ESCROW_CONTRACT_ADDRESS, amountWei);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Check if escrow is already approved for an amount
     */
    async checkAllowance(userAddress: string): Promise<string> {
        if (!env.ESCROW_CONTRACT_ADDRESS) return "0";

        const provider = this.getProvider();
        const usdc = new ethers.Contract(env.USDC_ADDRESS, ERC20_ABI, provider);
        const allowance = await usdc.allowance(userAddress, env.ESCROW_CONTRACT_ADDRESS);
        return ethers.formatUnits(allowance, 6);
    }

    /**
     * Send ETH from user's wallet (for gas if needed)
     */
    async sendETH(
        userIndex: number,
        toAddress: string,
        amount: string
    ): Promise<string> {
        const signer = this.getUserSigner(userIndex);
        const tx = await signer.sendTransaction({
            to: toAddress,
            value: ethers.parseEther(amount),
        });
        const receipt = await tx.wait();
        return receipt!.hash;
    }

    /**
     * Admin (Relayer) sends USDC back to user
     */
    async adminRefund(
        toAddress: string,
        amount: number
    ): Promise<string> {
        const signer = this.getAdminSigner();
        const usdc = new ethers.Contract(env.USDC_ADDRESS, ERC20_ABI, signer);

        const amountWei = ethers.parseUnits(amount.toString(), 6);
        const tx = await usdc.transfer(toAddress, amountWei);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Relayer creates trade on behalf of Seller
     */
    async relayerCreateTrade(
        buyerAddress: string,
        amount: number,
        tokenAddress: string = env.USDC_ADDRESS,
        durationSeconds: number = 3600
    ): Promise<{ txHash: string; tradeId: number }> {
        const signer = this.getAdminSigner();
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

        const decimalsRaw = await tokenContract.decimals();
        const decimals = Number(decimalsRaw);
        const amountWei = ethers.parseUnits(amount.toFixed(decimals), decimals);

        // 1. Create Escrow Contract instance for fee calculation
        const escrow = new ethers.Contract(
            env.ESCROW_CONTRACT_ADDRESS,
            [
                "function createTrade(address buyer, address token, uint256 amount, uint256 duration) returns (uint256)",
                "function calculateFee(uint256 amount) view returns (uint256 fee, uint256 netAmount)",
                "event TradeCreated(uint256 indexed tradeId, address indexed seller, address indexed buyer, address token, uint256 amount, uint256 feeAmount, uint256 deadline)",
            ],
            signer
        );

        // Calculate Fee using the contract's logic for perfect precision
        const [feeWei] = await escrow.calculateFee(amountWei);
        const totalWei = amountWei + feeWei;

        console.log(`🛠️ Relayer Trade Setup:`);
        console.log(`   Token: ${tokenAddress}`);
        console.log(`   Escrow: ${env.ESCROW_CONTRACT_ADDRESS}`);
        console.log(`   Relayer: ${signer.address}`);
        console.log(`   Amount: ${amountWei.toString()} (${amount} units)`);
        console.log(`   Fee (from contract): ${feeWei.toString()}`);
        console.log(`   Total Required: ${totalWei.toString()}`);

        const currentAllowance = await tokenContract.allowance(signer.address, env.ESCROW_CONTRACT_ADDRESS);
        console.log(`   Current Allowance: ${currentAllowance.toString()}`);

        if (currentAllowance < totalWei) {
            console.log(`⏳ Approving Escrow contract for infinite allowance...`);
            const approveTx = await tokenContract.approve(env.ESCROW_CONTRACT_ADDRESS, ethers.MaxUint256);
            await approveTx.wait();
            console.log(`✅ Infinite allowance approved for escrow`);
        }

        // 3. Create Trade
        try {
            const tx = await escrow.createTrade(
                buyerAddress,
                tokenAddress,
                amountWei, // Pass original amount, contract adds fee
                durationSeconds
            );
            const receipt = await tx.wait();

            const event = receipt.logs
                .map((log: any) => {
                    try { return escrow.interface.parseLog(log); } catch { return null; }
                })
                .find((e: any) => e?.name === "TradeCreated");

            const tradeId = event ? Number(event.args.tradeId) : 0;
            return { txHash: receipt.hash, tradeId };
        } catch (err: any) {
            console.error("❌ createTrade failed:", err);
            throw err;
        }
    }

    /**
     * Relayer releases funds to Buyer (called when Seller confirms payment)
     */
    async relayerReleaseTrade(tradeId: number): Promise<string> {
        if (!env.ESCROW_CONTRACT_ADDRESS) throw new Error("Escrow not set");
        const signer = this.getAdminSigner();
        const escrow = new ethers.Contract(
            env.ESCROW_CONTRACT_ADDRESS,
            ["function release(uint256 tradeId)"],
            signer
        );

        const tx = await escrow.release(tradeId);
        const receipt = await tx.wait();
        return receipt.hash;
    }
}

export const wallet = new WalletService();
