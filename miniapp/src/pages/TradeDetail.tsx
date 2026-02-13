import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import './TradeDetail.css';

const STEPS = [
    { key: 'in_escrow', label: 'Escrow Locked', icon: '🔒' },
    { key: 'fiat_sent', label: 'Fiat Sent', icon: '💸' },
    { key: 'fiat_confirmed', label: 'Fiat Confirmed', icon: '✅' },
    { key: 'completed', label: 'Completed', icon: '🎉' },
];

export function TradeDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [trade, setTrade] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadTrade();
    }, [id]);

    async function loadTrade() {
        if (!id) return;
        setLoading(true);
        try {
            const { trade: data } = await api.trades.getById(id);
            setTrade(data);
        } catch { } finally {
            setLoading(false);
        }
    }

    async function confirmPayment() {
        if (!id) return;
        haptic('medium');
        setActionLoading(true);
        setError('');
        try {
            await api.trades.confirmPayment(id);
            haptic('success');
            await loadTrade();
        } catch (err: any) {
            setError(err.message);
            haptic('error');
        } finally {
            setActionLoading(false);
        }
    }

    async function confirmReceipt() {
        if (!id) return;
        haptic('medium');
        setActionLoading(true);
        setError('');
        try {
            await api.trades.confirmReceipt(id);
            haptic('success');
            await loadTrade();
        } catch (err: any) {
            setError(err.message);
            haptic('error');
        } finally {
            setActionLoading(false);
        }
    }

    async function raiseDispute() {
        if (!id) return;
        haptic('heavy');
        const reason = prompt('Describe the issue:');
        if (!reason) return;
        setActionLoading(true);
        try {
            await api.trades.dispute(id, reason);
            haptic('warning');
            await loadTrade();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    }

    function getStepIndex(status: string): number {
        const idx = STEPS.findIndex(s => s.key === status);
        return idx >= 0 ? idx : (status === 'completed' ? 3 : -1);
    }

    if (loading) {
        return (
            <div className="page">
                <div className="skeleton" style={{ height: 200 }} />
                <div className="skeleton mt-3" style={{ height: 100 }} />
            </div>
        );
    }

    if (!trade) {
        return (
            <div className="page">
                <div className="empty-state">
                    <div className="icon">❓</div>
                    <h3>Trade not found</h3>
                    <button className="btn btn-primary btn-sm mt-3" onClick={() => navigate('/')}>
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const currentStep = getStepIndex(trade.status);

    return (
        <div className="page animate-in">
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <h1 className="page-title">Trade</h1>
                    <span className="font-mono text-xs text-muted">#{trade.id.slice(0, 8)}</span>
                </div>
            </div>

            {/* Amount Card */}
            <div className="td-amount-card card-glass glow-green">
                <div className="td-amount font-mono">
                    {trade.amount} <span className="text-muted">{trade.token}</span>
                </div>
                <div className="td-fiat font-mono text-secondary">
                    ₹{trade.fiat_amount?.toLocaleString()} @ ₹{trade.rate?.toLocaleString()}
                </div>
                <div className="td-fee text-xs text-muted mt-1">
                    Fee: {trade.fee_amount} {trade.token} • You receive: {trade.buyer_receives} {trade.token}
                </div>
            </div>

            {/* Progress Steps */}
            <div className="td-steps">
                {STEPS.map((step, i) => (
                    <div key={step.key} className={`td-step ${i <= currentStep ? 'done' : ''} ${i === currentStep ? 'current' : ''}`}>
                        <div className="td-step-dot">
                            {i <= currentStep ? step.icon : <span className="td-step-num">{i + 1}</span>}
                        </div>
                        <span className="td-step-label">{step.label}</span>
                        {i < STEPS.length - 1 && <div className="td-step-line" />}
                    </div>
                ))}
            </div>

            {/* Trade Info */}
            <div className="td-info card">
                <div className="td-info-row">
                    <span className="text-muted">Status</span>
                    <span className="font-semibold">{trade.status.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div className="td-info-row">
                    <span className="text-muted">Payment</span>
                    <span>{trade.payment_method || 'UPI'}</span>
                </div>
                {trade.escrow_tx_hash && (
                    <div className="td-info-row">
                        <span className="text-muted">Escrow TX</span>
                        <a href={`https://basescan.org/tx/${trade.escrow_tx_hash}`} target="_blank" rel="noopener" className="text-green text-sm font-mono truncate">
                            {trade.escrow_tx_hash.slice(0, 12)}...
                        </a>
                    </div>
                )}
                {trade.release_tx_hash && (
                    <div className="td-info-row">
                        <span className="text-muted">Release TX</span>
                        <a href={`https://basescan.org/tx/${trade.release_tx_hash}`} target="_blank" rel="noopener" className="text-green text-sm font-mono truncate">
                            {trade.release_tx_hash.slice(0, 12)}...
                        </a>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && <div className="co-error mt-3">{error}</div>}

            {/* Actions */}
            <div className="td-actions">
                {trade.status === 'in_escrow' && (
                    <button
                        className="btn btn-primary btn-block btn-lg"
                        onClick={confirmPayment}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <span className="spinner" /> : '💸 I Sent Fiat'}
                    </button>
                )}
                {trade.status === 'fiat_sent' && (
                    <button
                        className="btn btn-primary btn-block btn-lg"
                        onClick={confirmReceipt}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <span className="spinner" /> : '✅ I Received Fiat — Release Crypto'}
                    </button>
                )}
                {['in_escrow', 'fiat_sent'].includes(trade.status) && (
                    <button
                        className="btn btn-danger btn-block mt-2"
                        onClick={raiseDispute}
                        disabled={actionLoading}
                    >
                        ⚠️ Raise Dispute
                    </button>
                )}
                {trade.status === 'completed' && (
                    <div className="td-completed text-center">
                        <span className="td-check">🎉</span>
                        <h3 className="text-green">Trade Completed!</h3>
                        <p className="text-sm text-muted mt-1">Funds have been released successfully</p>
                    </div>
                )}
            </div>
        </div>
    );
}
