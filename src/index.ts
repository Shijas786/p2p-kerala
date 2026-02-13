import { bot } from "./bot";
import { env } from "./config/env";
import { db } from "./db/client"; // Import DB for stats
import express from "express";
import path from "path";

async function main() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  🤖 P2P Kerala Bot Starting...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log(`  Environment: ${env.NODE_ENV}`);
    console.log(`  Network:     ${env.DEFAULT_CHAIN}`);
    console.log(`  Token:       ${env.DEFAULT_TOKEN}`);
    console.log(`  Fee:         ${env.FEE_BPS} bps (${env.FEE_PERCENTAGE * 100}%)`);
    console.log(`  Testnet:     ${env.IS_TESTNET}`);
    console.log(`  Admin IDs:   ${env.ADMIN_IDS.length > 0 ? env.ADMIN_IDS.join(", ") : "None set"}`);
    console.log(`  OpenAI:      ${env.OPENAI_API_KEY ? "✅ Configured" : "❌ Not set (using fallback)"}`);
    console.log(`  Supabase:    ${env.SUPABASE_URL ? "✅ Configured" : "❌ Not set"}`);
    console.log(`  Escrow:      ${env.ESCROW_CONTRACT_ADDRESS ? "✅ " + env.ESCROW_CONTRACT_ADDRESS : "❌ Not deployed"}`);
    console.log("");

    // Start the bot
    console.log("  Starting Telegram bot (long polling)...");
    console.log("");

    // Start Express Server (Website + Health Check)
    const app = express();
    const port = process.env.PORT || 8000;

    // Serve static files from public folder
    // Uses process.cwd() to be safe across dev/prod (Docker)
    app.use(express.static(path.join(process.cwd(), "public")));

    // API Stats Endpoint (Consumed by the frontend)
    app.get("/api/stats", async (req, res) => {
        try {
            const stats = await db.getStats();
            res.json({
                total_users: stats.total_users,
                total_volume_usdc: stats.total_volume_usdc || 0,
                active_orders: stats.active_orders
            });
        } catch (e) {
            console.error("API Error:", e);
            res.status(500).json({ error: "Failed to fetch stats" });
        }
    });

    // Health Check (Koyeb needs a 200 OK)
    app.get("/health", (req, res) => res.send("OK"));

    // Fallback file serving (Express v5 uses {*path} instead of *)
    app.get("/{*path}", (req, res) => {
        res.sendFile(path.join(process.cwd(), "public", "index.html"));
    });

    app.listen(port, () => {
        console.log(`  🔗 Website & Health server live on port ${port}`);
        console.log(`  🌍 Visit http://localhost:${port} to see the landing page`);
    });

    // Ensure no old webhooks are blocking long polling
    try {
        console.log("  Checking for existing webhooks...");
        // Use bot instance directly
        await bot.api.deleteWebhook({ drop_pending_updates: true });
        console.log("  ✅ Webhook deleted (or none existed). Starting polling...");
    } catch (err: any) {
        console.log("  ⚠️ Webhook delete minor error:", err.message);
    }

    bot.start({
        onStart: (botInfo) => {
            console.log(`  ✅ Bot started! @${botInfo.username}`);
            console.log(`  💬 Send /start to @${botInfo.username} to begin`);
            console.log("");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("  Bot is running. Press Ctrl+C to stop.");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        },
    });
}

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down bot...");
    bot.stop();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n🛑 Shutting down bot...");
    bot.stop();
    process.exit(0);
});

main().catch((err) => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
});
