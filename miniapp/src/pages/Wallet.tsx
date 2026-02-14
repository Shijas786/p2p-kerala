import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { IconTokenETH, IconTokenUSDC, IconTokenUSDT, IconSend, IconReceive, IconRefresh, IconCopy, IconCheck, IconLock } from '../components/Icons';
import './Wallet.css';
import { useAccount, useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import EscrowABI from '../abis/EscrowABI.json';
import ERC20ABI from '../abis/ERC20ABI.json';
import { ESCROW_ADDRESS, USDC_ADDRESS } from '../constants';

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

    // Vault State
    const [vaultBaseUsdc, setVaultBaseUsdc] = useState('0.00');
    const [vaultBscUsdc, setVaultBscUsdc] = useState('0.00');
    const [showDeposit, setShowDeposit] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [vaultAmount, setVaultAmount] = useState('');
    const [vaultChain, setVaultChain] = useState('base'); // base | bsc
    const [vaultLoading, setVaultLoading] = useState(false);
    const [vaultError, setVaultError] = useState('');
    const [vaultSuccess, setVaultSuccess] = useState('');

    // Wagmi
    const { address: externalAddress } = useAccount();
    const { writeContractAsync } = useWriteContract();

    useEffect(() => {
        loadBalances();
    }, []);

    async function loadBalances() {
        setLoading(true);
        try {
            const data = await api.wallet.getBalances();
            setBalances(data);
            setVaultBaseUsdc(data.vault_base_usdc || '0.00');
            setVaultBscUsdc(data.vault_bsc_usdc || '0.00');
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
                chain: (sendToken === 'BNB' || sendToken.includes('BSC')) ? 'bsc' : 'base'
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

    async function handleDeposit() {
        if (!vaultAmount || parseFloat(vaultAmount) <= 0) return;
        setVaultLoading(true);
        setVaultError('');
        setVaultSuccess('');

        try {
            const amount = parseFloat(vaultAmount);
            // TODO: External wallet deposit for BSC? usage of wagmi might need chain switching
            if (user?.wallet_type === 'external') {
                setVaultError("External wallet deposit only supported for Base for now. Please use bot wallet or wait for update.");
                return;
            }

            // Bot Wallet
            await api.wallet.depositToVault(amount, 'USDC', vaultChain);
            setVaultSuccess('Deposit successful!');

            haptic('success');
            setVaultAmount('');
            setTimeout(() => {
                setShowDeposit(false);
                loadBalances();
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setVaultError(err.message || 'Deposit failed');
            haptic('error');
        } finally {
            setVaultLoading(false);
        }
    }

    async function handleWithdraw() {
        if (!vaultAmount || parseFloat(vaultAmount) <= 0) return;
        setVaultLoading(true);
        setVaultError('');
        setVaultSuccess('');

        try {
            const amount = parseFloat(vaultAmount);

            if (user?.wallet_type === 'external') {
                setVaultError("Custom wallet withdraw not fully supported yet.");
                return;
            }

            // Bot Wallet
            await api.wallet.withdrawFromVault(amount, 'USDC', vaultChain);
            setVaultSuccess('Withdrawal successful!');

            haptic('success');
            setVaultAmount('');
            setTimeout(() => {
                setShowWithdraw(false);
                loadBalances();
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setVaultError(err.message || 'Withdrawal failed');
            haptic('error');
        } finally {
            setVaultLoading(false);
        }
    }

    const tokenIcons: Record<string, React.ReactNode> = {
        ETH: <IconTokenETH size={32} />,
        USDC: <IconTokenUSDC size={32} />,
        USDT: <IconTokenUSDT size={32} />,
        BNB: <div style={{ width: 32, height: 32, background: '#F0B90B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 10, color: 'black' }}>BNB</div>,
    };

    const tokens = [
        { symbol: 'ETH', balance: balances?.eth || '0', name: 'Base' },
        { symbol: 'USDC', balance: balances?.usdc || '0.00', name: 'Base' },
        { symbol: 'USDT', balance: balances?.usdt || '0.00', name: 'Base' },
        { symbol: 'BNB', balance: balances?.bnb || '0', name: 'BSC' },
        { symbol: 'USDC (BSC)', balance: balances?.bsc_usdc || '0.00', name: 'BSC', icon: 'USDC' },
        { symbol: 'USDT (BSC)', balance: balances?.bsc_usdt || '0.00', name: 'BSC', icon: 'USDT' },
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
                </div>
            )}

            {/* Vault Section */}
            <div className="w-vault card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <IconLock size={20} color="var(--primary)" />
                        <span className="font-bold">P2P Vault</span>
                    </div>
                    <div className="text-xs text-muted">Upfront Locking</div>
                </div>
                <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-mono font-bold text-white">{vaultBaseUsdc} USDC <span className="text-xs text-muted">(Base)</span></div>
                </div>
                <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-mono font-bold text-white">{vaultBscUsdc} USDC <span className="text-xs text-muted">(BSC)</span></div>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-sm btn-primary flex-1" onClick={() => { setShowDeposit(true); setVaultAmount(''); setVaultError(''); setVaultSuccess(''); }}>
                        Deposit
                    </button>
                    <button className="btn btn-sm btn-secondary flex-1" onClick={() => { setShowWithdraw(true); setVaultAmount(''); setVaultError(''); setVaultSuccess(''); }}>
                        Withdraw
                    </button>
                </div>
            </div>

            {/* Vault Modals */}
            {(showDeposit || showWithdraw) && (
                <div className="modal-overlay" onClick={() => { setShowDeposit(false); setShowWithdraw(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{showDeposit ? 'Deposit to Vault' : 'Withdraw from Vault'}</h3>

                        <div className="flex gap-2 mb-4 mt-2">
                            <button className={`btn btn-sm ${vaultChain === 'base' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setVaultChain('base')}>Base</button>
                            <button className={`btn btn-sm ${vaultChain === 'bsc' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setVaultChain('bsc')}>BSC</button>
                        </div>

                        <p className="text-sm text-muted mb-4">
                            {showDeposit
                                ? `Lock USDC on ${vaultChain.toUpperCase()} to create sell ads.`
                                : `Withdraw USDC on ${vaultChain.toUpperCase()} back to wallet.`}
                        </p>

                        <input
                            type="number"
                            placeholder="Amount (USDC)"
                            value={vaultAmount}
                            onChange={e => setVaultAmount(e.target.value)}
                            className="mb-4 input-lg"
                            autoFocus
                        />

                        {vaultError && <div className="text-red text-sm mb-3">{vaultError}</div>}
                        {vaultSuccess && <div className="text-green text-sm mb-3">{vaultSuccess}</div>}

                        <button
                            className="btn btn-primary btn-block mb-2"
                            onClick={showDeposit ? handleDeposit : handleWithdraw}
                            disabled={vaultLoading}
                        >
                            {vaultLoading ? <span className="spinner" /> : (showDeposit ? 'Confirm Deposit' : 'Confirm Withdraw')}
                        </button>
                        <button
                            className="btn btn-text btn-block"
                            onClick={() => { setShowDeposit(false); setShowWithdraw(false); }}
                            disabled={vaultLoading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Tokens */}
            <div className="w-tokens mt-4">
                <h3 className="mb-2 text-sm text-muted">Wallet Balances</h3>
                {tokens.map(t => (
                    <div key={t.symbol} className="w-token card">
                        <div className="w-token-left">
                            <span className="w-token-icon">{tokenIcons[t.icon || t.symbol]}</span>
                            <div className="w-token-info">
                                <span className="w-token-symbol font-mono font-bold">{t.symbol}</span>
                                <span className="text-xs text-muted">{t.name}</span>
                            </div>
                        </div>
                        <div className="w-token-right text-right">
                            {loading ? (
                                <div className="skeleton" style={{ width: 80, height: 20 }} />
                            ) : (
                                <span className="w-token-bal font-mono font-bold">
                                    {t.symbol === 'ETH' || t.symbol === 'BNB' ? parseFloat(t.balance).toFixed(5) : t.balance}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="w-actions mt-4">
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
                        External
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
                    <div className="flex gap-2 mb-2 flex-wrap">
                        {['USDC', 'USDT', 'ETH', 'BNB'].map(t => (
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
                                ? <><IconCheck size={14} color="var(--green)" /> Sent!</>
                                : <>{sendResult.replace('error:', '')}</>
                            }
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
