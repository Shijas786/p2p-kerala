import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import './CreateOrder.css';

const TOKENS = ['USDC', 'USDT'];
const PAYMENT_METHODS = ['UPI', 'IMPS', 'NEFT', 'PAYTM', 'BANK'];

export function CreateOrder() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [type, setType] = useState<'sell' | 'buy'>('sell');
    const [token, setToken] = useState('USDC');
    const [amount, setAmount] = useState('');
    const [rate, setRate] = useState('');
    const [methods, setMethods] = useState<string[]>(['UPI']);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    function toggleMethod(m: string) {
        haptic('selection');
        setMethods(prev =>
            prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
        );
    }

    function nextStep() {
        haptic('light');
        if (step === 1 && !type) return;
        if (step === 3 && (!amount || parseFloat(amount) <= 0)) {
            setError('Enter a valid amount');
            return;
        }
        if (step === 4 && (!rate || parseFloat(rate) <= 0)) {
            setError('Enter a valid rate');
            return;
        }
        setError('');
        setStep(s => s + 1);
    }

    function prevStep() {
        haptic('light');
        setError('');
        setStep(s => Math.max(1, s - 1));
    }

    async function submit() {
        haptic('medium');
        setSubmitting(true);
        setError('');
        try {
            await api.orders.create({
                type,
                token,
                amount: parseFloat(amount),
                rate: parseFloat(rate),
                payment_methods: methods,
            });
            haptic('success');
            navigate('/market');
        } catch (err: any) {
            setError(err.message || 'Failed to create order');
            haptic('error');
        } finally {
            setSubmitting(false);
        }
    }

    const fiatTotal = amount && rate
        ? (parseFloat(amount) * parseFloat(rate)).toFixed(2)
        : '0.00';

    return (
        <div className="page animate-in">
            <div className="page-header">
                <h1 className="page-title">Create Ad</h1>
                <p className="page-subtitle">Step {step} of 6</p>
            </div>

            {/* Progress */}
            <div className="co-progress">
                {[1, 2, 3, 4, 5, 6].map(s => (
                    <div key={s} className={`co-dot ${s <= step ? 'active' : ''} ${s === step ? 'current' : ''}`} />
                ))}
            </div>

            {/* Step 1: Type */}
            {step === 1 && (
                <div className="co-step animate-in">
                    <h3 className="mb-3">What do you want to do?</h3>
                    <div className="co-type-grid">
                        <button
                            className={`co-type-btn ${type === 'sell' ? 'active sell' : ''}`}
                            onClick={() => { haptic('selection'); setType('sell'); }}
                        >
                            <span className="co-type-icon">🔴</span>
                            <span className="co-type-label">SELL</span>
                            <span className="co-type-desc">I have crypto, want INR</span>
                        </button>
                        <button
                            className={`co-type-btn ${type === 'buy' ? 'active buy' : ''}`}
                            onClick={() => { haptic('selection'); setType('buy'); }}
                        >
                            <span className="co-type-icon">🟢</span>
                            <span className="co-type-label">BUY</span>
                            <span className="co-type-desc">I have INR, want crypto</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Token */}
            {step === 2 && (
                <div className="co-step animate-in">
                    <h3 className="mb-3">Select Token</h3>
                    <div className="co-token-grid">
                        {TOKENS.map(t => (
                            <button
                                key={t}
                                className={`co-token-btn ${token === t ? 'active' : ''}`}
                                onClick={() => { haptic('selection'); setToken(t); }}
                            >
                                <span className="co-token-name font-mono">{t}</span>
                                <span className="text-xs text-muted">Base Network</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3: Amount */}
            {step === 3 && (
                <div className="co-step animate-in">
                    <h3 className="mb-3">How much {token}?</h3>
                    <div className="co-input-wrap">
                        <input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="co-amount-input font-mono"
                            autoFocus
                        />
                        <span className="co-input-suffix">{token}</span>
                    </div>
                    <div className="co-presets">
                        {[10, 25, 50, 100, 500].map(v => (
                            <button
                                key={v}
                                className="co-preset btn btn-sm btn-secondary"
                                onClick={() => { haptic('light'); setAmount(v.toString()); }}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 4: Rate */}
            {step === 4 && (
                <div className="co-step animate-in">
                    <h3 className="mb-3">INR rate per {token}</h3>
                    <div className="co-input-wrap">
                        <span className="co-input-prefix">₹</span>
                        <input
                            type="number"
                            placeholder="88.00"
                            value={rate}
                            onChange={e => setRate(e.target.value)}
                            className="co-amount-input font-mono"
                            autoFocus
                        />
                    </div>
                    {amount && rate && (
                        <div className="co-total mt-3">
                            <span className="label">Total Fiat</span>
                            <span className="font-mono text-green font-bold">₹{parseFloat(fiatTotal).toLocaleString()}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Step 5: Payment */}
            {step === 5 && (
                <div className="co-step animate-in">
                    <h3 className="mb-3">Payment Methods</h3>
                    <div className="co-methods">
                        {PAYMENT_METHODS.map(m => (
                            <button
                                key={m}
                                className={`co-method-btn ${methods.includes(m) ? 'active' : ''}`}
                                onClick={() => toggleMethod(m)}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 6: Confirm */}
            {step === 6 && (
                <div className="co-step animate-in">
                    <h3 className="mb-3">Confirm Your Ad</h3>
                    <div className="co-summary card">
                        <div className="co-summary-row">
                            <span className="text-muted">Type</span>
                            <span className={type === 'sell' ? 'text-red' : 'text-green'}>
                                {type === 'sell' ? '🔴 SELL' : '🟢 BUY'}
                            </span>
                        </div>
                        <div className="co-summary-row">
                            <span className="text-muted">Token</span>
                            <span className="font-mono">{token}</span>
                        </div>
                        <div className="co-summary-row">
                            <span className="text-muted">Amount</span>
                            <span className="font-mono">{amount} {token}</span>
                        </div>
                        <div className="co-summary-row">
                            <span className="text-muted">Rate</span>
                            <span className="font-mono">₹{parseFloat(rate).toLocaleString()}</span>
                        </div>
                        <div className="co-summary-row">
                            <span className="text-muted">Total</span>
                            <span className="font-mono font-bold text-green">₹{parseFloat(fiatTotal).toLocaleString()}</span>
                        </div>
                        <div className="co-summary-row">
                            <span className="text-muted">Payment</span>
                            <span>{methods.join(', ')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && <div className="co-error">{error}</div>}

            {/* Navigation */}
            <div className="co-nav">
                {step > 1 && (
                    <button className="btn btn-secondary flex-1" onClick={prevStep}>
                        ← Back
                    </button>
                )}
                {step < 6 ? (
                    <button className="btn btn-primary flex-1" onClick={nextStep}>
                        Next →
                    </button>
                ) : (
                    <button
                        className="btn btn-primary flex-1"
                        onClick={submit}
                        disabled={submitting}
                    >
                        {submitting ? <span className="spinner" /> : '✅ Publish Ad'}
                    </button>
                )}
            </div>
        </div>
    );
}
