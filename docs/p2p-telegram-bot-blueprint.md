# 🤖 P2P Kerala Bot — Automated Telegram P2P Exchange

> **Concept**: A Telegram-based peer-to-peer crypto exchange (like Binance P2P) powered by  
> Coinbase Agentic Wallet (escrow), LI.FI (bridging), OpenAI (conversational AI), with 0.5% admin fee.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [How It Works — User Journey](#2-how-it-works--user-journey)
3. [System Architecture](#3-system-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Core Features](#5-core-features)
6. [Trade Flow — Detailed](#6-trade-flow--detailed)
7. [Fee Structure](#7-fee-structure)
8. [Agentic Wallet Integration](#8-agentic-wallet-integration)
9. [LI.FI Bridge Integration](#9-lifi-bridge-integration)
10. [OpenAI Integration](#10-openai-integration)
11. [Database Schema](#11-database-schema)
12. [Telegram Bot Commands](#12-telegram-bot-commands)
13. [Security & Trust](#13-security--trust)
14. [Escrow Mechanism](#14-escrow-mechanism)
15. [Dispute Resolution](#15-dispute-resolution)
16. [Revenue Model](#16-revenue-model)
17. [Directory Structure](#17-directory-structure)
18. [Implementation Phases](#18-implementation-phases)
19. [Risk Mitigation](#19-risk-mitigation)
20. [Future Expansions](#20-future-expansions)

---

## 1. Product Vision

### The Problem
People in Kerala (and India) want to buy/sell crypto with INR but face:
- Exchange restrictions and KYC hassles
- High fees on centralized exchanges
- Limited fiat on/off ramp options
- No easy way to do cross-chain trades

### The Solution
**P2P Kerala Bot** — A Telegram bot where:
- 🇮🇳 **Sellers** list crypto offers (e.g., "Selling 100 USDC at ₹88/USDC via UPI")
- 💰 **Buyers** browse offers and initiate trades
- 🔒 **Escrow** (Agentic Wallet) holds seller's crypto during fiat transfer
- 🌉 **Cross-chain** support via LI.FI (buy ETH on Ethereum, pay with USDC on Base)
- 🤖 **AI-powered** conversational interface (no need to memorize commands)
- 💸 **Admin earns 0.5%** on every successful transaction

### Tagline
> *"P2P Made Simple. AI Made It Smarter."*

---

## 2. How It Works — User Journey

### Seller Journey
```
1. /start → Bot greets, AI guides through setup
2. "I want to sell 100 USDC at ₹88" → AI parses intent
3. Bot creates sell order → Listed in order book
4. Buyer matches → Seller's 100 USDC locked in escrow
5. Buyer sends ₹8,800 via UPI → Marks as paid
6. Seller confirms ₹8,800 received → Releases escrow
7. Bot sends 99.5 USDC to buyer (0.5 USDC fee to admin)
8. ✅ Trade complete!
```

### Buyer Journey
```
1. /buy → See all active sell offers
2. "Buy 50 USDC from @seller_name" → AI matches order
3. Bot shows payment details (UPI ID, amount: ₹4,400)
4. Buyer sends fiat → Clicks "I've Paid ✅"
5. Waits for seller confirmation
6. Receives 49.75 USDC (after 0.5% fee)
7. Optional: "Bridge my USDC to Ethereum" → LI.FI bridges it
```

### Cross-Chain Journey
```
1. Buyer: "I want to buy ETH on Arbitrum"
2. Seller has USDC on Base
3. Trade completes → USDC goes to escrow
4. Buyer: "Bridge 50 USDC to ETH on Arbitrum"
5. Bot uses LI.FI to bridge + swap
6. Buyer receives ETH on Arbitrum 🎉
```

---

## 3. System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        TELEGRAM USERS                              │
│                  (Buyers, Sellers, Admin)                           │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                    Telegram Bot API
                             │
┌────────────────────────────▼───────────────────────────────────────┐
│                     TELEGRAM BOT (grammY)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐              │
│  │ Command       │ │ Conversation │ │ Inline        │              │
│  │ Handlers      │ │ Manager      │ │ Keyboards     │              │
│  └──────┬───────┘ └──────┬───────┘ └───────┬───────┘              │
│         └────────────────┼─────────────────┘                       │
│                          │                                         │
│                   ┌──────▼──────┐                                  │
│                   │  OpenAI     │ ← Natural language processing    │
│                   │  GPT-4o    │ ← Intent detection & responses    │
│                   └──────┬──────┘                                  │
│                          │                                         │
│              ┌───────────┼───────────┐                             │
│              │           │           │                             │
│     ┌────────▼──┐ ┌──────▼────┐ ┌───▼──────────┐                  │
│     │  Order    │ │  Trade    │ │  Bridge      │                   │
│     │  Manager  │ │  Engine   │ │  Manager     │                   │
│     └────┬──────┘ └────┬──────┘ └────┬─────────┘                  │
│          │             │             │                              │
└──────────┼─────────────┼─────────────┼─────────────────────────────┘
           │             │             │
    ┌──────▼──────┐ ┌────▼──────┐ ┌───▼──────────┐
    │  Supabase   │ │  Agentic  │ │  LI.FI API   │
    │  Database   │ │  Wallet   │ │  (Bridge)    │
    │             │ │  (Escrow) │ │              │
    └─────────────┘ └───────────┘ └──────────────┘
```

### Data Flow for a Trade

```
Seller creates offer
       │
       ▼
┌─ Order stored in Supabase ─┐
│  status: "active"           │
│  token: USDC               │
│  amount: 100               │
│  rate: ₹88                 │
│  payment: UPI              │
└─────────────┬──────────────┘
              │ Buyer matches
              ▼
┌─ Escrow initiated ──────────┐
│  Seller's USDC → Escrow     │
│  awal send <amount> <escrow>│
│  status: "in_escrow"        │
└─────────────┬───────────────┘
              │ Buyer pays fiat
              ▼
┌─ Payment confirmed ─────────┐
│  Seller confirms receipt     │
│  status: "fiat_received"     │
└─────────────┬───────────────┘
              │ Auto-release
              ▼
┌─ Escrow released ───────────┐
│  99.5 USDC → Buyer          │
│  0.5 USDC → Admin wallet    │
│  status: "completed"        │
└─────────────────────────────┘
```

---

## 4. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Bot Framework** | [grammY](https://grammy.dev/) | Modern, TypeScript-first, scalable, great plugin ecosystem |
| **Runtime** | Node.js 24+ | Required by Agentic Wallet (`awal`) |
| **Language** | TypeScript | Type safety for financial operations |
| **AI** | OpenAI GPT-4o | Intent parsing, conversational UI, dispute assistance |
| **Escrow** | Coinbase Agentic Wallet (`awal` CLI) | Gasless, secure, email-auth, USDC native |
| **Bridging** | LI.FI SDK / REST API | Multi-chain bridge aggregator (30+ bridges, 30+ chains) |
| **Database** | Supabase (PostgreSQL) | Real-time, Row Level Security, easy to use |
| **Cache** | Redis | Session management, rate limiting, real-time data |
| **Hosting** | Railway / Fly.io / VPS | Long-running bot process |
| **Monitoring** | Sentry + custom logs | Error tracking, trade auditing |

### Key npm Packages
```json
{
  "dependencies": {
    "grammy": "^1.x",
    "@grammyjs/conversations": "^1.x",
    "@grammyjs/menu": "^1.x",
    "@grammyjs/session": "^1.x",
    "openai": "^4.x",
    "@lifi/sdk": "^3.x",
    "@supabase/supabase-js": "^2.x",
    "awal": "latest",
    "ethers": "^6.x",
    "ioredis": "^5.x",
    "zod": "^3.x",
    "dotenv": "^16.x"
  }
}
```

---

## 5. Core Features

### 📊 P2P Order Book
- **Create sell orders**: Set token, amount, rate (INR/USD), payment method
- **Create buy orders**: Request specific tokens at desired rates
- **Auto-matching**: AI suggests best matches based on price and trust score
- **Order types**: Market (best rate), Limit (specific rate), Bulk

### 🔒 Escrow System
- Seller's crypto locked in Agentic Wallet during trade
- Time-limited escrow (15-30 min default)
- Auto-cancel if fiat not sent within timeout
- Auto-release on seller confirmation

### 🌉 Cross-Chain Bridge
- Bridge any token across 30+ chains via LI.FI
- Quote comparison across bridges
- One-click bridge after trade completion
- Supported: Base, Ethereum, Arbitrum, Polygon, Optimism, BSC, etc.

### 🤖 AI-Powered Interface
- Natural language trade creation ("Sell 100 USDC for INR at 88")
- Smart intent detection (buy, sell, bridge, check balance, etc.)
- Guided flows for new users
- Dispute assistance and evidence analysis

### 💸 Fee System
- 0.5% fee on every completed trade
- Fee split: 0.25% from buyer + 0.25% from seller (or full 0.5% from one side)
- Configurable fee tiers (VIP users get lower fees)
- Fee collected in USDC → admin wallet

### 👤 User Profiles
- Trade history and completion rate
- Trust score (based on completed trades)
- Verification levels
- Payment methods linked

### 🛡️ Dispute Resolution
- AI-assisted dispute analysis
- Admin arbitration system
- Evidence submission (screenshots, payment receipts)
- Automatic refund on verified disputes

---

## 6. Trade Flow — Detailed

### State Machine

```
                  ┌──────────┐
                  │  CREATED  │ ← Sell order posted
                  └────┬─────┘
                       │ Buyer matches
                  ┌────▼──────┐
                  │  MATCHED  │ ← Buyer reserved the order
                  └────┬──────┘
                       │ Seller deposits to escrow
                  ┌────▼──────────┐
                  │  IN_ESCROW    │ ← Crypto locked
                  └────┬──────────┘
                       │ Buyer sends fiat
                  ┌────▼──────────────┐
                  │  FIAT_SENT        │ ← Buyer marks as paid
                  └────┬──────────────┘
                       │ Seller confirms fiat receipt
                  ┌────▼──────────────┐
         ┌────────│  FIAT_CONFIRMED   │────────┐
         │        └───────────────────┘        │
         │ Release                    │ Dispute
    ┌────▼─────┐                ┌─────▼──────┐
    │ RELEASING│                │ DISPUTED   │
    └────┬─────┘                └─────┬──────┘
         │                            │
    ┌────▼──────┐              ┌──────▼──────┐
    │ COMPLETED │              │  RESOLVED   │
    └───────────┘              └─────────────┘
                                     │
                              ┌──────┴──────┐
                        ┌─────▼────┐  ┌─────▼────┐
                        │ REFUNDED │  │ RELEASED │
                        └──────────┘  └──────────┘

   Also possible at any pre-FIAT_SENT stage:
    ┌──────────┐
    │ CANCELLED│ ← Timeout or manual cancel
    └──────────┘
    ┌──────────┐
    │ EXPIRED  │ ← Escrow timeout
    └──────────┘
```

### Timeouts
| Stage | Timeout | Action |
|-------|---------|--------|
| Matched → Escrow | 5 min | Auto-cancel, re-list order |
| Escrow → Fiat Sent | 30 min | Auto-cancel, return to seller |
| Fiat Sent → Confirmed | 60 min | Auto-escalate to admin |
| Disputed | 24 hours | Admin must resolve |

---

## 7. Fee Structure

### Standard Fee: 0.5% per trade

```
Trade: 100 USDC @ ₹88/USDC

Seller deposits:    100.00 USDC → Escrow
Buyer pays:         ₹8,800 INR → Seller (via UPI/Bank)

On completion:
  → Buyer receives:    99.50 USDC (100 - 0.5%)
  → Admin receives:     0.50 USDC (0.5% fee)
  → Seller receives:   ₹8,800 INR (full fiat amount)
```

### Fee Tiers (Future)

| Tier | Requirement | Fee |
|------|------------|-----|
| Standard | Default | 0.50% |
| Silver | 10+ trades | 0.40% |
| Gold | 50+ trades | 0.30% |
| VIP | 200+ trades | 0.20% |

### Bridge Fees (LI.FI)
- LI.FI has its own bridge/swap fees (varies by route)
- We can add an additional 0.1-0.3% markup on bridges for revenue
- The `integratorFee` param in LI.FI lets you set your fee

---

## 8. Agentic Wallet Integration

### Architecture: 3 Wallets

```
┌──────────────────────────────────────────┐
│           AGENTIC WALLET SETUP           │
├──────────────────────────────────────────┤
│                                          │
│  1. ESCROW WALLET                        │
│     └── Email: escrow@p2pkerala.com      │
│     └── Holds crypto during trades       │
│     └── Automated deposit/release        │
│                                          │
│  2. ADMIN/FEE WALLET                     │
│     └── Email: admin@p2pkerala.com       │
│     └── Collects 0.5% fees              │
│     └── Revenue wallet                   │
│                                          │
│  3. BRIDGE WALLET (optional)             │
│     └── Email: bridge@p2pkerala.com      │
│     └── Holds tokens during bridging     │
│     └── Temporary holding                │
│                                          │
└──────────────────────────────────────────┘
```

### Key Operations via `awal` CLI

```bash
# ---- ESCROW OPERATIONS ----

# Lock seller's crypto (seller sends to escrow)
# Seller runs this or bot triggers it:
npx awal send <amount> <escrow_wallet_address> --json

# Release to buyer (on successful trade)
npx awal send <amount - fee> <buyer_address> --json

# Collect fee (send to admin wallet)
npx awal send <fee_amount> <admin_wallet_address> --json

# Refund to seller (on cancelled/disputed trade)
npx awal send <amount> <seller_address> --json

# ---- STATUS CHECKS ----
npx awal balance --json    # Check escrow balance
npx awal status --json     # Check auth status
npx awal address --json    # Get wallet addresses
```

### Programmatic Integration (Node.js)

```typescript
import { execSync } from "child_process";

class AgenticWalletService {
  // Execute awal command and parse JSON result
  private exec(command: string): any {
    const result = execSync(`npx awal ${command} --json`, {
      encoding: "utf-8",
    });
    return JSON.parse(result);
  }

  // Lock crypto in escrow
  async lockInEscrow(amount: number, chain = "base") {
    return this.exec(`send ${amount} ${ESCROW_ADDRESS} --chain ${chain}`);
  }

  // Release from escrow to buyer
  async releaseTobuyer(amount: number, buyerAddress: string) {
    const fee = amount * 0.005; // 0.5%
    const buyerAmount = amount - fee;

    // Send to buyer
    const buyerTx = this.exec(`send ${buyerAmount} ${buyerAddress}`);

    // Send fee to admin
    const feeTx = this.exec(`send ${fee} ${ADMIN_ADDRESS}`);

    return { buyerTx, feeTx };
  }

  // Refund to seller
  async refundToSeller(amount: number, sellerAddress: string) {
    return this.exec(`send ${amount} ${sellerAddress}`);
  }

  // Check balance
  async getBalance() {
    return this.exec("balance");
  }

  // Trade tokens (e.g., convert fee earnings)
  async tradeTokens(amount: number, from: string, to: string) {
    return this.exec(`trade ${amount} ${from} ${to}`);
  }
}
```

---

## 9. LI.FI Bridge Integration

### Why LI.FI?
- **30+ bridges** aggregated (Stargate, Hop, Across, etc.)
- **30+ chains** supported
- **Best route** selection (cheapest, fastest)
- **REST API** — no SDK bugs, simple HTTP calls
- **Integrator fee** — earn revenue on bridges

### LI.FI REST API Integration

```typescript
import axios from "axios";

const LIFI_API = "https://li.quest/v1";
const INTEGRATOR = "p2pkerala"; // Register at li.fi

interface BridgeQuote {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  route: any;
}

class LiFiBridgeService {

  // Get available chains
  async getChains() {
    const res = await axios.get(`${LIFI_API}/chains`);
    return res.data.chains;
  }

  // Get available tokens on a chain
  async getTokens(chainId: number) {
    const res = await axios.get(`${LIFI_API}/tokens`, {
      params: { chains: chainId },
    });
    return res.data.tokens;
  }

  // Get bridge quote
  async getQuote(params: {
    fromChain: number;
    toChain: number;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    toAddress: string;
  }): Promise<BridgeQuote> {
    const res = await axios.get(`${LIFI_API}/quote`, {
      params: {
        ...params,
        integrator: INTEGRATOR,
        fee: 0.003, // 0.3% integrator fee
      },
    });
    return res.data;
  }

  // Get multiple route options
  async getRoutes(params: {
    fromChainId: number;
    toChainId: number;
    fromTokenAddress: string;
    toTokenAddress: string;
    fromAmount: string;
    fromAddress: string;
    toAddress: string;
  }) {
    const res = await axios.post(`${LIFI_API}/advanced/routes`, {
      ...params,
      options: {
        integrator: INTEGRATOR,
        fee: 0.003,
        slippage: 0.03, // 3% max slippage
        order: "RECOMMENDED",
      },
    });
    return res.data.routes;
  }

  // Execute bridge transaction (returns tx data to sign)
  async getStepTransaction(step: any) {
    const res = await axios.post(`${LIFI_API}/advanced/stepTransaction`, {
      ...step,
    });
    return res.data;
  }

  // Check transaction status
  async getStatus(txHash: string, bridge: string, fromChain: number, toChain: number) {
    const res = await axios.get(`${LIFI_API}/status`, {
      params: { txHash, bridge, fromChain, toChain },
    });
    return res.data;
  }
}
```

### Supported Chains (Key Ones)

| Chain | Chain ID | Tokens |
|-------|----------|--------|
| Base | 8453 | USDC, ETH, WETH |
| Ethereum | 1 | USDC, ETH, USDT, DAI |
| Arbitrum | 42161 | USDC, ETH, ARB |
| Polygon | 137 | USDC, MATIC, USDT |
| Optimism | 10 | USDC, ETH, OP |
| BSC | 56 | USDC, BNB, BUSD |
| Avalanche | 43114 | USDC, AVAX |
| Solana | 1151111081099710 | USDC, SOL |

### Bridge Flow in Telegram

```
User: "Bridge 50 USDC from Base to Ethereum"

Bot: 🌉 Bridge Quote:
     ├── From: 50 USDC (Base)
     ├── To: ~49.85 USDC (Ethereum)
     ├── Bridge: Stargate
     ├── Gas: ~$0.50
     ├── Time: ~2 min
     ├── Fee: 0.3% ($0.15)
     └── Total cost: ~$0.65

     [✅ Bridge Now] [🔄 More Routes] [❌ Cancel]

User: [✅ Bridge Now]

Bot: ⏳ Bridging in progress...
     TX: 0xabc123...

Bot: ✅ Bridge complete!
     Received 49.85 USDC on Ethereum
     TX: 0xdef456...
```

---

## 10. OpenAI Integration

### Purpose
Transform the bot from a command-based interface to a **conversational AI assistant** that understands natural language.

### Intent Detection System

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are P2P Kerala Bot, a crypto P2P trading assistant on Telegram.
You help users buy/sell crypto with fiat (INR), bridge tokens across chains, and manage trades.

Your capabilities:
1. CREATE_SELL_ORDER - User wants to sell crypto
2. CREATE_BUY_ORDER - User wants to buy crypto
3. VIEW_ORDERS - User wants to see available orders
4. MATCH_ORDER - User wants to take an existing order
5. CONFIRM_PAYMENT - User confirms fiat payment sent
6. CONFIRM_RECEIPT - Seller confirms fiat received
7. BRIDGE_TOKENS - User wants to bridge tokens across chains
8. CHECK_BALANCE - User wants to check their wallet balance
9. CHECK_STATUS - User wants to check a trade status
10. DISPUTE - User wants to raise a dispute
11. HELP - User needs help or information
12. PROFILE - User wants to see their profile/stats

Respond with JSON:
{
  "intent": "INTENT_NAME",
  "confidence": 0.0-1.0,
  "params": { ... extracted parameters ... },
  "response": "Human-friendly response to show the user"
}

For amounts, parse both:
- "100 USDC" → { token: "USDC", amount: 100 }
- "₹8800" → { fiat: "INR", amount: 8800 }

For rates, parse:
- "at 88" → { rate: 88, rateCurrency: "INR" }
- "at $1" → { rate: 1, rateCurrency: "USD" }
`;

async function parseUserIntent(message: string, context?: any) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...(context?.history || []),
      { role: "user", content: message },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  return JSON.parse(completion.choices[0].message.content);
}
```

### Example Intent Parsing

| User Says | Detected Intent | Extracted Params |
|-----------|----------------|-----------------|
| "I want to sell 100 USDC for INR" | `CREATE_SELL_ORDER` | `{ token: "USDC", amount: 100, fiat: "INR" }` |
| "Show me all buy orders" | `VIEW_ORDERS` | `{ type: "buy" }` |
| "Send 50 bucks to vitalik.eth" | `CREATE_SELL_ORDER` | `{ token: "USDC", amount: 50, recipient: "vitalik.eth" }` |
| "Bridge my USDC to Arbitrum" | `BRIDGE_TOKENS` | `{ token: "USDC", toChain: "arbitrum" }` |
| "He didn't send the money" | `DISPUTE` | `{ reason: "fiat_not_received" }` |
| "How does this work?" | `HELP` | `{}` |

### AI-Powered Dispute Resolution

```typescript
async function analyzeDispute(trade: Trade, evidence: string[]) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a fair dispute arbitrator for a P2P crypto exchange.
                  Analyze the evidence and recommend a resolution.
                  Consider: timestamps, payment proofs, user history, trade terms.`,
      },
      {
        role: "user",
        content: `Trade Details:
          - Amount: ${trade.amount} ${trade.token}
          - Rate: ₹${trade.rate}
          - Buyer: ${trade.buyerUsername} (${trade.buyerTradeCount} trades, ${trade.buyerRating}% rating)
          - Seller: ${trade.sellerUsername} (${trade.sellerTradeCount} trades, ${trade.sellerRating}% rating)
          - Status: ${trade.status}
          - Evidence: ${evidence.join("\n")}

          Recommend: RELEASE_TO_BUYER, REFUND_TO_SELLER, or NEEDS_ADMIN`,
      },
    ],
  });

  return completion.choices[0].message.content;
}
```

---

## 11. Database Schema (Supabase/PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  wallet_address TEXT,                    -- Their external wallet address
  agentic_wallet_email TEXT,             -- Agentic wallet email if they use it
  upi_id TEXT,                           -- Default UPI ID
  bank_details JSONB,                    -- Bank account details
  trade_count INTEGER DEFAULT 0,
  completed_trades INTEGER DEFAULT 0,
  trust_score DECIMAL(5,2) DEFAULT 100.0,
  tier TEXT DEFAULT 'standard',          -- standard, silver, gold, vip
  is_verified BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table (the order book)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  token TEXT NOT NULL DEFAULT 'USDC',    -- USDC, ETH, etc.
  chain TEXT DEFAULT 'base',             -- base, ethereum, arbitrum
  amount DECIMAL(18,6) NOT NULL,
  min_amount DECIMAL(18,6),              -- Min trade amount
  max_amount DECIMAL(18,6),              -- Max trade amount
  rate DECIMAL(12,2) NOT NULL,           -- Rate in fiat
  fiat_currency TEXT DEFAULT 'INR',
  payment_methods TEXT[] DEFAULT '{"UPI"}',  -- UPI, Bank, PayTM, etc.
  payment_details JSONB,                 -- UPI ID, bank details
  status TEXT DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'filled', 'cancelled', 'expired')
  ),
  filled_amount DECIMAL(18,6) DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trades table (individual P2P trades)
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  token TEXT NOT NULL,
  chain TEXT DEFAULT 'base',
  amount DECIMAL(18,6) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  fiat_amount DECIMAL(12,2) NOT NULL,    -- amount * rate
  fiat_currency TEXT DEFAULT 'INR',
  fee_amount DECIMAL(18,6) NOT NULL,     -- 0.5% fee
  fee_percentage DECIMAL(5,4) DEFAULT 0.005,
  buyer_receives DECIMAL(18,6) NOT NULL, -- amount - fee
  payment_method TEXT,
  escrow_tx_hash TEXT,                   -- TX when locked in escrow
  release_tx_hash TEXT,                  -- TX when released to buyer
  fee_tx_hash TEXT,                      -- TX when fee sent to admin
  status TEXT DEFAULT 'created' CHECK (
    status IN (
      'created', 'matched', 'in_escrow', 'fiat_sent',
      'fiat_confirmed', 'releasing', 'completed',
      'disputed', 'resolved', 'refunded', 'cancelled', 'expired'
    )
  ),
  escrow_locked_at TIMESTAMPTZ,
  fiat_sent_at TIMESTAMPTZ,
  fiat_confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  dispute_reason TEXT,
  dispute_evidence JSONB,
  resolution TEXT,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bridge transactions
CREATE TABLE bridge_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  trade_id UUID REFERENCES trades(id),    -- Optional link to a trade
  from_chain TEXT NOT NULL,
  to_chain TEXT NOT NULL,
  from_token TEXT NOT NULL,
  to_token TEXT NOT NULL,
  from_amount DECIMAL(18,8) NOT NULL,
  to_amount DECIMAL(18,8),
  bridge_provider TEXT,                   -- Stargate, Hop, Across, etc.
  lifi_route_id TEXT,
  source_tx_hash TEXT,
  destination_tx_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  fee_amount DECIMAL(18,8),
  estimated_time INTEGER,                -- Seconds
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fee collection tracking
CREATE TABLE fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id),
  amount DECIMAL(18,6) NOT NULL,
  token TEXT DEFAULT 'USDC',
  chain TEXT DEFAULT 'base',
  tx_hash TEXT,
  collected_at TIMESTAMPTZ DEFAULT now()
);

-- Chat/message logs (for disputes)
CREATE TABLE trade_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id),
  user_id UUID REFERENCES users(id),
  message TEXT,
  message_type TEXT DEFAULT 'text',       -- text, image, payment_proof
  file_id TEXT,                           -- Telegram file ID for images
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin activity log
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_telegram_id BIGINT,
  action TEXT NOT NULL,
  trade_id UUID REFERENCES trades(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type_status ON orders(type, status);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_buyer ON trades(buyer_id);
CREATE INDEX idx_trades_seller ON trades(seller_id);
CREATE INDEX idx_users_telegram ON users(telegram_id);
CREATE INDEX idx_bridge_user ON bridge_transactions(user_id);

-- RPC function: Get active order book
CREATE OR REPLACE FUNCTION get_order_book(
  p_type TEXT DEFAULT NULL,
  p_token TEXT DEFAULT 'USDC',
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  order_id UUID,
  username TEXT,
  type TEXT,
  token TEXT,
  amount DECIMAL,
  rate DECIMAL,
  payment_methods TEXT[],
  trust_score DECIMAL,
  trade_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    u.username,
    o.type,
    o.token,
    o.amount - o.filled_amount AS available_amount,
    o.rate,
    o.payment_methods,
    u.trust_score,
    u.completed_trades
  FROM orders o
  JOIN users u ON o.user_id = u.id
  WHERE o.status = 'active'
    AND (p_type IS NULL OR o.type = p_type)
    AND o.token = p_token
    AND o.amount > o.filled_amount
  ORDER BY
    CASE WHEN o.type = 'sell' THEN o.rate END ASC,
    CASE WHEN o.type = 'buy' THEN o.rate END DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- RPC function: Get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_trades', (SELECT COUNT(*) FROM trades),
    'completed_trades', (SELECT COUNT(*) FROM trades WHERE status = 'completed'),
    'active_orders', (SELECT COUNT(*) FROM orders WHERE status = 'active'),
    'total_volume_usdc', (SELECT COALESCE(SUM(amount), 0) FROM trades WHERE status = 'completed'),
    'total_fees_collected', (SELECT COALESCE(SUM(amount), 0) FROM fees),
    'active_disputes', (SELECT COUNT(*) FROM trades WHERE status = 'disputed'),
    'total_users', (SELECT COUNT(*) FROM users),
    'active_bridges', (SELECT COUNT(*) FROM bridge_transactions WHERE status = 'processing')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## 12. Telegram Bot Commands

### User Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome + onboarding flow |
| `/sell` | Create a sell order |
| `/buy` | Browse buy orders / create buy request |
| `/orders` | View order book |
| `/myorders` | View your active orders |
| `/trade <id>` | View trade details |
| `/mytrades` | View your trade history |
| `/bridge` | Bridge tokens cross-chain |
| `/balance` | Check wallet balance |
| `/wallet` | Wallet settings |
| `/profile` | View your profile & stats |
| `/dispute <trade_id>` | Raise a dispute |
| `/help` | Help & FAQ |

### Admin Commands

| Command | Description |
|---------|-------------|
| `/admin` | Admin dashboard |
| `/stats` | View platform stats |
| `/disputes` | View open disputes |
| `/resolve <trade_id> <action>` | Resolve a dispute |
| `/ban <user_id>` | Ban a user |
| `/fee` | View collected fees |
| `/broadcast <message>` | Send message to all users |

### Inline Keyboard Flows

```
📊 Order Book                    🔒 Active Trade
┌─────────────────────┐         ┌──────────────────────┐
│ 💰 Sell Orders      │         │ Trade #ABC123        │
│                     │         │ ────────────────────  │
│ @user1: 100 USDC    │         │ Status: In Escrow 🔒 │
│ Rate: ₹88 | UPI ✅  │         │ Amount: 100 USDC     │
│ Trust: ⭐⭐⭐⭐⭐      │         │ Rate: ₹88/USDC       │
│ [Buy Now]           │         │ Fiat: ₹8,800 INR     │
│                     │         │                      │
│ @user2: 50 USDC     │         │ Seller: @seller      │
│ Rate: ₹87.5 | UPI ✅│         │ Buyer: @buyer        │
│ Trust: ⭐⭐⭐⭐        │         │                      │
│ [Buy Now]           │         │ [I've Paid ✅]        │
│                     │         │ [Cancel ❌]           │
│ [← Prev] [Next →]  │         │ [Dispute ⚠️]         │
└─────────────────────┘         └──────────────────────┘
```

---

## 13. Security & Trust

### User Trust System

```
Trust Score = (Completed Trades / Total Trades) × 100

Modifiers:
  + 2 points per completed trade
  - 10 points per dispute loss
  - 50 points per confirmed scam
  + 5 points for verification

Levels:
  🔴 0-30:   Restricted (limited trade size, longer escrow)
  🟡 30-60:  New (standard limits)
  🟢 60-80:  Trusted (higher limits)
  ⭐ 80-95:  Excellent (VIP features)
  💎 95-100: OG (max limits, lowest fees)
```

### Anti-Fraud Measures
1. **New user restrictions** — First 3 trades limited to $50
2. **Escrow timeouts** — Auto-cancel prevents lock-up attacks
3. **Rate limiting** — Max orders per user per day
4. **Suspicious activity detection** — AI flags unusual patterns
5. **Payment proof requirement** — Screenshot upload for fiat payments
6. **Blacklist** — Known scammer addresses/telegram IDs
7. **Multi-device detection** — Flag users with multiple accounts

### Data Protection
- Wallet addresses encrypted at rest
- Payment details (UPI) only shown to matched trader
- Trade messages auto-deleted after 30 days
- No fiat stored — all fiat is P2P between users

---

## 14. Escrow Mechanism

### How Escrow Works with Agentic Wallet

```
┌─ Seller ─────────────┐     ┌─ Escrow Wallet ────────┐     ┌─ Buyer ──────────────┐
│                       │     │ (Agentic Wallet)        │     │                       │
│  Has: 100 USDC        │     │                         │     │  Has: ₹8,800 INR     │
│  Wallet: 0xSeller...  │     │  Email: escrow@p2p.com  │     │  Wallet: 0xBuyer...  │
│                       │     │  Address: 0xEscrow...   │     │                       │
│                       │     │                         │     │                       │
│  Step 1: ─────────────┼──►  │  +100 USDC              │     │                       │
│  Send to escrow       │     │  (locked)               │     │                       │
│                       │     │                         │     │                       │
│                       │     │                         │     │ Step 2: ──────────────┤
│                       │ ◄───┼─────────────────────────┼─────┤ Send ₹8,800 via UPI  │
│  Step 3: ─────────────┤     │                         │     │                       │
│  Confirm ₹ received   │     │                         │     │                       │
│                       │     │                         │     │                       │
│                       │     │  Step 4:                │     │                       │
│                       │     │  Release 99.5 USDC ─────┼──►  │  +99.5 USDC          │
│                       │     │  Send 0.5 USDC fee ─────┼──►  │  (Admin wallet)       │
│                       │     │                         │     │                       │
└───────────────────────┘     └─────────────────────────┘     └───────────────────────┘
```

### Escrow Rules
1. **Seller must be authenticated** with their own agentic wallet
2. **Only USDC on Base** for initial version (simplicity)
3. **Escrow wallet is bot-controlled** — only bot can release/refund
4. **Time-locked** — auto-refund after 60 min if no fiat confirmation
5. **Admin override** — admin can manually release/refund in disputes

---

## 15. Dispute Resolution

### 3-Tier System

```
Tier 1: AUTO-RESOLUTION (Instant)
  ├── Escrow timeout → Auto-refund to seller
  ├── Both parties agree → Execute agreed action
  └── Buyer cancels before fiat sent → Auto-refund

Tier 2: AI-ASSISTED (Minutes)
  ├── AI analyzes evidence (screenshots, timestamps)
  ├── Checks user trust scores and history
  ├── Recommends action to admin
  └── Admin approves/overrides

Tier 3: ADMIN MANUAL (Hours)
  ├── Complex disputes requiring human judgment
  ├── Admin reviews all evidence
  ├── Can contact both parties
  └── Final decision is binding
```

---

## 16. Revenue Model

### Revenue Streams

| Stream | Rate | Est. Monthly (100 trades/day) |
|--------|------|-------------------------------|
| Trade fees | 0.5% per trade | ~$1,500/month* |
| Bridge fees | 0.1-0.3% markup | ~$200/month |
| Premium features | $5-10/month | ~$500/month |
| **Total** | | **~$2,200/month** |

*Assuming average trade size of $100

### Growth Levers
1. **Volume incentives** — Lower fees for high-volume traders
2. **Referral program** — Earn 10% of referee's fees
3. **Token launch** — Future P2P Kerala token for governance
4. **Lending/borrowing** — P2P lending marketplace
5. **OTC desk** — Large trades with custom pricing

---

## 17. Directory Structure

```
p2pkerala/
├── src/
│   ├── bot/
│   │   ├── index.ts                 # Bot entry point
│   │   ├── commands/
│   │   │   ├── start.ts             # /start command
│   │   │   ├── sell.ts              # /sell command
│   │   │   ├── buy.ts               # /buy command
│   │   │   ├── bridge.ts            # /bridge command
│   │   │   ├── wallet.ts            # /wallet command
│   │   │   ├── profile.ts           # /profile command
│   │   │   ├── dispute.ts           # /dispute command
│   │   │   └── admin.ts             # Admin commands
│   │   ├── conversations/
│   │   │   ├── createOrder.ts       # Order creation flow
│   │   │   ├── matchOrder.ts        # Order matching flow
│   │   │   ├── tradeFlow.ts         # Trade execution flow
│   │   │   ├── bridgeFlow.ts        # Bridge token flow
│   │   │   └── disputeFlow.ts       # Dispute filing flow
│   │   ├── keyboards/
│   │   │   ├── orderBook.ts         # Order book inline keyboard
│   │   │   ├── trade.ts             # Trade action keyboard
│   │   │   ├── bridge.ts            # Bridge options keyboard
│   │   │   └── admin.ts             # Admin panel keyboard
│   │   └── middleware/
│   │       ├── auth.ts              # User authentication
│   │       ├── rateLimit.ts         # Rate limiting
│   │       └── logger.ts            # Request logging
│   ├── services/
│   │   ├── wallet.ts                # Agentic Wallet service (awal CLI wrapper)
│   │   ├── escrow.ts                # Escrow logic
│   │   ├── bridge.ts                # LI.FI bridge service
│   │   ├── ai.ts                    # OpenAI integration
│   │   ├── orderBook.ts             # Order management
│   │   ├── trade.ts                 # Trade engine
│   │   ├── fee.ts                   # Fee calculation & collection
│   │   ├── user.ts                  # User management
│   │   ├── dispute.ts               # Dispute resolution
│   │   └── notification.ts          # User notifications
│   ├── db/
│   │   ├── client.ts                # Supabase client
│   │   ├── migrations/              # SQL migrations
│   │   └── queries/                 # Typed query functions
│   ├── utils/
│   │   ├── formatters.ts            # Message formatting
│   │   ├── validators.ts            # Input validation
│   │   ├── crypto.ts                # Crypto utilities
│   │   └── constants.ts             # App constants
│   ├── types/
│   │   ├── trade.ts                 # Trade types
│   │   ├── order.ts                 # Order types
│   │   ├── user.ts                  # User types
│   │   └── bridge.ts                # Bridge types
│   └── config/
│       ├── env.ts                   # Environment variables
│       ├── tokens.ts                # Supported tokens config
│       └── chains.ts                # Supported chains config
├── docs/
│   ├── coinbase-agentic-wallets-research.md
│   └── p2p-telegram-bot-blueprint.md
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 18. Implementation Phases

### Phase 1: Foundation (Week 1-2) 🏗️
- [ ] Set up project structure (TypeScript + grammY)
- [ ] Supabase database schema
- [ ] Basic Telegram bot with `/start`, `/help`
- [ ] User registration system
- [ ] Agentic Wallet integration (auth, balance, send)
- [ ] OpenAI intent detection (basic)

### Phase 2: Core P2P (Week 3-4) 💰
- [ ] Order book (create, view, cancel orders)
- [ ] Trade matching system
- [ ] Escrow mechanism (lock, release, refund)
- [ ] Fiat payment confirmation flow
- [ ] 0.5% fee collection
- [ ] Trade state machine (all statuses)
- [ ] Inline keyboards for trade actions

### Phase 3: AI & UX (Week 5-6) 🤖
- [ ] Natural language trade creation
- [ ] AI-powered intent detection for all commands
- [ ] Smart order matching suggestions
- [ ] User trust score system
- [ ] Trade notifications
- [ ] Admin dashboard commands

### Phase 4: Bridge & Advanced (Week 7-8) 🌉
- [ ] LI.FI bridge integration
- [ ] Cross-chain trade support
- [ ] Multi-token support (ETH, WETH, etc.)
- [ ] Advanced order types (limit, partial fill)
- [ ] Dispute resolution system
- [ ] Rate limiting & anti-fraud

### Phase 5: Polish & Launch (Week 9-10) 🚀
- [ ] Production deployment
- [ ] Error handling & edge cases
- [ ] Performance optimization
- [ ] Security audit
- [ ] User testing
- [ ] Launch marketing

---

## 19. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **Regulatory** | Start with crypto-to-crypto only; add fiat carefully; consult legal |
| **Escrow failure** | Multi-sig backup; admin override; automatic refund timeouts |
| **Scam trades** | Trust scoring; trade limits; evidence requirements; AI detection |
| **LI.FI bridge failure** | Retry mechanism; fallback bridges; manual resolution |
| **Agentic Wallet downtime** | Queue system; retry logic; manual fallback |
| **OpenAI API failure** | Fallback to command-based UI; cache common intents |
| **Liquidity** | Start with small community; incentivize market makers |

---

## 20. Future Expansions

### 🔮 V2 Features
1. **Multi-currency fiat** — USD, AED, GBP beyond INR
2. **P2P Lending** — Lend/borrow crypto with interest
3. **Recurring trades** — DCA (Dollar Cost Averaging) automation
4. **OTC Desk** — Large trades ($10k+) with negotiated rates
5. **Group trades** — Pool buys for better rates
6. **NFT P2P** — Trade NFTs peer-to-peer
7. **DeFi Integration** — Yield farming with escrow funds
8. **Mobile Mini App** — Telegram Mini App for richer UI
9. **Multi-language** — Malayalam, Hindi, Tamil support
10. **x402 Monetization** — Monetize bot's data/analytics as paid API

### 🪙 P2P Kerala Token (Future)
- Governance token for fee proposals
- Staking for reduced fees
- Dispute voting power
- Revenue sharing for token holders

---

## Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
ADMIN_TELEGRAM_IDS=123456,789012

# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Agentic Wallet
ESCROW_WALLET_EMAIL=escrow@p2pkerala.com
ADMIN_WALLET_EMAIL=admin@p2pkerala.com
ESCROW_WALLET_ADDRESS=0x...
ADMIN_WALLET_ADDRESS=0x...

# LI.FI
LIFI_API_URL=https://li.quest/v1
LIFI_INTEGRATOR=p2pkerala
LIFI_FEE=0.003

# Redis
REDIS_URL=redis://localhost:6379

# App Config
FEE_PERCENTAGE=0.005
DEFAULT_CHAIN=base
DEFAULT_TOKEN=USDC
ESCROW_TIMEOUT_MINUTES=30
```
