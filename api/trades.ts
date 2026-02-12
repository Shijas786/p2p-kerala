import { db } from "../src/db/client";

export default async function handler(req: any, res: any) {
    if (req.method === 'GET') {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ error: "Missing user_id" });
        }

        try {
            // Get trades for this user (buyer or seller)
            const trades = await db.getUserTrades(user_id);

            // Format for frontend
            const formattedTrades = trades.map((t: any) => ({
                id: t.id,
                type: t.buyer_id === user_id ? "buy" : "sell",
                amount: t.amount,
                token: t.token,
                status: t.status,
                fiat_amount: t.fiat_amount,
                created_at: t.created_at,
                // If user is buyer, show seller name, else buyer name
                counterparty: t.buyer_id === user_id ? "Seller" : "Buyer"
            }));

            res.json({ trades: formattedTrades });
        } catch (e) {
            console.error("Trades API Error:", e);
            res.status(500).json({ error: "Failed to fetch trades" });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
