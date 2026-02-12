import { ethers } from "ethers";
import { env } from "../config/env";

// Minimal ERC20 ABI for USDC interactions
const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
];

// P2PEscrow contract ABI (key functions only)
const ESCROW_ABI = [
    // Trade functions
    "function createTrade(address buyer, address token, uint256 amount, uint256 duration) returns (uint256)",
    "function markFiatSent(uint256 tradeId)",
    "function release(uint256 tradeId)",
    "function refund(uint256 tradeId)",
    "function autoRelease(uint256 tradeId)",
    "function raiseDispute(uint256 tradeId, string reason)",
    "function resolveDispute(uint256 tradeId, bool releaseToBuyer)",

    // View functions
    "function getTrade(uint256 tradeId) view returns (tuple(address seller, address buyer, address token, uint256 amount, uint256 feeAmount, uint256 buyerReceives, uint8 status, uint256 createdAt, uint256 deadline, uint256 fiatSentAt, uint256 autoReleaseDeadline, address disputeInitiator, string disputeReason))",
    "function tradeCounter() view returns (uint256)",
    "function calculateFee(uint256 amount) view returns (uint256 fee, uint256 netAmount)",
    "function isExpired(uint256 tradeId) view returns (bool)",
    "function getContractBalance(address token) view returns (uint256)",
    "function feeBps() view returns (uint256)",
    "function approvedTokens(address) view returns (bool)",

    // Events
    "event TradeCreated(uint256 indexed tradeId, address indexed seller, address indexed buyer, address token, uint256 amount, uint256 feeAmount, uint256 deadline)",
    "event FiatMarkedSent(uint256 indexed tradeId, address indexed buyer, uint256 autoReleaseDeadline)",
    "event TradeReleased(uint256 indexed tradeId, address indexed buyer, uint256 buyerReceives, uint256 feeAmount)",
    "event AutoReleased(uint256 indexed tradeId, address indexed buyer, uint256 buyerReceives, uint256 feeAmount)",
    "event TradeRefunded(uint256 indexed tradeId, address indexed seller, uint256 amount)",
    "event TradeDisputed(uint256 indexed tradeId, address indexed initiator, string reason)",
    "event DisputeResolved(uint256 indexed tradeId, address indexed resolver, bool releasedToBuyer)",
];

class EscrowService {
    private provider: ethers.JsonRpcProvider | null = null;
    private relayerWallet: ethers.Wallet | null = null;
    private escrowContract: ethers.Contract | null = null;
    private usdcContract: ethers.Contract | null = null;

    private getProvider(): ethers.JsonRpcProvider {
        if (!this.provider) {
            this.provider = new ethers.JsonRpcProvider(env.BASE_RPC_URL);
        }
        return this.provider;
    }

    private getRelayer(): ethers.Wallet {
        if (!this.relayerWallet) {
            if (!env.RELAYER_PRIVATE_KEY) {
                throw new Error("Relayer private key not configured");
            }
            this.relayerWallet = new ethers.Wallet(env.RELAYER_PRIVATE_KEY, this.getProvider());
        }
        return this.relayerWallet;
    }

    private getEscrowContract(): ethers.Contract {
        if (!this.escrowContract) {
            if (!env.ESCROW_CONTRACT_ADDRESS) {
                throw new Error("Escrow contract address not configured");
            }
            this.escrowContract = new ethers.Contract(
                env.ESCROW_CONTRACT_ADDRESS,
                ESCROW_ABI,
                this.getRelayer()
            );
        }
        return this.escrowContract;
    }

    private getUSDC(): ethers.Contract {
        if (!this.usdcContract) {
            this.usdcContract = new ethers.Contract(
                env.USDC_ADDRESS,
                ERC20_ABI,
                this.getRelayer()
            );
        }
        return this.usdcContract;
    }

    // ═══════════════════════════════════════
    //          READ FUNCTIONS
    // ═══════════════════════════════════════

    /**
     * Get USDC balance of an address
     */
    async getBalance(address: string): Promise<string> {
        const usdc = this.getUSDC();
        const balance = await usdc.balanceOf(address);
        return ethers.formatUnits(balance, 6); // USDC has 6 decimals
    }

