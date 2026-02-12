import { db } from "../src/db/client";

export default async function handler(req: any, res: any) {
    if (req.method === 'GET') {
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
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
