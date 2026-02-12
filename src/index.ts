import { bot } from "./bot";
import { env } from "./config/env";

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

    // Start a simple health check server for cloud platforms (Koyeb/Render)
    const http = require("http");
    const port = process.env.PORT || 8000;
    http.createServer((req: any, res: any) => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("P2P Kerala Bot is running! 🚀");
    }).listen(port);
    console.log(`  🔗 Health check server live on port ${port}`);

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
