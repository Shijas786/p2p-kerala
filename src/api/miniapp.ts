// ═══════════════════════════════════════════════════════════════
//  MINI APP API — Express Router for Telegram Mini App
// ═══════════════════════════════════════════════════════════════

import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env";
import { db } from "../db/client";
import { wallet } from "../services/wallet";
import { escrow } from "../services/escrow";

const router = Router();

// ═══════════════════════════════════════════════════════════════
//  TELEGRAM INIT DATA VALIDATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
}

declare global {
    namespace Express {
        interface Request {
            telegramUser?: TelegramUser;
        }
    }
}

function validateInitData(req: Request, res: Response, next: NextFunction) {
    const initData = req.headers["x-telegram-init-data"] as string;

    // Dev mode bypass
    if (!initData && env.NODE_ENV === "development") {
        req.telegramUser = {
            id: 12345,
            first_name: "Developer",
            username: "dev_user",
        };
        return next();
    }

    if (!initData) {
        return res.status(401).json({ error: "Missing Telegram init data" });
    }

    try {
        const params = new URLSearchParams(initData);
        const hash = params.get("hash");
        params.delete("hash");

        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join("\n");

        const secretKey = crypto
            .createHmac("sha256", "WebAppData")
            .update(env.TELEGRAM_BOT_TOKEN)
            .digest();

        const calculatedHash = crypto
            .createHmac("sha256", secretKey)
            .update(dataCheckString)
            .digest("hex");

        if (calculatedHash !== hash) {
            if (env.NODE_ENV === "development") {
                const userStr = params.get("user");
                if (userStr) {
                    req.telegramUser = JSON.parse(userStr);
                    return next();
                }
            }
            return res.status(401).json({ error: "Invalid init data hash" });
        }

        const userStr = params.get("user");
        if (userStr) {
            req.telegramUser = JSON.parse(userStr);
        }

        const authDate = parseInt(params.get("auth_date") || "0");
        const now = Math.floor(Date.now() / 1000);
        if (now - authDate > 86400 && env.NODE_ENV !== "development") {
            return res.status(401).json({ error: "Auth data expired" });
        }

        next();
    } catch (err) {
        console.error("[MINIAPP] Auth error:", err);
        return res.status(401).json({ error: "Authentication failed" });
    }
}

router.use(validateInitData);

// ═══════════════════════════════════════════════════════════════
//  AUTH — Validate & return/create user
// ═══════════════════════════════════════════════════════════════

