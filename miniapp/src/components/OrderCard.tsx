import './OrderCard.css';
import { haptic } from '../lib/telegram';

interface Order {
    id: string;
    type: 'buy' | 'sell';
    token: string;
    amount: number;
    filled_amount: number;
    rate: number;
    fiat_currency: string;
    payment_methods: string[];
    username?: string;
    trust_score?: number;
    status: string;
}

interface Props {
    order: Order;
    onTap?: (order: Order) => void;
    showActions?: boolean;
}

export function OrderCard({ order, onTap, showActions = true }: Props) {
    const available = order.amount - (order.filled_amount || 0);
    const isBuy = order.type === 'buy';

    return (
        <div
            className={`order-card ${showActions ? 'tappable' : ''}`}
            onClick={() => {
                if (showActions && onTap) {
                    haptic('light');
                    onTap(order);
                }
            }}
        >
            <div className="oc-header">
                <span className={`badge ${isBuy ? 'badge-green' : 'badge-red'}`}>
                    {isBuy ? '🟢 BUY' : '🔴 SELL'}
                </span>
                <span className="oc-token font-mono">{order.token}</span>
            </div>

            <div className="oc-body">
                <div className="oc-amount">
                    <span className="label">Available</span>
                    <span className="oc-value font-mono">
                        {available.toFixed(2)} <span className="text-muted">{order.token}</span>
                    </span>
                </div>
                <div className="oc-rate">
                    <span className="label">Rate</span>
                    <span className="oc-value font-mono text-green">
                        ₹{order.rate.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="oc-footer">
                <div className="oc-user">
                    {order.username && <span className="text-sm">@{order.username}</span>}
                    {order.trust_score !== undefined && (
                        <span className="oc-trust">⭐ {order.trust_score}%</span>
                    )}
                </div>
                <div className="oc-methods">
                    {(order.payment_methods || []).map((m) => (
                        <span key={m} className="oc-method">{m}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
