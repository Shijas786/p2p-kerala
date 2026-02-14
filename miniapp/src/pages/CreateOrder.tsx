import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useSwitchChain } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseUnits, formatUnits } from 'viem';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { CONTRACTS, ESCROW_ABI, ERC20_ABI } from '../lib/contracts';
import { wagmiConfig } from '../lib/wagmi';
import { useAuth } from '../hooks/useAuth';
import './CreateOrder.css';

const PAYMENT_METHODS = ['UPI', 'IMPS', 'NEFT', 'PAYTM', 'BANK'];

export function CreateOrder() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { address, isConnected, chain: walletChain } = useAccount();
    const { switchChain } = useSwitchChain();
    const [step, setStep] = useState(1);
    const [type, setType] = useState<'sell' | 'buy'>('sell');
    const [token, setToken] = useState('USDC');
    const [chain, setChain] = useState('base'); // base | bsc
    const [amount, setAmount] = useState('');
    const [rate, setRate] = useState('');
    const [methods, setMethods] = useState<string[]>(['UPI']);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [txStep, setTxStep] = useState<'idle' | 'approving' | 'depositing' | 'creating'>('idle');

    // Decimal logic synchronized with backend EscrowService
    const getDecimals = () => {
        if (chain === 'base' && (token === 'USDC' || token === 'USDT')) return 6;
        return 18;
    };
    const decimals = getDecimals();

    // Wagmi: Contract Interactions
    const targetChainId = chain === 'bsc' ? 56 : 8453;
    const isCorrectChain = walletChain?.id === targetChainId;

    const tokenAddress = (CONTRACTS as any)[chain]?.tokens[token];
    const escrowAddress = (CONTRACTS as any)[chain]?.escrow;

    // 1. Check Vault Balance
    const { data: vaultBalance } = useReadContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'balances',
        args: address && tokenAddress ? [address, tokenAddress] : undefined,
        query: {
            enabled: !!address && !!tokenAddress && !!escrowAddress && type === 'sell'
        }
    });

    // 2. Check ERC20 Allowance
    const { data: allowance } = useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address && escrowAddress ? [address, escrowAddress] : undefined,
        query: {
            enabled: !!address && !!tokenAddress && !!escrowAddress && type === 'sell'
        }
    });

    const { writeContractAsync } = useWriteContract();

    const TOKENS_BY_CHAIN: Record<string, string[]> = {
        base: ['USDC', 'USDT'],
        bsc: ['USDC', 'USDT']
    };

    const needsDeposit = type === 'sell' && isConnected && vaultBalance !== undefined && amount &&
        parseFloat(formatUnits(vaultBalance as bigint, decimals)) < parseFloat(amount);

    const needsApproval = needsDeposit && allowance !== undefined && amount &&
        parseFloat(formatUnits(allowance as bigint, decimals)) < parseFloat(amount);

    function toggleMethod(m: string) {
        haptic('selection');
        setMethods(prev =>
            prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
        );
    }

    function nextStep() {
        haptic('light');
        if (step === 1 && !type) return;
        if (step === 2 && !token) return;
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
            // ─── EXTERNAL WALLET FLOW ───
            if (isConnected && type === 'sell') {
                if (!isCorrectChain) {
                    setError(`Please switch to ${chain === 'bsc' ? 'BSC' : 'Base'} network`);
                    await switchChain({ chainId: targetChainId });
                    setSubmitting(false);
                    return;
                }

                // Security check: Match backend account address with connected wallet
                if (user?.wallet_address && user.wallet_address.toLowerCase() !== address?.toLowerCase()) {
                    setError(`Wallet mismatch! Account uses: ${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}. Switch wallet to use these funds.`);
                    setSubmitting(false);
                    return;
                }

                const amountUnits = parseUnits(amount, decimals);

                // 1. Approve if needed
                if (needsApproval) {
                    setTxStep('approving');
                    const hash = await writeContractAsync({
                        address: tokenAddress,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [escrowAddress, amountUnits],
                    });
                    console.log('Approval Sent:', hash);
                    await waitForTransactionReceipt(wagmiConfig, { hash, chainId: targetChainId });
                    console.log('Approval Confirmed');
                }

                // 2. Deposit if needed
                if (needsDeposit) {
                    setTxStep('depositing');
                    const hash = await writeContractAsync({
                        address: escrowAddress,
                        abi: ESCROW_ABI,
                        functionName: 'deposit',
                        args: [tokenAddress, amountUnits],
                    });
                    console.log('Deposit Sent:', hash);
                    await waitForTransactionReceipt(wagmiConfig, { hash, chainId: targetChainId });
                    console.log('Deposit Confirmed');
                }
            }

            // ─── BACKEND API CALL ───
            setTxStep('creating');
            await api.orders.create({
                type,
                token,
                chain,
                amount: parseFloat(amount),
                rate: parseFloat(rate),
                payment_methods: methods,
            });

            haptic('success');
            navigate('/market');
        } catch (err: any) {
            console.error(err);
            // Wagmi errors often have a shortMessage
            setError(err.shortMessage || err.message || 'Failed to create order');
            haptic('error');
        } finally {
            setSubmitting(false);
            setTxStep('idle');
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
                    <h3 className="mb-3 text-center">What do you want to do?</h3>
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

            {/* Step 2: Chain & Token */}
            {step === 2 && (
                <div className="co-step animate-in">
                    <h3 className="mb-2">Select Network</h3>
                    <div className="flex gap-2 mb-4">
                        <button className={`btn btn-sm ${chain === 'base' ? 'btn-primary' : 'btn-secondary'} flex-1`} onClick={() => { setChain('base'); setToken('USDC'); }}>Base</button>
                        <button className={`btn btn-sm ${chain === 'bsc' ? 'btn-primary' : 'btn-secondary'} flex-1`} onClick={() => { setChain('bsc'); setToken('USDT'); }}>BSC</button>
                    </div>

                    <h3 className="mb-3">Select Token</h3>
                    <div className="co-token-grid">
                        {TOKENS_BY_CHAIN[chain].map(t => (
                            <button
                                key={t}
                                className={`co-token-btn ${token === t ? 'active' : ''}`}
                                onClick={() => { haptic('selection'); setToken(t); }}
                            >
                                <span className="co-token-name font-mono">{t}</span>
                                <span className="text-xs text-muted">{chain.toUpperCase()}</span>
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
                    <div className="co-presets grid-3">
                        {['10', '50', '100'].map(p => (
                            <button key={p} className="btn-preset" onClick={() => setAmount(p)}>{p}</button>
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
                            <span className="text-muted">Network</span>
                            <span className="font-bold">{chain.toUpperCase()}</span>
                        </div>
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
                        <div className="co-summary-row border-t pt-2 mt-2">
                            <span className="text-muted">Total (Approx)</span>
                            <span className="font-mono font-bold text-green">₹{parseFloat(fiatTotal).toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Vault Check for Externals */}
                    {type === 'sell' && isConnected && (
                        <div className="co-vault-status card mt-3 border-green">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-muted uppercase">Vault Balance</span>
                                <span className={`text-sm font-mono ${needsDeposit ? 'text-orange' : 'text-green'}`}>
                                    {vaultBalance ? formatUnits(vaultBalance as bigint, decimals) : '0.00'} {token}
                                </span>
                            </div>
                            {needsDeposit && (
                                <p className="text-[10px] text-orange italic">
                                    Insufficient balance. You will need to deposit during the final step.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="co-error animate-fade-in">
                    <span className="mr-1">⚠️</span> {error}
                </div>
            )}

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
                        className={`btn flex-1 ${needsDeposit ? 'btn-warn' : 'btn-primary'}`}
                        onClick={submit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <div className="flex items-center gap-2">
                                <span className="spinner" />
                                <span className="text-xs uppercase font-bold">
                                    {txStep === 'approving' ? 'Approving...' :
                                        txStep === 'depositing' ? 'Depositing...' :
                                            txStep === 'creating' ? 'Publishing...' : 'Working...'}
                                </span>
                            </div>
                        ) : (
                            needsDeposit ? `Deposit & Publish` : '✅ Publish Ad'
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