router.post("/auth", async (req: Request, res: Response) => {
    try {
        const tgUser = req.telegramUser;
        if (!tgUser) return res.status(401).json({ error: "No user" });

        // getOrCreateUser handles both lookup and creation
        const user = await db.getOrCreateUser(
            tgUser.id,
            tgUser.username,
            tgUser.first_name
        );

        // If user has no wallet yet (new user with bot wallet), derive one
        if (!user.wallet_address && ((user as any).wallet_type === 'bot' || !(user as any).wallet_type)) {
            try {
                const derived = wallet.deriveWallet(user.wallet_index);
                await db.updateUser(user.id, {
                    wallet_address: derived.address,
                    wallet_type: 'bot',
                } as any);
                user.wallet_address = derived.address;
                (user as any).wallet_type = 'bot';
                console.log(`[AUTH] Derived bot wallet for user ${user.id}: ${derived.address}`);
            } catch (walletErr: any) {
                console.error("[AUTH] Failed to derive wallet:", walletErr);
            }
        }

        res.json({ user });
    } catch (err: any) {
        console.error("[MINIAPP] Auth error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  WALLET — Balances, Send, Connect
// ═══════════════════════════════════════════════════════════════

router.get("/wallet/balances", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user?.wallet_address) {
            return res.json({ eth: "0", usdc: "0.00", usdt: "0.00", address: null, wallet_type: (user as any)?.wallet_type || 'bot' });
        }

        const balances = await wallet.getBalances(user.wallet_address);
        const vaultBaseUsdc = await escrow.getVaultBalance(user.wallet_address, env.USDC_ADDRESS, 'base');
        const vaultBscUsdc = await escrow.getVaultBalance(user.wallet_address, "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", 'bsc');
        // const vaultUsdt = await escrow.getVaultBalance(user.wallet_address, env.USDT_ADDRESS);

        res.json({
            ...balances,
            vault_base_usdc: vaultBaseUsdc,
            vault_bsc_usdc: vaultBscUsdc,
            // vault_usdt: vaultUsdt,
            wallet_type: (user as any).wallet_type || 'bot'
        });
    } catch (err: any) {
        console.error("[MINIAPP] Wallet balances error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/wallet/send", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user?.wallet_address) {
            return res.status(400).json({ error: "No wallet configured" });
        }

        // External wallets can't sign server-side
        if ((user as any).wallet_type === 'external') {
            return res.status(400).json({ error: "External wallets must send via your wallet app (MetaMask, etc.)" });
        }

        const { to, amount, token, chain } = req.body; // chain: 'base' | 'bsc'
        if (!to || !amount) {
            return res.status(400).json({ error: "Missing to/amount" });
        }

        if (amount <= 0 || amount > 100000) {
            return res.status(400).json({ error: "Invalid amount" });
        }

        const targetChain = chain || 'base';
        let txHash: string;

        if (token === "ETH" || token === "BNB") {
            txHash = await wallet.sendNative(user.wallet_index, to, amount, targetChain);
        } else {
            // Determine token address based on chain
            let tokenAddress = env.USDC_ADDRESS;
            if (targetChain === 'bsc') {
                tokenAddress = (token === "USDT") ? "0x55d398326f99059fF775485246999027B3197955" : "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
            } else {
                tokenAddress = (token === "USDT") ? env.USDT_ADDRESS : env.USDC_ADDRESS;
            }

            txHash = await wallet.sendToken(
                user.wallet_index,
                to,
                amount,
                tokenAddress,
                targetChain
            );
        }

        res.json({ txHash });
    } catch (err: any) {
        console.error("[MINIAPP] Send error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/wallet/connect", async (req: Request, res: Response) => {
    try {
        const { address } = req.body;
        if (!address) return res.status(400).json({ error: "Missing address" });

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: "Invalid Ethereum address" });
        }

        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        await db.updateUser(user.id, {
            wallet_address: address,
            wallet_type: 'external',
        } as any);

        res.json({ success: true });
    } catch (err: any) {
        console.error("[MINIAPP] Connect error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/wallet/bot", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const derived = wallet.deriveWallet(user.wallet_index);

        await db.updateUser(user.id, {
            wallet_address: derived.address,
            wallet_type: 'bot',
        } as any);

        res.json({ success: true, address: derived.address });
    } catch (err: any) {
        console.error("[MINIAPP] Switch to bot error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ═══ VAULT OPERATIONS (Custodial Wallets) ═══

router.post("/wallet/vault/deposit", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(401).json({ error: "Unauthorized" });
        if (user.wallet_type === 'external') return res.status(400).json({ error: "External wallets must deposit via frontend" });

        const { amount, token, chain } = req.body;
        if (!amount || !token) return res.status(400).json({ error: "Missing amount/token" });

        const targetChain = chain || 'base';
        let tokenAddress = env.USDC_ADDRESS;
        if (targetChain === 'bsc') {
            tokenAddress = (token === "USDT") ? "0x55d398326f99059fF775485246999027B3197955" : "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
        } else {
            tokenAddress = token === 'USDT' ? env.USDT_ADDRESS : env.USDC_ADDRESS;
        }

        const txHash = await wallet.depositToVault(user.wallet_index, amount.toString(), tokenAddress, targetChain);

        res.json({ txHash });
    } catch (err: any) {
        console.error("[MINIAPP] Vault deposit error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/wallet/vault/withdraw", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(401).json({ error: "Unauthorized" });
        if (user.wallet_type === 'external') return res.status(400).json({ error: "External wallets must withdraw via frontend" });

        const { amount, token, chain } = req.body;
        if (!amount || !token) return res.status(400).json({ error: "Missing amount/token" });

        const targetChain = chain || 'base';
        let tokenAddress = env.USDC_ADDRESS;
        if (targetChain === 'bsc') {
            tokenAddress = (token === "USDT") ? "0x55d398326f99059fF775485246999027B3197955" : "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
        } else {
            tokenAddress = token === 'USDT' ? env.USDT_ADDRESS : env.USDC_ADDRESS;
        }

        const txHash = await wallet.withdrawFromVault(user.wallet_index, amount.toString(), tokenAddress, targetChain);

        res.json({ txHash });
    } catch (err: any) {
        console.error("[MINIAPP] Vault withdraw error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  ORDERS — Browse, Create, Cancel
// ═══════════════════════════════════════════════════════════════

router.get("/orders", async (req: Request, res: Response) => {
    try {
        const type = req.query.type as string | undefined;
        const orders = await db.getActiveOrders(type, undefined, 20);
        res.json({ orders });
    } catch (err: any) {
        console.error("[MINIAPP] Orders error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get("/orders/mine", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.json({ orders: [] });

        const orders = await db.getUserOrders(user.id);
        res.json({ orders });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/orders", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(401).json({ error: "User not found" });

        const { type, token, amount, rate, payment_methods, expires_in, chain } = req.body;
        if (!type || !token || !amount || !rate) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const orderChain = chain || 'base';
        const parsedAmount = parseFloat(amount);
        const parsedRate = parseFloat(rate);

        // ... (existing checks)

        let expiresAt: string | undefined;
        if (expires_in) {
            const minutes = parseInt(expires_in);
            if (minutes > 0) {
                const now = new Date();
                now.setMinutes(now.getMinutes() + minutes);
                expiresAt = now.toISOString();
            }
        }

        // ═══ VALIDATION: Sell Orders ═══
        if (type === 'sell') {
            // 1. Vault only supports ERC20 (USDC/USDT)
            if (token !== 'USDC' && token !== 'USDT') {
                return res.status(400).json({ error: "Only USDC/USDT sell ads are supported on Mini App currently." });
            }

            // 2. Check Vault Balance (Anti-Scam / liquidity check)
            let tokenAddress = env.USDC_ADDRESS;
            if (orderChain === 'bsc') {
                tokenAddress = (token === "USDT") ? "0x55d398326f99059fF775485246999027B3197955" : "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
            } else {
                tokenAddress = (token === "USDT") ? env.USDT_ADDRESS : env.USDC_ADDRESS;
            }

            // Check if user has enough funds in Vault
            const balance = await escrow.getVaultBalance(user.wallet_address!, tokenAddress, orderChain as any);
            if (parseFloat(balance) < parsedAmount) {
                return res.status(400).json({
                    error: `Insufficient Vault Balance! You have ${balance} ${token}. Deposit ${parsedAmount - parseFloat(balance)} more to Vault.`
                });
            }
        }

        const order = await db.createOrder({
            user_id: user.id,
            type,
            token: token || "USDC",
            chain: orderChain,
            amount: parsedAmount,
            rate: parsedRate,
            fiat_currency: "INR",
            payment_methods: payment_methods || ["UPI"],
            // payment_details: {}, // Optional in schema
            expires_at: expiresAt
        });

        res.json({ order });
    } catch (err: any) {
        console.error("[MINIAPP] Create order error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/orders/:id/cancel", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(401).json({ error: "User not found" });

        const order = await db.getOrderById(req.params.id as string);
        if (!order) return res.status(404).json({ error: "Order not found" });
        if (order.user_id !== user.id) return res.status(403).json({ error: "Not your order" });

        await db.cancelOrder(req.params.id as string);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  TRADES — List, Create, Status Updates
// ═══════════════════════════════════════════════════════════════

router.get("/trades", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.json({ trades: [] });

        const trades = await db.getUserTrades(user.id);
        res.json({ trades });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/trades/:id", async (req: Request, res: Response) => {
    try {
        const trade = await db.getTradeById(req.params.id as string);
        if (!trade) return res.status(404).json({ error: "Trade not found" });
        res.json({ trade });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/trades", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(401).json({ error: "User not found" });

        const { order_id, amount } = req.body;
        if (!order_id) return res.status(400).json({ error: "Missing order_id" });

        const order = await db.getOrderById(order_id);
        if (!order) return res.status(404).json({ error: "Order not found" });
        if (order.status !== "active") return res.status(400).json({ error: "Order is no longer active" });

        // Prevent self-trade
        if (order.user_id === user.id) {
            return res.status(400).json({ error: "Cannot trade with your own order" });
        }

        const tradeAmount = amount || order.amount;
        if (tradeAmount <= 0 || tradeAmount > order.amount - (order.filled_amount || 0)) {
            return res.status(400).json({ error: "Invalid trade amount" });
        }

        // ═══ DETERMINE SELLER & BUYER ═══
        const sellerId = order.type === "sell" ? order.user_id : user.id;
        const buyerId = order.type === "sell" ? user.id : order.user_id;
        const seller = sellerId === user.id ? user : await db.getUserById(sellerId);
        const buyer = buyerId === user.id ? user : await db.getUserById(buyerId);

        if (!seller || !buyer) {
            return res.status(400).json({ error: "Could not find trade parties" });
        }

        // ═══ BALANCE CHECK: Verify seller still has enough funds ═══
        if (!seller.wallet_address) {
            return res.status(400).json({ error: "Seller has no wallet configured" });
        }

        // Vault only supports ERC20
        if (order.token !== 'USDC' && order.token !== 'USDT') {
            return res.status(400).json({ error: "Only USDC/USDT trades are supported via Vault." });
        }

        const tokenAddress = (order.token === "USDT") ? env.USDT_ADDRESS : env.USDC_ADDRESS;

        // Atomically fill the order to prevent double-matching
        const filled = await db.fillOrder(order_id, tradeAmount);
        if (!filled) {
            return res.status(409).json({ error: "Order already filled or no longer active" });
        }

        const fiatAmount = tradeAmount * order.rate;
        const feeAmount = tradeAmount * 0.005;
        const buyerReceives = tradeAmount - feeAmount;

        try {
            // ═══ ESCROW: Lock seller's funds on-chain ═══


            const sellerWalletType = (seller as any).wallet_type || 'bot';

            // ═══ P2P TRADING FLOW (VAULT BASED) ═══

            let escrowTxHash = "";
            let onChainTradeId = "";
            let lockedAt: string | null = null;

            // 1. Check Seller's Vault Balance
            try {
                let tokenAddress = env.USDC_ADDRESS;
                if (order.chain === 'bsc') {
                    tokenAddress = (order.token === "USDT") ? "0x55d398326f99059fF775485246999027B3197955" : "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
                } else {
                    tokenAddress = (order.token === "USDT") ? env.USDT_ADDRESS : env.USDC_ADDRESS;
                }

                const balance = await escrow.getVaultBalance(seller.wallet_address!, tokenAddress, order.chain as any);
                if (parseFloat(balance) < tradeAmount) {
                    return res.status(400).json({
                        error: `Seller (you?) has insufficient Vault balance (${balance}). Please Deposit ${tradeAmount} ${order.token} to Vault first.`
                    });
                }

                // 2. Relayer locks funds from Vault
                console.log(`[TRADES] Relayer creating trade for ${seller.wallet_address} -> ${buyer.wallet_address} on ${order.chain}`);
                const tradeIdStr = await escrow.createRelayedTrade(
                    seller.wallet_address!,
                    buyer.wallet_address!,
                    tokenAddress,
                    tradeAmount.toString(),
                    3600, // 1 hour
                    order.chain as any
                );
                onChainTradeId = tradeIdStr as any;

                escrowTxHash = "relayed_" + onChainTradeId;
                lockedAt = new Date().toISOString();

            } catch (err: any) {
                console.error("[MINIAPP] Relayed trade creation failed:", err);
                return res.status(500).json({ error: "Failed to create trade on-chain: " + err.message });
            }

            const trade = await db.createTrade({
                order_id,
                seller_id: seller.id,
                buyer_id: buyer.id,
                amount: tradeAmount,
                token: order.token,
                fiat_amount: fiatAmount as any,
                fiat_currency: "INR",
                rate: order.rate,
                status: "in_escrow", // Always in_escrow because usage of Vault
                escrow_tx_hash: escrowTxHash as any,
                on_chain_trade_id: onChainTradeId as any,
                escrow_locked_at: lockedAt as any,
            });

            res.json({ trade });
        } catch (tradeErr) {
            // Revert the fill if trade creation fails
            await db.revertFillOrder(order_id, tradeAmount);
            throw tradeErr;
        }
    } catch (err: any) {
        console.error("[MINIAPP] Create trade error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ═══ LOCK FUNDS (External Wallets) ═══
router.post("/trades/:id/lock", async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { txHash, tradeId } = req.body as { txHash: string; tradeId?: string }; // on-chain trade ID if available
        const user = await db.getUserByTelegramId(req.telegramUser!.id);

        if (!user) return res.status(401).json({ error: "Unauthorized" });

        const trade = await db.getTradeById(id);
        if (!trade) return res.status(404).json({ error: "Trade not found" });

        // Only seller can lock funds
        if (trade.seller_id !== user.id) {
            return res.status(403).json({ error: "Only the seller can lock funds" });
        }

        if (trade.status !== "waiting_for_escrow" && trade.status !== "matched") {
            return res.status(400).json({ error: "Trade is not waiting for lock" });
        }

        await db.updateTrade(id, {
            status: "in_escrow",
            escrow_tx_hash: txHash,
            on_chain_trade_id: tradeId ? parseInt(tradeId) : undefined,
            escrow_locked_at: new Date().toISOString(),
        });

        const updated = await db.getTradeById(id);
        res.json(updated);
    } catch (err: any) {
        console.error("[MINIAPP] Lock confirm error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/trades/:id/confirm-payment", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(401).json({ error: "User not found" });

        const trade = await db.getTradeById(req.params.id as string);
        if (!trade) return res.status(404).json({ error: "Trade not found" });
        if (trade.buyer_id !== user.id) return res.status(403).json({ error: "Only the buyer can confirm payment" });
        if (trade.status !== "in_escrow") return res.status(400).json({ error: "Trade not in escrow state" });

        await db.updateTrade(req.params.id as string, {
            status: "fiat_sent",
            fiat_sent_at: new Date().toISOString() as any,
            auto_release_at: new Date(Date.now() + parseInt(env.AUTO_RELEASE_SECONDS) * 1000).toISOString() as any,
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/trades/:id/confirm-receipt", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(401).json({ error: "User not found" });

        const trade = await db.getTradeById(req.params.id as string);
        if (!trade) return res.status(404).json({ error: "Trade not found" });
        if (trade.seller_id !== user.id) return res.status(403).json({ error: "Only the seller can confirm receipt" });
        if (trade.status !== "fiat_sent") return res.status(400).json({ error: "Buyer hasn't confirmed fiat sent yet" });

        // Release escrow on-chain if trade has on_chain_trade_id
        let releaseTxHash: string | null = null;
        if (trade.on_chain_trade_id) {
            try {
                releaseTxHash = await escrow.release(trade.on_chain_trade_id, trade.chain as any);
            } catch (escrowErr: any) {
                console.error("[MINIAPP] Escrow release failed:", escrowErr);
                return res.status(500).json({ error: "Failed to release escrow: " + escrowErr.message });
            }
        }

        await db.updateTrade(req.params.id as string, {
            status: "completed",
            fiat_confirmed_at: new Date().toISOString() as any,
            completed_at: new Date().toISOString() as any,
            release_tx_hash: releaseTxHash as any,
        });

        // Update trust scores for both parties
        await db.completeUserTrade(trade.buyer_id, true);
        await db.completeUserTrade(trade.seller_id, true);

        res.json({ success: true, release_tx_hash: releaseTxHash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/trades/:id/dispute", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(401).json({ error: "User not found" });

        const trade = await db.getTradeById(req.params.id as string);
        if (!trade) return res.status(404).json({ error: "Trade not found" });
        if (trade.buyer_id !== user.id && trade.seller_id !== user.id) {
            return res.status(403).json({ error: "Not a party to this trade" });
        }
        if (!['in_escrow', 'fiat_sent'].includes(trade.status)) {
            return res.status(400).json({ error: "Cannot dispute in current state" });
        }

        const { reason } = req.body;
        await db.updateTrade(req.params.id as string, {
            status: "disputed",
            dispute_reason: reason || "Dispute raised via Mini App",
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  PROFILE — Get & Update
// ═══════════════════════════════════════════════════════════════

router.get("/profile", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ user });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.put("/profile", async (req: Request, res: Response) => {
    try {
        const user = await db.getUserByTelegramId(req.telegramUser!.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const { upi_id } = req.body;
        if (upi_id !== undefined) {
            await db.updateUser(user.id, { upi_id } as any);
        }

        const updatedUser = await db.getUserByTelegramId(req.telegramUser!.id);
        res.json({ user: updatedUser });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  BRIDGE — Quote via LI.FI
// ═══════════════════════════════════════════════════════════════

router.post("/bridge/quote", async (req: Request, res: Response) => {
    try {
        const { fromChainId, toChainId, fromToken, toToken, amount } = req.body;

        const response = await fetch(
            `https://li.quest/v1/quote?fromChain=${fromChainId}&toChain=${toChainId}&fromToken=${fromToken === "USDC" ? "USDC" : fromToken}&toToken=${toToken === "USDC" ? "USDC" : toToken}&fromAmount=${amount}&fromAddress=0x0000000000000000000000000000000000000000`
        );

        if (!response.ok) {
            throw new Error("Failed to get bridge quote");
        }

        const quote = await response.json();
        res.json(quote);
    } catch (err: any) {
        console.error("[MINIAPP] Bridge quote error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
//  STATS — Platform Stats
// ═══════════════════════════════════════════════════════════════

router.get("/stats", async (req: Request, res: Response) => {
    try {
        const stats = await db.getStats();
        res.json({
            total_users: stats.total_users,
            total_volume_usdc: stats.total_volume_usdc || 0,
            active_orders: stats.active_orders,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export { router as miniappRouter };
