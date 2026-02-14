import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { IconTokenETH, IconTokenUSDC, IconTokenUSDT, IconSend, IconReceive, IconRefresh, IconCopy, IconCheck } from '../components/Icons';
import './Wallet.css';

interface Props {
    user: any;
}

export function Wallet({ user }: Props) {
    const [balances, setBalances] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showSend, setShowSend] = useState(false);
    const [sendTo, setSendTo] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [sendToken, setSendToken] = useState('USDC');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadBalances();
    }, []);

    async function loadBalances() {
        setLoading(true);
        try {
            const data = await api.wallet.getBalances();
            setBalances(data);
        } catch { } finally {
            setLoading(false);
        }
    }

    function copyAddress() {
        if (!balances?.address) return;
        navigator.clipboard.writeText(balances.address);
        setCopied(true);
        haptic('success');
        setTimeout(() => setCopied(false), 2000);
    }

    async function handleSend() {
        if (!sendTo || !sendAmount) return;
        haptic('medium');
        setSending(true);
        setSendResult('');
        try {
            const { txHash } = await api.wallet.send({
                to: sendTo,
                amount: parseFloat(sendAmount),
                token: sendToken,
            });
            setSendResult(`sent:${txHash.slice(0, 12)}...`);
            haptic('success');
            await loadBalances();
            setSendTo('');
            setSendAmount('');
        } catch (err: any) {
            setSendResult(`error:${err.message}`);
            haptic('error');
        } finally {
            setSending(false);
        }
    }

    const tokenIcons: Record<string, React.ReactNode> = {
        ETH: <IconTokenETH size={32} />,
        USDC: <IconTokenUSDC size={32} />,
        USDT: <IconTokenUSDT size={32} />,
    };

    const tokens = [
        { symbol: 'ETH', balance: balances?.eth || '0', usd: '' },
        { symbol: 'USDC', balance: balances?.usdc || '0.00', usd: `≈ $${balances?.usdc || '0.00'}` },
        { symbol: 'USDT', balance: balances?.usdt || '0.00', usd: `≈ $${balances?.usdt || '0.00'}` },
    ];

    return (
        <div className="page animate-in">
            <div className="page-header">
                <h1 className="page-title">Wallet</h1>
                <p className="page-subtitle">Manage your crypto assets</p>
            </div>

            {/* Address */}
            {balances?.address && (
                <div className="w-address card" onClick={copyAddress}>
                    <div className="w-address-label label">Your Address</div>
                    <div className="w-address-value font-mono text-sm truncate">
                        {balances.address}
                    </div>
                    <span className="w-copy-btn text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {copied
                            ? <><IconCheck size={14} color="var(--green)" /> Copied!</>
                            : <><IconCopy size={14} /> Tap to copy</>
                        }
                    </span>
                </div>
            )}

            {/* Tokens */}
            <div className="w-tokens">
                {tokens.map(t => (
                    <div key={t.symbol} className="w-token card">
                        <div className="w-token-left">
                            <span className="w-token-icon">{tokenIcons[t.symbol]}</span>
                            <div className="w-token-info">
                                <span className="w-token-symbol font-mono font-bold">{t.symbol}</span>
                                <span className="text-xs text-muted">Base Network</span>
                            </div>
                        </div>
                        <div className="w-token-right text-right">
                            {loading ? (
                                <div className="skeleton" style={{ width: 80, height: 20 }} />
                            ) : (
                                <>
                                    <span className="w-token-bal font-mono font-bold">
                                        {t.symbol === 'ETH' ? parseFloat(t.balance).toFixed(5) : t.balance}
                                    </span>
                                    {t.usd && <span className="text-xs text-muted">{t.usd}</span>}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="w-actions">
                {user?.wallet_type !== 'external' ? (
                    <button
                        className="btn btn-primary flex-1"
                        onClick={() => { haptic('medium'); setShowSend(!showSend); }}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                        <IconSend size={16} /> Send
                    </button>
                ) : (
                    <div className="btn btn-secondary flex-1" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.7, cursor: 'default' }}>
                        <IconSend size={16} /> Use wallet app to send
                    </div>
                )}
                <button className="btn btn-secondary flex-1" onClick={copyAddress} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <IconReceive size={16} /> Receive
                </button>
                <button className="btn btn-secondary flex-1" onClick={() => { haptic('light'); loadBalances(); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <IconRefresh size={16} />
                </button>
            </div>

            {/* Send Form */}
            {showSend && (
                <div className="w-send card animate-slide-up mt-3">
                    <h3 className="mb-3">Send Crypto</h3>
                    <div className="flex gap-2 mb-2">
                        {['USDC', 'USDT', 'ETH'].map(t => (
                            <button
                                key={t}
                                className={`btn btn-sm ${sendToken === t ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => { haptic('selection'); setSendToken(t); }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <input
                        placeholder="Recipient address (0x...)"
                        value={sendTo}
                        onChange={e => setSendTo(e.target.value)}
                        className="mb-2"
                    />
                    <input
                        type="number"
                        placeholder="Amount"
                        value={sendAmount}
                        onChange={e => setSendAmount(e.target.value)}
                        className="mb-3"
                    />
                    <button
                        className="btn btn-primary btn-block"
                        onClick={handleSend}
                        disabled={sending || !sendTo || !sendAmount}
                    >
                        {sending ? <span className="spinner" /> : `Send ${sendToken}`}
                    </button>
                    {sendResult && (
                        <div className={`mt-2 text-sm ${sendResult.startsWith('sent:') ? 'text-green' : 'text-red'}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {sendResult.startsWith('sent:')
                                ? <><IconCheck size={14} color="var(--green)" /> Sent! TX: {sendResult.replace('sent:', '')}</>
                                : <>{sendResult.replace('error:', '')}</>
                            }
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
