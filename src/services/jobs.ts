import { db } from "../db/client";

export function startExpiryJob() {
    console.log("⏰ Starting Ad Expiry Job...");

    // Check every 1 minute
    setInterval(async () => {
        try {
            const now = new Date().toISOString();

            // This requires a custom DB query or RPC, but for now we can select active orders and filter
            // Or better: Add a clean RPC function. 
            // For MVP, client-side filtering is okay if volume is low, but direct DB update is better.

            const client = (db as any).getClient(); // Access raw client

            const { data: expiredOrders, error } = await client
                .from("orders")
                .select("id")
                .eq("status", "active")
                .lt("expires_at", now);

            if (error) {
                console.error("[JOB] Failed to fetch expired orders:", error);
                return;
            }

            if (expiredOrders && expiredOrders.length > 0) {
                const ids = expiredOrders.map((o: any) => o.id);
                console.log(`[JOB] Expiring ${ids.length} orders...`);

                const { error: updateError } = await client
                    .from("orders")
                    .update({ status: "expired", updated_at: now })
                    .in("id", ids);

                if (updateError) {
                    console.error("[JOB] Failed to update expired orders:", updateError);
                } else {
                    console.log(`[JOB] Successfully expired ${ids.length} orders.`);
                }
            }
        } catch (err) {
            console.error("[JOB] Expiry job error:", err);
        }
    }, 60 * 1000); // 1 minute
}
