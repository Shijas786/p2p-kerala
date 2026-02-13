import { useState } from 'react';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { IconChainBase, IconChainEth, IconChainPolygon, IconChainArbitrum, IconChainOptimism, IconSwap, IconBridge } from '../components/Icons';
import './Bridge.css';

const CHAINS = [
    { id: 8453, name: 'Base', Icon: IconChainBase },
    { id: 1, name: 'Ethereum', Icon: IconChainEth },
    { id: 137, name: 'Polygon', Icon: IconChainPolygon },
    { id: 42161, name: 'Arbitrum', Icon: IconChainArbitrum },
    { id: 10, name: 'Optimism', Icon: IconChainOptimism },
];

export function Bridge() {
    const [fromChain, setFromChain] = useState(8453);
    const [toChain, setToChain] = useState(1);
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function getQuote() {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Enter a valid amount');
            return;
        }
        haptic('medium');
        setLoading(true);
        setError('');
        setQuote(null);
        try {
            const data = await api.bridge.getQuote({
                fromChainId: fromChain,
                toChainId: toChain,
                fromToken: 'USDC',
                toToken: 'USDC',
                amount: (parseFloat(amount) * 1e6).toString(),
            });
            setQuote(data);
            haptic('success');
        } catch (err: any) {
            setError(err.message || 'Failed to get quote');
            haptic('error');
        } finally {
            setLoading(false);
        }
    }

    const getChain = (id: number) => CHAINS.find(c => c.id === id);

    return (
        <div className="page animate-in">
            <div className="page-header">
                <h1 className="page-title">Bridge</h1>
                <p className="page-subtitle">Cross-chain token transfers</p>
            </div>

            {/* From Chain */}
            <div className="b-section">
                <span className="label mb-2">From</span>
                <div className="b-chains">
                    {CHAINS.map(c => (
                        <button
                            key={c.id}
                            className={`b-chain ${fromChain === c.id ? 'active' : ''}`}
                            onClick={() => { haptic('selection'); setFromChain(c.id); }}
                        >
                            <span><c.Icon size={20} /></span>
                            <span className="text-xs">{c.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Swap Arrow */}
            <div className="b-swap">
                <button
                    className="b-swap-btn"
                    onClick={() => {
                        haptic('light');
                        const tmp = fromChain;
                        setFromChain(toChain);
                        setToChain(tmp);
                    }}
                >
                    <IconSwap size={20} />
                </button>
            </div>

            {/* To Chain */}
            <div className="b-section">
                <span className="label mb-2">To</span>
                <div className="b-chains">
                    {CHAINS.map(c => (
                        <button
                            key={c.id}
                            className={`b-chain ${toChain === c.id ? 'active' : ''}`}
                            onClick={() => { haptic('selection'); setToChain(c.id); }}
                        >
                            <span><c.Icon size={20} /></span>
                            <span className="text-xs">{c.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Amount */}
            <div className="b-section">
                <span className="label mb-2">Amount (USDC)</span>
                <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="font-mono"
                />
            </div>

            {/* Get Quote */}
            <button
                className="btn btn-primary btn-block btn-lg"
                onClick={getQuote}
                disabled={loading || fromChain === toChain}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
                {loading ? <span className="spinner" /> : <><IconBridge size={18} /> Get Quote</>}
            </button>

            {fromChain === toChain && (
                <p className="text-xs text-muted text-center mt-2">Select different chains</p>
            )}

            {/* Error */}
            {error && <div className="co-error mt-3">{error}</div>}

            {/* Quote Result */}
            {quote && (
                <div className="b-quote card-glass glow-green mt-3 animate-slide-up">
                    <h3 className="mb-3">Bridge Quote</h3>
                    <div className="b-quote-row">
                        <span className="text-muted">Route</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {(() => { const from = getChain(fromChain); return from ? <><from.Icon size={16} /> {from.name}</> : 'Unknown'; })()}
                            {' → '}
                            {(() => { const to = getChain(toChain); return to ? <><to.Icon size={16} /> {to.name}</> : 'Unknown'; })()}
                        </span>
                    </div>
                    <div className="b-quote-row">
                        <span className="text-muted">You Send</span>
                        <span className="font-mono">{amount} USDC</span>
                    </div>
                    <div className="b-quote-row">
                        <span className="text-muted">You Receive</span>
                        <span className="font-mono text-green">
                            ~{(parseFloat(quote.estimate?.toAmount || quote.toAmount || '0') / 1e6).toFixed(2)} USDC
                        </span>
                    </div>
                    <div className="b-quote-row">
                        <span className="text-muted">Est. Time</span>
                        <span>{Math.ceil((quote.estimate?.executionDuration || 0) / 60)} min</span>
                    </div>
                    <div className="b-quote-row">
                        <span className="text-muted">Bridge</span>
                        <span>{quote.tool || 'Best Route'}</span>
                    </div>
                    <p className="text-xs text-muted mt-3 text-center">
                        Bridge execution coming soon — use the bot for now
                    </p>
                </div>
            )}
        </div>
    );
}
