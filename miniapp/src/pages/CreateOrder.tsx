import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useSwitchChain } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseUnits, formatUnits } from 'viem';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { CONTRACTS, ESCROW_ABI, ERC20_ABI } from '../lib/contracts';
import { wagmiConfig, appKit } from '../lib/wagmi';
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
    const isExternalUser = user?.wallet_type === 'external';
    const escrowAddress = (CONTRACTS as any)[chain]?.escrow;
    const effectiveAddress = (isExternalUser ? address : user?.wallet_address) as `0x${string}` | undefined;

    // 1. Check Vault Balance
    const { data: vaultBalance, isLoading: loadingVault } = useReadContract({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'balances',
        args: effectiveAddress && tokenAddress ? [effectiveAddress, tokenAddress] : undefined,
        chainId: targetChainId,
        query: {
            enabled: !!effectiveAddress && !!tokenAddress && !!escrowAddress && type === 'sell'
        }
    });

    // 2. Check ERC20 Allowance
    const { data: allowance, isLoading: loadingAllowance } = useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address && escrowAddress ? [address, escrowAddress] : undefined,
        chainId: targetChainId,
        query: {
            enabled: !!address && !!tokenAddress && !!escrowAddress && type === 'sell' && isExternalUser
        }
    });

    const { writeContractAsync } = useWriteContract();

    const TOKENS_BY_CHAIN: Record<string, string[]> = {
        base: ['USDC', 'USDT'],
        bsc: ['USDC', 'USDT']
    };

    const [reserved, setReserved] = useState(0);
    useEffect(() => {
        if (type === 'sell') {
            api.wallet.getBalances().then(data => {
                const res = chain === 'base' ? data.vault_base_reserved : data.vault_bsc_reserved;
                setReserved(parseFloat(res || '0'));
            }).catch(console.error);
        }
    }, [type, chain]);

    const physicalBalance = vaultBalance !== undefined ? parseFloat(formatUnits(vaultBalance as bigint, decimals)) : 0;
    const availableBalance = physicalBalance - reserved;

    const needsDeposit = type === 'sell' && vaultBalance !== undefined && amount &&
        availableBalance < parseFloat(amount);

    const needsApproval = needsDeposit && isExternalUser && allowance !== undefined && amount &&
        parseFloat(formatUnits(allowance as bigint, decimals)) < parseFloat(amount);

    // Guard: Wait for balance info if sell, AND wait for connection if we know we are an external user
    const isDataLoading = (type === 'sell') && (loadingVault || (isExternalUser && (loadingAllowance || !isConnected)));

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
        if (isDataLoading) return;
        haptic('medium');
        setSubmitting(true);
        setError('');

        try {
            // ─── EXTERNAL WALLET FLOW ───
            if (isExternalUser && type === 'sell') {
                if (!isConnected || !address) {
                    setError("External wallet disconnected. Please reconnect.");
                    appKit.open();
                    setSubmitting(false);
                    return;
                }

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
                console.log('[DEBUG] VaultBalance:', vaultBalance ? formatUnits(vaultBalance as bigint, decimals) : 'N/A');
                console.log('[DEBUG] Allowance:', allowance ? formatUnits(allowance as bigint, decimals) : 'N/A');
                console.log('[DEBUG] Target:', amount);

                // 1. Approve if needed
                if (needsApproval) {
                    setTxStep('approving');
                    const hash = await writeContractAsync({
                        address: tokenAddress,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [escrowAddress, amountUnits],
                        chainId: targetChainId,
                    });
                    console.log('Approval Sent:', hash);
                    await waitForTransactionReceipt(wagmiConfig, { hash, chainId: targetChainId });
                    // Allowance might not update instantly in hooks, so we might need a manual refetch or trust logic
                }

                // 2. Deposit if needed
                if (needsDeposit) {
                    setTxStep('depositing');
                    const hash = await writeContractAsync({
                        address: escrowAddress,
                        abi: ESCROW_ABI,
                        functionName: 'deposit',
                        args: [tokenAddress, amountUnits],
                        chainId: targetChainId,
                    });
                    console.log('Deposit Sent:', hash);
                    await waitForTransactionReceipt(wagmiConfig, { hash, chainId: targetChainId });
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
                <p className="page-subtitle text-muted">List your buy/sell order on the marketplace</p>
            </div>

            <div className="co-form-container">
                {/* 1. Basic Info Section */}
                <div className="co-section card-glass">
                    <div className="co-section-title">1. Type & Network</div>

                    <div className="flex gap-2 mb-3">
                        <button
                            className={`btn-toggle-type flex-1 ${type === 'sell' ? 'active sell' : ''}`}
                            onClick={() => { haptic('selection'); setType('sell'); }}
                        >
                            🔴 SELL
                        </button>
                        <button
                            className={`btn-toggle-type flex-1 ${type === 'buy' ? 'active buy' : ''}`}
                            onClick={() => { haptic('selection'); setType('buy'); }}
                        >
                            🟢 BUY
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            className={`btn-toggle-net flex-1 ${chain === 'base' ? 'active' : ''}`}
                            onClick={() => { setChain('base'); setToken('USDC'); }}
                        >
                            Base
                        </button>
                        <button
                            className={`btn-toggle-net flex-1 ${chain === 'bsc' ? 'active' : ''}`}
                            onClick={() => { setChain('bsc'); setToken('USDT'); }}
                        >
                            BSC
                        </button>
                    </div>
                </div>

                {/* 2. Token & Amount Section */}
                <div className="co-section card-glass">
                    <div className="co-section-title">2. Token & Amount</div>

                    <div className="co-token-row mb-3">
                        {TOKENS_BY_CHAIN[chain].map(t => (
                            <button
                                key={t}
                                className={`co-token-pill ${token === t ? 'active' : ''}`}
                                onClick={() => { haptic('selection'); setToken(t); }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="co-input-group">
                        <input
                            type="number"
                            placeholder="Amount"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="co-input-flat font-mono"
                        />
                        <span className="co-input-label">{token}</span>
                    </div>

                    <div className="co-presets-row mt-2">
                        {['10', '50', '100', '500'].map(p => (
                            <button key={p} className="btn-preset-sm" onClick={() => setAmount(p)}>{p}</button>
                        ))}
                    </div>
                </div>

                {/* 3. Rate & Payment Section */}
                <div className="co-section card-glass">
                    <div className="co-section-title">3. Rate & Payment</div>

                    <div className="co-input-group mb-3">
                        <span className="co-input-label">₹</span>
                        <input
                            type="number"
                            placeholder="Rate (e.g. 88.50)"
                            value={rate}
                            onChange={e => setRate(e.target.value)}
                            className="co-input-flat font-mono"
                        />
                        <span className="co-input-label">/ {token}</span>
                    </div>

                    <div className="co-payment-grid">
                        {PAYMENT_METHODS.map(m => (
                            <button
                                key={m}
                                className={`co-method-chip ${methods.includes(m) ? 'active' : ''}`}
                                onClick={() => toggleMethod(m)}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary Card */}
                {amount && rate && (
                    <div className="co-summary-mini card-glass glow-green">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted uppercase">Total Fiat</span>
                            <span className="font-mono font-bold text-green text-lg">
                                ₹{parseFloat(fiatTotal).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}

                {/* Vault Monitoring (Sell Only) */}
                {type === 'sell' && (
                    <div className={`co-vault-box card-glass ${needsDeposit ? 'border-orange' : 'border-green'}`}>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted uppercase">Available Vault Balance</span>
                            <span className={needsDeposit ? 'text-orange' : 'text-green'}>
                                {vaultBalance !== undefined ? availableBalance.toFixed(2) : '...'} {token}
                            </span>
                        </div>
                        {needsDeposit && (
                            <div className="text-[10px] text-orange mt-1 italic">
                                ⚠️ Insufficient balance. {isExternalUser ? 'Will deposit during publish.' : 'Deposit in Wallet first.'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="co-error-banner animate-shake">
                    <span>⚠️</span> {error}
                </div>
            )}

            {/* Final Action Button */}
            <div className="co-action-footer">
                <button
                    className={`btn-publish ${needsDeposit && !isExternalUser ? 'disabled' : ''}`}
                    onClick={() => {
                        if (isExternalUser) {
                            if (!isConnected) {
                                appKit.open();
                            } else {
                                submit();
                            }
                        } else {
                            if (needsDeposit) {
                                navigate('/wallet');
                            } else {
                                submit();
                            }
                        }
                    }}
                    disabled={submitting || (type === 'sell' && (loadingVault || (isExternalUser && loadingAllowance)))}
                >
                    {submitting ? (
                        <div className="flex items-center gap-2 justify-center">
                            <span className="spinner-white" />
                            <span>{txStep.toUpperCase()}...</span>
                        </div>
                    ) : (type === 'sell' && (loadingVault || (isExternalUser && loadingAllowance))) ? (
                        <div className="flex items-center gap-2 justify-center">
                            <span className="spinner-white" />
                            <span>CHECKING BALANCE...</span>
                        </div>
                    ) : (isExternalUser && !isConnected) ? (
                        '🔌 CONNECT WALLET'
                    ) : (
                        needsDeposit ? (isExternalUser ? `DEPOSIT & PUBLISH` : 'INSUFFICIENT BALANCE') : '🚀 PUBLISH AD'
                    )}
                </button>
            </div>
        </div>
    );
}
