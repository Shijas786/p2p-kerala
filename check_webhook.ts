
import { Bot } from "grammy";
import { env } from "./src/config/env";

const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

async function check() {
    const info = await bot.api.getWebhookInfo();
    console.log("Webhook Info:", info);

    const me = await bot.api.getMe();
    console.log("Bot Info:", me);
}

check();
