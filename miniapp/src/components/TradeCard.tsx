import './TradeCard.css';
import { haptic } from '../lib/telegram';

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
    created: { label: 'Created', color: 'blue', icon: '🔵' },
    matched: { label: 'Matched', color: 'blue', icon: '🤝' },
    in_escrow: { label: 'In Escrow', color: 'orange', icon: '🔒' },
    fiat_sent: { label: 'Fiat Sent', color: 'yellow', icon: '💸' },
    fiat_confirmed: { label: 'Confirmed', color: 'green', icon: '✅' },
    releasing: { label: 'Releasing', color: 'green', icon: '⏳' },
    completed: { label: 'Completed', color: 'green', icon: '🎉' },
    disputed: { label: 'Disputed', color: 'red', icon: '⚠️' },
    cancelled: { label: 'Cancelled', color: 'red', icon: '❌' },
    expired: { label: 'Expired', color: 'red', icon: '⏰' },
};

interface Trade {
    id: string;
    token: string;
    amount: number;
    rate: number;
    fiat_amount: number;
    fiat_currency: string;
    status: string;
    created_at: string;
}

interface Props {
    trade: Trade;
    onTap?: (trade: Trade) => void;
}

export function TradeCard({ trade, onTap }: Props) {
    const status = STATUS_MAP[trade.status] || { label: trade.status, color: 'blue', icon: '❓' };

    return (
        <div
            className="trade-card"
            onClick={() => {
                if (onTap) {
                    haptic('light');
                    onTap(trade);
                }
            }}
        >
            <div className="tc-top">
                <div className="tc-left">
                    <span className="tc-amount font-mono">
                        {(trade.amount * 0.995).toFixed(2)} {trade.token}
                    </span>
                    <span className="text-sm text-muted">
                        ₹{trade.fiat_amount?.toLocaleString()} @ ₹{trade.rate?.toLocaleString()}
                    </span>
                </div>
                <span className={`badge badge-${status.color}`}>
                    {status.icon} {status.label}
                </span>
            </div>

            <div className="tc-bottom">
                <span className="text-xs text-muted">
                    {new Date(trade.created_at).toLocaleDateString()}
                </span>
                <span className="text-xs text-muted font-mono">
                    #{trade.id.slice(0, 8)}
                </span>
            </div>
        </div>
    );
}
