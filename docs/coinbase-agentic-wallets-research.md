# Coinbase Agentic Wallets — Deep Research Document

> **Date:** February 12, 2026  
> **Sources:**  
> - [Official Docs](https://docs.cdp.coinbase.com/agentic-wallet/welcome)  
> - [Quickstart](https://docs.cdp.coinbase.com/agentic-wallet/quickstart)  
> - [Skills Reference](https://docs.cdp.coinbase.com/agentic-wallet/skills/overview)  
> - [x402 Protocol](https://docs.cdp.coinbase.com/x402/core-concepts/how-it-works)  
> - [GitHub — agentic-wallet-skills](https://github.com/coinbase/agentic-wallet-skills)

---

## Table of Contents

1. [What is Agentic Wallet?](#1-what-is-agentic-wallet)
2. [Agentic Wallet vs AgentKit](#2-agentic-wallet-vs-agentkit)
3. [Use Cases](#3-use-cases)
4. [Core Capabilities](#4-core-capabilities)
5. [Security Model](#5-security-model)
6. [Architecture & Components](#6-architecture--components)
7. [The `awal` CLI — Full Command Reference](#7-the-awal-cli--full-command-reference)
8. [Agent Skills — Deep Dive](#8-agent-skills--deep-dive)
   - 8.1 [authenticate-wallet](#81-authenticate-wallet)
   - 8.2 [fund](#82-fund)
   - 8.3 [send-usdc](#83-send-usdc)
   - 8.4 [trade](#84-trade)
   - 8.5 [search-for-service](#85-search-for-service)
   - 8.6 [pay-for-service](#86-pay-for-service)
   - 8.7 [monetize-service](#87-monetize-service)
9. [The x402 Protocol — Machine-to-Machine Payments](#9-the-x402-protocol--machine-to-machine-payments)
10. [The Bazaar — Agent Service Marketplace](#10-the-bazaar--agent-service-marketplace)
11. [Building a Monetized API Server (Step-by-Step)](#11-building-a-monetized-api-server-step-by-step)
12. [Key Technical Details](#12-key-technical-details)
13. [Getting Started Checklist](#13-getting-started-checklist)
14. [Build Ideas & Opportunities](#14-build-ideas--opportunities)

---

## 1. What is Agentic Wallet?

**Agentic Wallet** is a Coinbase Developer Platform (CDP) product that gives **AI agents their own crypto wallets** for autonomous financial operations. It enables AI agents to:

- **Send and receive USDC** on the Base network
- **Trade/swap tokens** autonomously
- **Pay for API services** using the x402 protocol
- **Monetize their own APIs** and accept crypto payments
- **Discover and use paid services** from other agents via the Bazaar marketplace

Think of it as giving your AI agent a **bank account + debit card + marketplace access**, all onchain.

### Key Differentiator
Unlike traditional wallets that require human interaction, Agentic Wallets are designed for **fully autonomous, programmatic operation** by AI agents.

---

## 2. Agentic Wallet vs AgentKit

| Feature | **AgentKit** | **Agentic Wallet** |
|---------|-------------|-------------------|
| **Target** | Developers building agent infra | AI agents themselves |
| **Auth** | API keys (CDP Portal) | Email OTP (no API key needed) |
| **Interface** | SDK / Code | CLI (`awal`) + Skills |
| **Wallet Type** | Server-side MPC wallet | Self-custodial agentic wallet |
| **Use Case** | Backend wallet operations | Agent-native financial autonomy |
| **Key Commands** | Programmatic SDK calls | `npx awal send`, `npx awal trade` |

**When to use which:**
- **AgentKit** → When you're a developer building wallet infrastructure
- **Agentic Wallet** → When you want your AI agent to have its own wallet and operate autonomously

---

## 3. Use Cases

### 💰 Pay-per-call APIs
Agents can pay for individual API requests in real-time using the **x402 protocol**. No subscriptions, no API keys — just pay per request with USDC.

### 🤖 Agent-to-Agent Commerce
AI agents can **buy services from other agents**. Example: A research agent hiring a sentiment analysis agent and paying per query.

### 📊 Budget-Constrained Autonomy
Set spending limits on agents so they operate within predefined financial boundaries.

### 💱 Gasless Trading
Autonomous token swaps on the Base network for portfolio management, arbitrage, and rebalancing.

### 🔧 Autonomous Service Monetization
Agents can set up their own paid API endpoints and earn revenue without human intervention.

---

## 4. Core Capabilities

| Capability | Description |
|-----------|-------------|
| **Email-based Authentication** | Sign in via email OTP — no API keys, no KYC |
| **Gasless Transactions** | All operations on Base L2, gas is abstracted away |
| **USDC Transfers** | Native USDC send/receive with ENS resolution |
| **Token Trading** | Swap any tokens on Base (USDC, ETH, WETH, CBBTC, etc.) |
| **x402 Payments** | Pay-per-request API calls using HTTP 402 |
| **Service Discovery** | Search the Bazaar for monetized APIs |
| **Service Monetization** | Create your own paid API endpoints |
| **JSON Output** | All commands support `--json` for programmatic parsing |

---

## 5. Security Model

Agentic Wallets have **three layers of security**:

### 🔐 Key Isolation
- Private keys stay in **Coinbase's infrastructure**
- Agents never have direct access to private keys
- Similar to MPC wallet security

### 💸 Spending Guardrails
- **Enforce limits** before any transaction executes
- Can set maximum transaction amounts
- Budget-constrained autonomy

### 🛡️ KYT Screening
- **Know Your Transaction** — automatic screening
- Blocks high-risk interactions automatically
- Compliance-grade transaction monitoring

---

## 6. Architecture & Components

```
┌─────────────────────────────────────────────────┐
│                  AI AGENT                        │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Agent Logic  │  │  Agentic Wallet Skills   │  │
│  │  (Your code)  │  │  (Vercel AI SDK based)   │  │
│  └──────┬───────┘  └──────────┬───────────────┘  │
│         │                     │                   │
│         └─────────┬───────────┘                   │
│                   │                               │
│            ┌──────▼──────┐                        │
│            │  awal CLI   │                        │
│            └──────┬──────┘                        │
└───────────────────┼───────────────────────────────┘
                    │
          ┌─────────▼──────────┐
          │  Coinbase Backend   │
          │  (Key Management,   │
          │   Transaction Exec, │
          │   KYT Screening)    │
          └─────────┬──────────┘
                    │
          ┌─────────▼──────────┐
          │   Base Network      │
          │   (L2 Blockchain)   │
          └────────────────────┘
```

### Component Breakdown

#### 1. `awal` CLI
The command-line interface that agents use to interact with their wallet. It's an npm package.

```bash
npx awal status          # Check auth status
npx awal send 1 vitalik.eth  # Send USDC
npx awal trade 5 usdc eth    # Swap tokens
```

#### 2. Agent Skills
Modular skill definitions built on the [Vercel AI SDK Skills](https://sdk.vercel.ai/docs) specification. Installed via:

```bash
npx skills add coinbase/agentic-wallet-skills
```

#### 3. x402 Integration
The HTTP payment protocol that enables pay-per-request API access. Revives the `HTTP 402 Payment Required` status code.

---

## 7. The `awal` CLI — Full Command Reference

### Prerequisites
- **Node.js 24+**
- An email address for wallet authentication

### Authentication Commands

| Command | Description |
|---------|-------------|
| `npx awal status` | Check current auth status |
| `npx awal auth login <email>` | Initiate login (sends OTP) |
| `npx awal auth verify <flowId> <otp>` | Verify OTP code |

### Wallet Commands

| Command | Description |
|---------|-------------|
| `npx awal balance [--chain]` | View USDC and asset balances |
| `npx awal address` | Get wallet address |
| `npx awal show` | Open wallet UI (for funding) |

### Transaction Commands

| Command | Description |
|---------|-------------|
| `npx awal send <amount> <recipient> [--chain]` | Send USDC to address/ENS |
| `npx awal trade <amount> <from> <to>` | Swap tokens on Base |

### x402 / Bazaar Commands

| Command | Description |
|---------|-------------|
| `npx awal x402 bazaar search <query>` | Search for paid APIs |
| `npx awal x402 bazaar list` | List all bazaar resources |
| `npx awal x402 details <url>` | Inspect payment requirements |
| `npx awal x402 pay <url>` | Pay for and call an API |

### Global Options

| Option | Description |
|--------|-------------|
| `--json` | Return output in JSON format (all commands) |
| `--chain <name>` | Network: `base` (default) or `base-sepolia` |

### Authentication Flow (Full Example)

```bash
# Step 1: Initiate login
npx awal auth login agent@example.com
# Output: flowId: 8beba1c2-5674-4f24-a0fa-...

# Step 2: Verify OTP (from email)
npx awal auth verify 8beba1c2-5674-4f24-a0fa-... 123456
# Output: ✔ Authentication successful!

# Step 3: Confirm
npx awal status
# Output: Wallet Server ✓ Running, Authentication ✓ Authenticated

# Step 4: Use the wallet
npx awal balance
npx awal send 1 vitalik.eth
npx awal trade 5 usdc eth
```

---

## 8. Agent Skills — Deep Dive

Skills are modular, plug-and-play capabilities built on the **Vercel AI SDK Skills** specification. They are markdown-based instruction files that tell AI agents how to perform specific tasks.

### Skill Structure
Each skill has:
- **Name**: Unique identifier (e.g., `send-usdc`)
- **Description**: Trigger phrases and when to use
- **Instructions**: Step-by-step guidance
- **CLI Commands**: Specific `awal` commands to run
- **Allowed Tools**: Commands the agent can run without prompting

### Installation
```bash
npx skills add coinbase/agentic-wallet-skills
```

### Example Prompts → Skill Mapping

| Prompt | Skill Used |
|--------|-----------|
| "Sign in to my wallet with me@email.com" | `authenticate-wallet` |
| "Fund my wallet" | `fund` |
| "Send 10 USDC to vitalik.eth" | `send-usdc` |
| "Buy $5 of ETH" | `trade` |
| "Find APIs for sentiment analysis" | `search-for-service` |
| "Call that weather API" | `pay-for-service` |
| "Set up a paid endpoint for my data" | `monetize-service` |

---

### 8.1 authenticate-wallet

**Purpose**: Email-based OTP authentication for the agentic wallet.

**Flow**:
1. `npx awal@latest auth login <email>` → Sends OTP
2. `npx awal@latest auth verify <flowId> <otp>` → Verifies OTP
3. `npx awal@latest status` → Confirms authentication

**CLI Commands**:
```bash
npx awal@latest status              # Check auth status
npx awal@latest auth login <email>  # Start login
npx awal@latest auth verify <id> <otp>  # Verify OTP
npx awal@latest balance             # View balance
npx awal@latest address             # Get wallet address
npx awal@latest show                # Open wallet UI
```

All commands support `--json` for programmatic output.

---

### 8.2 fund

**Purpose**: Add USDC to the agentic wallet.

**Methods**:
1. **Coinbase Onramp** — `npx awal@latest show` opens the funding UI
   - Preset amounts: $10, $20, $50 or custom
   - Payment methods: Card, Apple Pay (instant), Bank transfer (1-3 days)
2. **Direct Transfer** — Get the wallet address with `npx awal@latest address` and send USDC directly

**Note**: Coinbase Onramp available in supported regions (US, etc.). Funds deposited as USDC on Base.

---

### 8.3 send-usdc

**Purpose**: Send USDC payments to any address or ENS name.

**Syntax**:
```bash
npx awal@latest send <amount> <recipient> [--chain <chain>] [--json]
```

**Features**:
- Supports **ENS resolution** (e.g., `vitalik.eth`)
- Supports dollar amounts (`$5.00`) or plain numbers (`5.00`)
- Networks: `base` (default), `base-sepolia` (testnet)

**Examples**:
```bash
npx awal@latest send 1 0x1234...abcd          # Send $1 USDC
npx awal@latest send 0.50 vitalik.eth          # Send to ENS
npx awal@latest send "$5.00" 0x1234...abcd     # Dollar prefix
npx awal@latest send 1 0x... --chain base-sepolia  # Testnet
```

---

### 8.4 trade

**Purpose**: Swap tokens on Base network.

**Syntax**:
```bash
npx awal@latest trade <amount> <from> <to> [options]
```

**Token Aliases** (common names map to contract addresses):
- `usdc` → USDC on Base
- `eth` → ETH
- `weth` → Wrapped ETH
- `cbbtc` → Coinbase Wrapped BTC

**Options**:
- `-s, --slippage <n>` — Slippage tolerance in BPS (e.g., `200` = 2%)
- `--json` — JSON output

**Examples**:
```bash
npx awal@latest trade $1 usdc eth           # Buy ETH with $1 USDC
npx awal@latest trade 0.01 eth usdc         # Sell 0.01 ETH for USDC
npx awal@latest trade $5 usdc eth --slippage 200  # 2% slippage
npx awal@latest trade 100 0x833589... 0x4200...   # By contract address
```

---

### 8.5 search-for-service

**Purpose**: Discover paid APIs and services on the x402 Bazaar.

**Commands**:

```bash
# Search by query
npx awal@latest x402 bazaar search <query> [-k <n>] [--force-refresh] [--json]

# List all resources
npx awal@latest x402 bazaar list [--network <network>] [--full] [--json]

# Inspect specific endpoint
npx awal@latest x402 details <url> [--json]
```

**Options**:
- `-k, --top <n>` — Number of results to return
- `--force-refresh` — Bypass cache
- `--network <name>` — Filter by network
- `--full` — Show full details

**Cache**: Bazaar data cached at `~/.config/awal/bazaar/`

**Examples**:
```bash
npx awal@latest x402 bazaar search "weather"             # Find weather APIs
npx awal@latest x402 bazaar search "sentiment analysis" -k 10  # More results
npx awal@latest x402 bazaar list --full                  # Browse all
npx awal@latest x402 details https://example.com/api/weather   # Check cost
```

---

### 8.6 pay-for-service

**Purpose**: Make payments to x402-enabled API endpoints and receive their response.

**Syntax**:
```bash
npx awal@latest x402 pay <url> [-X <method>] [-d <json>] [-q <params>] [-h <json>] [--max-amount <n>] [--json]
```

**Options**:
- `-X, --method <method>` — HTTP method (GET, POST, etc.)
- `-d, --data <json>` — Request body (JSON)
- `-q, --query <params>` — Query parameters
- `-h, --headers <json>` — Custom headers
- `--max-amount <amount>` — Maximum USDC payment limit
- `--correlation-id <id>` — Tracking ID
- `--json` — JSON output

**Examples**:
```bash
# Simple GET (auto-pays)
npx awal@latest x402 pay https://example.com/api/weather

# POST with body
npx awal@latest x402 pay https://example.com/api/sentiment \
  -X POST -d '{"text": "I love this product"}'

# Limit max payment to $0.10
npx awal@latest x402 pay https://example.com/api/data --max-amount 100000
```

---

### 8.7 monetize-service

**Purpose**: Create your own paid API endpoints that accept x402 payments.

**How it works**:
1. Get your wallet address → receives payments
2. Use `x402-express` middleware to gate API endpoints
3. Set prices per endpoint
4. Publish to the Bazaar for agent discovery

**Full Setup Guide**:

```bash
# Step 1: Get your address
npx awal@latest address

# Step 2: Create project
mkdir x402-server && cd x402-server
npm init -y
npm install express x402-express
```

**Server Code** (`index.js`):
```javascript
const express = require("express");
const { paymentMiddleware } = require("x402-express");

const app = express();
app.use(express.json());

const PAY_TO = "<your-wallet-address>";

// Define paid routes
const payment = paymentMiddleware(PAY_TO, {
  "GET /api/example": {
    price: "$0.01",
    network: "base",
    config: {
      description: "Description of what this endpoint returns",
    },
  },
});

// Protected endpoint
app.get("/api/example", payment, (req, res) => {
  res.json({ data: "This costs $0.01 per request" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
```

**Route Config — Simple vs Full**:
```javascript
// Simple — just a price
{ "GET /api/data": "$0.05" }

// Full config with schema
{
  "POST /api/query": {
    price: "$0.25",
    network: "base",
    config: {
      description: "Human-readable description",
      inputSchema: {
        bodyType: "json",
        bodyFields: {
          query: { type: "string", description: "The query to run" },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          result: { type: "string" },
        },
      },
    },
  },
}
```

**Advanced Patterns**:

```javascript
// Multiple endpoints with different prices
const payment = paymentMiddleware(PAY_TO, {
  "GET /api/cheap": { price: "$0.001", network: "base" },
  "GET /api/expensive": { price: "$1.00", network: "base" },
  "POST /api/query": { price: "$0.25", network: "base" },
});

// Health check (no payment required)
app.get("/health", (req, res) => res.json({ status: "ok" }));
// Payment middleware only applies to routes registered after it
app.get("/api/data", payment, (req, res) => { /* ... */ });

// POST with body schema (for agent discoverability)
const payment = paymentMiddleware(PAY_TO, {
  "POST /api/analyze": {
    price: "$0.10",
    network: "base",
    config: {
      description: "Analyze text sentiment",
      inputSchema: {
        bodyType: "json",
        bodyFields: {
          text: { type: "string", description: "Text to analyze" },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          sentiment: { type: "string" },
          score: { type: "number" },
        },
      },
    },
  },
});
```

**Using the CDP Facilitator** (optional, for production):
```bash
npm install @coinbase/x402
```
```javascript
const { facilitator } = require("@coinbase/x402");
const payment = paymentMiddleware(PAY_TO, routes, facilitator);
```
Requires `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` environment variables from the [CDP Portal](https://portal.cdp.coinbase.com).

**Route Config Fields**:

| Field | Description |
|-------|-------------|
| `price` | USDC cost (e.g., `"$0.01"`) |
| `network` | Blockchain network (e.g., `"base"`) |
| `config.description` | Human-readable description |
| `config.inputSchema` | Expected input format |
| `config.outputSchema` | Expected output format |
| `config.maxTimeoutSeconds` | Max response time |

**Deployment Checklist**:
- [ ] Get wallet address with `npx awal@latest address`
- [ ] Install `express` and `x402-express`
- [ ] Define routes with prices and descriptions
- [ ] Register payment middleware before protected routes
- [ ] Keep health/status endpoints before payment middleware
- [ ] Test with `curl` (should get 402) and `npx awal@latest x402 pay` (should get 200)
- [ ] Announce your service so other agents can find it

---

## 9. The x402 Protocol — Machine-to-Machine Payments

### Overview
x402 revives the **HTTP 402 Payment Required** status code to enable **native payments over HTTP**. It's the backbone of the entire agent commerce ecosystem.

### Payment Flow (Step-by-Step)

```
Client                    Server                   Facilitator          Blockchain
  │                         │                          │                    │
  │── GET /api/data ──────►│                          │                    │
  │                         │                          │                    │
  │◄── 402 Payment ────────│                          │                    │
  │    Required             │                          │                    │
  │    (PAYMENT-REQUIRED    │                          │                    │
  │     header)             │                          │                    │
  │                         │                          │                    │
  │── GET /api/data ──────►│                          │                    │
  │   (PAYMENT-SIGNATURE   │                          │                    │
  │    header)              │                          │                    │
  │                         │── Verify payment ──────►│                    │
  │                         │                          │                    │
  │                         │◄── Valid ────────────────│                    │
  │                         │                          │                    │
  │                         │── Settle payment ──────►│                    │
  │                         │                          │── Submit tx ─────►│
  │                         │                          │◄── Confirmed ─────│
  │                         │◄── Settlement details ──│                    │
  │                         │                          │                    │
  │◄── 200 OK ─────────────│                          │                    │
  │    (PAYMENT-RESPONSE   │                          │                    │
  │     header + body)      │                          │                    │
```

### Detailed Steps
1. **Client makes HTTP request** → standard request to a protected endpoint
2. **Server responds with 402** → returns payment requirements in `PAYMENT-REQUIRED` header
3. **Client creates payment** → signs a payment payload using their wallet
4. **Client resubmits with payment** → includes `PAYMENT-SIGNATURE` header
5. **Server verifies payment** → locally or via a facilitator service
6. **Facilitator validates** → checks payment against scheme and network requirements
7. **Server processes request** → if valid, fulfills the request
8. **Payment settlement** → via blockchain directly or through facilitator's `/settle` endpoint
9. **Settlement confirmation** → transaction confirmed onchain
10. **Server delivers resource** → 200 OK with data + `PAYMENT-RESPONSE` header

### Key HTTP Headers

| Header | Direction | Purpose |
|--------|-----------|---------|
| `PAYMENT-REQUIRED` | Server → Client | Payment requirements (amount, network, token) |
| `PAYMENT-SIGNATURE` | Client → Server | Signed payment payload |
| `PAYMENT-RESPONSE` | Server → Client | Settlement details |

### Key Components

| Component | Description |
|-----------|-------------|
| **Client** | The entity making the request and paying |
| **Server** | The entity providing the service and receiving payment |
| **Facilitator** | Optional service for payment verification and settlement |
| **HTTP 402** | The status code communicating payment requirements |

### Why This Design?
- ✅ **Stateless** — No sessions or authentication required
- ✅ **HTTP-native** — Works with existing web infrastructure
- ✅ **Blockchain-agnostic** — Supports multiple networks through facilitators
- ✅ **Developer-friendly** — Simple integration with standard HTTP libraries

---

## 10. The Bazaar — Agent Service Marketplace

The **Bazaar** is a decentralized marketplace where:
- **Service providers** list their x402-enabled APIs
- **Agent consumers** discover and pay for services
- All transactions happen in **USDC on Base**

### How Agents Interact with the Bazaar

```bash
# 1. Discover services
npx awal@latest x402 bazaar search "weather forecast"

# 2. Inspect a service
npx awal@latest x402 details https://weather-service.com/api/forecast

# 3. Use the service (auto-pay)
npx awal@latest x402 pay https://weather-service.com/api/forecast?city=NYC

# 4. List your own service
# (Deploy an x402 server and announce it)
```

### Bazaar Data
Cached locally at `~/.config/awal/bazaar/` for performance. Use `--force-refresh` to update.

---

## 11. Building a Monetized API Server (Step-by-Step)

### Complete Example: Sentiment Analysis API

```bash
# 1. Authenticate
npx awal auth login your@email.com
npx awal auth verify <flowId> <otp>

# 2. Get your payment address
npx awal address
# Output: 0xYourWalletAddress...

# 3. Create the server
mkdir sentiment-api && cd sentiment-api
npm init -y
npm install express x402-express
```

**`index.js`**:
```javascript
const express = require("express");
const { paymentMiddleware } = require("x402-express");

const app = express();
app.use(express.json());

const PAY_TO = "0xYourWalletAddress";

const payment = paymentMiddleware(PAY_TO, {
  "POST /api/analyze": {
    price: "$0.05",
    network: "base",
    config: {
      description: "Analyze text sentiment. Returns sentiment label and confidence score.",
      inputSchema: {
        bodyType: "json",
        bodyFields: {
          text: { type: "string", description: "Text to analyze" },
        },
      },
      outputSchema: {
        type: "object",
        properties: {
          sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
          score: { type: "number", description: "Confidence 0-1" },
        },
      },
    },
  },
  "GET /api/health": "$0.00", // Free health check
});

// Free health endpoint
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Paid sentiment analysis
app.post("/api/analyze", payment, (req, res) => {
  const { text } = req.body;
  // Your ML model or API call here
  const sentiment = text.includes("love") ? "positive" : "neutral";
  const score = 0.95;
  res.json({ sentiment, score });
});

app.listen(3000, () => console.log("Sentiment API running on :3000"));
```

**Test it**:
```bash
# Start server
node index.js

# Test without payment (should get 402)
curl -i http://localhost:3000/api/analyze -X POST -d '{"text":"hello"}'

# Test with payment (should get 200 + result)
npx awal x402 pay http://localhost:3000/api/analyze -X POST -d '{"text":"I love this!"}'
```

---

## 12. Key Technical Details

### Networks Supported
| Network | Chain | Notes |
|---------|-------|-------|
| **Base** | Mainnet | Default, production use |
| **Base Sepolia** | Testnet | For testing (`--chain base-sepolia`) |

### Currency
- **USDC** is the primary currency for all transactions
- All prices are in USDC terms
- Dollar amounts (e.g., `$0.01`) map to USDC microunits

### Dependencies
- **Node.js 24+** required
- Built on **Vercel AI SDK Skills** specification
- npm packages: `awal`, `x402-express`, `@coinbase/x402`

### Key npm Packages

| Package | Purpose |
|---------|---------|
| `awal` | CLI for agentic wallet operations |
| `x402-express` | Express middleware for accepting x402 payments |
| `@coinbase/x402` | CDP facilitator integration |

### GitHub Repository
[`coinbase/agentic-wallet-skills`](https://github.com/coinbase/agentic-wallet-skills) — MIT licensed, open source.

### Contributing New Skills
1. Create a folder in `./skills/` with a lowercase, hyphenated name
2. Add a `SKILL.md` file with YAML frontmatter and instructions
3. Follow the [Agent Skills specification](https://agentskills.io/specification)

---

## 13. Getting Started Checklist

- [ ] Install Node.js 24+
- [ ] Install skills: `npx skills add coinbase/agentic-wallet-skills`
- [ ] Authenticate: `npx awal auth login your@email.com`
- [ ] Verify OTP: `npx awal auth verify <flowId> <otp>`
- [ ] Check status: `npx awal status`
- [ ] Fund wallet: `npx awal show` (or direct USDC transfer)
- [ ] Test send: `npx awal send 0.01 <address> --chain base-sepolia`
- [ ] Test trade: `npx awal trade $1 usdc eth`
- [ ] Explore Bazaar: `npx awal x402 bazaar search "weather"`
- [ ] Build monetized API: Use `x402-express` middleware

---

## 14. Build Ideas & Opportunities

### 💡 Agent-as-a-Service Ideas

1. **AI Research Agent** — Charges per query for deep web research
2. **Price Oracle Agent** — Real-time crypto price feeds, paid per call
3. **Data Aggregator** — Combines multiple paid APIs, resells aggregated data
4. **Content Moderator** — Paid content/text moderation API
5. **Image Generator** — Agent wrapping Stable Diffusion, charges per generation
6. **Translation Service** — Pay-per-translation agent
7. **Code Review Bot** — Automated code review as a paid service
8. **Market Analysis Agent** — Provides trading signals via x402

### 🏗️ Platform/Infrastructure Ideas

1. **Agent Marketplace Dashboard** — Visual UI for the Bazaar
2. **Spending Analytics** — Track what your agents spend and earn
3. **Agent Fleet Manager** — Manage multiple agentic wallets
4. **Multi-Agent Orchestrator** — Coordinate agents that buy/sell from each other
5. **x402 Testing Framework** — Tools for testing x402 integrations

### 🔗 Integration Ideas (with your existing p2pkerala project)

1. **Token Purchase Tracking via Agentic Wallet** — Use agentic wallets to autonomously track and purchase creator tokens
2. **Automated Leaderboard Agent** — Agent that monitors token buys and updates leaderboards
3. **Social Signal Trading Agent** — Monitors Farcaster/social for signals, trades via agentic wallet
4. **Paid API for PnL Data** — Monetize your Zerion PnL tracking as an x402 service

---

## Key Links & Resources

| Resource | URL |
|----------|-----|
| **Documentation** | https://docs.cdp.coinbase.com/agentic-wallet/welcome |
| **Quickstart** | https://docs.cdp.coinbase.com/agentic-wallet/quickstart |
| **Skills Reference** | https://docs.cdp.coinbase.com/agentic-wallet/skills/overview |
| **x402 Protocol** | https://docs.cdp.coinbase.com/x402/core-concepts/how-it-works |
| **GitHub Repo** | https://github.com/coinbase/agentic-wallet-skills |
| **Agent Skills Spec** | https://agentskills.io/specification |
| **CDP Portal** | https://portal.cdp.coinbase.com |
| **CDP Discord** | https://discord.com/invite/cdp |
| **Wallet Comparison** | https://docs.cdp.coinbase.com/server-wallets/comparing-our-wallets |
| **x402 Seller Quickstart** | https://docs.cdp.coinbase.com/x402/quickstart-for-sellers |
| **x402 Buyer Quickstart** | https://docs.cdp.coinbase.com/x402/quickstart-for-buyers |