    /**
     * Get escrow contract balance
     */
    async getEscrowBalance(): Promise<string> {
        const escrow = this.getEscrowContract();
        const balance = await escrow.getContractBalance(env.USDC_ADDRESS);
        return ethers.formatUnits(balance, 6);
    }

    /**
     * Get on-chain trade details
     */
    async getOnChainTrade(tradeId: number) {
        const escrow = this.getEscrowContract();
        const trade = await escrow.getTrade(tradeId);
        return {
            seller: trade.seller,
            buyer: trade.buyer,
            token: trade.token,
            amount: ethers.formatUnits(trade.amount, 6),
            feeAmount: ethers.formatUnits(trade.feeAmount, 6),
            buyerReceives: ethers.formatUnits(trade.buyerReceives, 6),
            status: Number(trade.status),
            createdAt: Number(trade.createdAt),
            deadline: Number(trade.deadline),
            fiatSentAt: Number(trade.fiatSentAt),
            autoReleaseDeadline: Number(trade.autoReleaseDeadline),
        };
    }

    /**
     * Check if a trade has expired
     */
    async isTradeExpired(tradeId: number): Promise<boolean> {
        const escrow = this.getEscrowContract();
        return await escrow.isExpired(tradeId);
    }

    /**
     * Calculate fee for an amount
     */
    async calculateFee(amount: number): Promise<{ fee: string; net: string }> {
        const escrow = this.getEscrowContract();
        const amountWei = ethers.parseUnits(amount.toString(), 6);
        const [fee, net] = await escrow.calculateFee(amountWei);
        return {
            fee: ethers.formatUnits(fee, 6),
            net: ethers.formatUnits(net, 6),
        };
    }

    // ═══════════════════════════════════════
    //        WRITE FUNCTIONS (Relayer)
    // ═══════════════════════════════════════

    /**
     * Release escrowed funds to buyer (called by relayer/bot)
     */
    async release(onChainTradeId: number): Promise<string> {
        const escrow = this.getEscrowContract();
        const tx = await escrow.release(onChainTradeId);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Refund escrowed funds to seller
     */
    async refund(onChainTradeId: number): Promise<string> {
        const escrow = this.getEscrowContract();
        const tx = await escrow.refund(onChainTradeId);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Auto-release to buyer (when seller ghosts after fiat sent)
     */
    async autoRelease(onChainTradeId: number): Promise<string> {
        const escrow = this.getEscrowContract();
        const tx = await escrow.autoRelease(onChainTradeId);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Resolve a dispute (admin only)
     */
    async resolveDispute(onChainTradeId: number, releaseToBuyer: boolean): Promise<string> {
        const escrow = this.getEscrowContract();
        const tx = await escrow.resolveDispute(onChainTradeId, releaseToBuyer);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    // ═══════════════════════════════════════
    //          EVENT LISTENERS
    // ═══════════════════════════════════════

    /**
     * Listen for escrow events (for real-time updates)
     */
    onTradeCreated(callback: (tradeId: number, seller: string, buyer: string, amount: string) => void) {
        const escrow = this.getEscrowContract();
        escrow.on("TradeCreated", (tradeId, seller, buyer, _token, amount) => {
            callback(Number(tradeId), seller, buyer, ethers.formatUnits(amount, 6));
        });
    }

    onTradeReleased(callback: (tradeId: number, buyer: string, amount: string) => void) {
        const escrow = this.getEscrowContract();
        escrow.on("TradeReleased", (tradeId, buyer, buyerReceives) => {
            callback(Number(tradeId), buyer, ethers.formatUnits(buyerReceives, 6));
        });
    }

    onAutoReleased(callback: (tradeId: number, buyer: string, amount: string) => void) {
        const escrow = this.getEscrowContract();
        escrow.on("AutoReleased", (tradeId, buyer, buyerReceives) => {
            callback(Number(tradeId), buyer, ethers.formatUnits(buyerReceives, 6));
        });
    }

    /**
     * Get the explorer URL for a transaction
     */
    getExplorerUrl(txHash: string): string {
        const base = env.IS_TESTNET
            ? "https://sepolia.basescan.org"
            : "https://basescan.org";
        return `${base}/tx/${txHash}`;
    }
}

export const escrow = new EscrowService();
