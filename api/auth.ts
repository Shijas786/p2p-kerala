import { createHash, createHmac } from "crypto";
import { env } from "../src/config/env";
import { db } from "../src/db/client";

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { id, first_name, username, photo_url, auth_date, hash } = req.body;

    if (!id || !hash || !auth_date) {
        return res.status(400).json({ error: "Missing auth data" });
    }

    // 1. Verify Telegram Hash
    const dataCheckString = Object.keys(req.body)
        .filter(key => key !== 'hash')
        .sort()
        .map(key => `${key}=${req.body[key]}`)
        .join('\n');

    const secretKey = createHash('sha256')
        .update(env.TELEGRAM_BOT_TOKEN)
        .digest();

    const calculatedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    if (calculatedHash !== hash) {
        return res.status(403).json({ error: "Invalid integrity hash" });
    }

    // 2. Check current time (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    if (now - auth_date > 86400) {
        return res.status(403).json({ error: "Auth data is outdated" });
    }

    // 3. Sync User with DB (Create if not exists)
    // We trust this telegram_id now because the hash is valid
    let user = await db.getUserByTelegramId(id);

    // Return user data (In a real app, we'd set a JWT cookie here)
    return res.status(200).json({
        success: true,
        user: {
            id: user?.id,
            telegram_id: id,
            username,
            first_name,
            photo_url
        }
    });
}
