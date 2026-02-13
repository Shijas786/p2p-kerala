import { db } from "../src/db/client";

export default async function handler(req: any, res: any) {
    if (req.method === 'GET') {
        try {
            // Get latest active buy and sell orders
            const [sellAds, buyAds] = await Promise.all([
                db.getActiveOrders("sell", "all", 6),
                db.getActiveOrders("buy", "all", 6)
            ]);

            const formatAd = (ad: any) => ({
                id: ad.id,
                type: ad.type,
                token: ad.token,
                amount: ad.amount,
                rate: ad.rate,
                min_limit: ad.min_limit,
                max_limit: ad.max_limit,
                payment_methods: ad.payment_methods,
                seller: {
                    username: ad.users?.username || "Anonymous",
                    trust_score: ad.users?.trust_score || 0,
                    completed_trades: ad.users?.completed_trades || 0
                }
            });

            res.json({
                sell: sellAds.map(formatAd),
                buy: buyAds.map(formatAd)
            });
        } catch (e) {
            console.error("Ads API Error:", e);
            res.status(500).json({ error: "Failed to fetch ads" });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
