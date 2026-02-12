import axios from "axios";
import { env } from "../config/env";

const LIFI_API = "https://li.quest/v1";
const INTEGRATOR = "p2pkerala";

export interface LiFiQuote {
    id: string;
    fromChainId: number;
    toChainId: number;
    fromToken: { symbol: string; address: string; decimals: number };
    toToken: { symbol: string; address: string; decimals: number };
    fromAmount: string;
    toAmount: string;
    estimatedGas: string;
    bridgeProvider: string;
    estimatedTime: number;
    feeCost: string;
}

class BridgeService {
    /**
     * Get a bridge quote from LI.FI
     */
    async getQuote(params: {
        fromChainId: number;
        toChainId: number;
        fromTokenAddress: string;
        toTokenAddress: string;
        fromAmount: string;
        fromAddress: string;
        toAddress?: string;
    }): Promise<any> {
        try {
            const res = await axios.get(`${LIFI_API}/quote`, {
                params: {
                    fromChain: params.fromChainId,
                    toChain: params.toChainId,
                    fromToken: params.fromTokenAddress,
                    toToken: params.toTokenAddress,
                    fromAmount: params.fromAmount,
                    fromAddress: params.fromAddress,
                    toAddress: params.toAddress || params.fromAddress,
                    integrator: INTEGRATOR,
                    fee: 0.003, // 0.3% integrator fee
                },
                timeout: 15000,
            });
            return res.data;
        } catch (error: any) {
            console.error("LI.FI quote error:", error.response?.data || error.message);
            throw new Error("Failed to get bridge quote");
        }
    }

    /**
     * Get multiple route options
     */
    async getRoutes(params: {
        fromChainId: number;
        toChainId: number;
        fromTokenAddress: string;
        toTokenAddress: string;
        fromAmount: string;
        fromAddress: string;
    }): Promise<any[]> {
        try {
            const res = await axios.post(`${LIFI_API}/advanced/routes`, {
                fromChainId: params.fromChainId,
                toChainId: params.toChainId,
                fromTokenAddress: params.fromTokenAddress,
                toTokenAddress: params.toTokenAddress,
                fromAmount: params.fromAmount,
                fromAddress: params.fromAddress,
                options: {
                    integrator: INTEGRATOR,
                    fee: 0.003,
                    slippage: 0.03,
                    order: "RECOMMENDED",
                },
            }, { timeout: 15000 });
            return res.data?.routes || [];
        } catch (error: any) {
            console.error("LI.FI routes error:", error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Get supported chains
     */
    async getChains(): Promise<any[]> {
        try {
            const res = await axios.get(`${LIFI_API}/chains`, { timeout: 10000 });
            return res.data?.chains || [];
        } catch (error) {
            console.error("LI.FI chains error:", error);
            return [];
        }
    }

    /**
     * Get tokens on a specific chain
     */
    async getTokens(chainId: number): Promise<any[]> {
        try {
            const res = await axios.get(`${LIFI_API}/tokens`, {
                params: { chains: chainId },
                timeout: 10000,
            });
            return res.data?.tokens?.[chainId] || [];
        } catch (error) {
            console.error("LI.FI tokens error:", error);
            return [];
        }
    }

    /**
     * Check bridge transaction status
     */
    async getStatus(params: {
        txHash: string;
        bridge: string;
        fromChain: number;
        toChain: number;
    }): Promise<any> {
        try {
            const res = await axios.get(`${LIFI_API}/status`, {
                params,
                timeout: 10000,
            });
            return res.data;
        } catch (error) {
            console.error("LI.FI status error:", error);
            return null;
        }
    }

    /**
     * Format a bridge quote for Telegram display
     */
    formatQuote(quote: any): string {
        const fromAmount = parseFloat(quote.estimate?.fromAmount || quote.fromAmount || "0");
        const toAmount = parseFloat(quote.estimate?.toAmount || quote.toAmount || "0");
        const gasCost = quote.estimate?.gasCosts?.[0]?.amountUSD || "?";
        const time = quote.estimate?.executionDuration || 0;

        return [
            "🌉 *Bridge Quote*",
            "",
            `📤 From: ${(fromAmount / 1e6).toFixed(2)} ${quote.action?.fromToken?.symbol || "?"}`,
            `📥 To: ~${(toAmount / 1e6).toFixed(2)} ${quote.action?.toToken?.symbol || "?"}`,
            `⛽ Gas: ~$${gasCost}`,
            `⏱ Time: ~${Math.ceil(time / 60)} min`,
            `🔗 Bridge: ${quote.tool || "Best route"}`,
        ].join("\n");
    }
}

export const bridge = new BridgeService();
