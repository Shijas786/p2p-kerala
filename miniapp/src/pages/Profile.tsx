import { useState } from 'react';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { IconPhone, IconLock, IconInfo, IconCheck, IconWarning } from '../components/Icons';
import './Profile.css';

interface Props {
    user: any;
    onUpdate: () => void;
}

export function Profile({ user, onUpdate }: Props) {
    const [upiInput, setUpiInput] = useState(user?.upi_id || '');
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    async function saveUpi() {
        if (!upiInput || !upiInput.includes('@')) {
            setMessage('error:Enter a valid UPI ID (e.g. name@upi)');
            return;
        }
        haptic('medium');
        setSaving(true);
        setMessage('');
        try {
            await api.profile.update({ upi_id: upiInput });
            haptic('success');
            setMessage('success:UPI updated!');
            setEditing(false);
            onUpdate();
        } catch (err: any) {
            setMessage(`error:${err.message}`);
            haptic('error');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="page animate-in">
            <div className="page-header">
                <h1 className="page-title">Profile</h1>
            </div>

            {/* User Card */}
            <div className="p-user card-glass glow-green">
                <div className="p-avatar">
                    {user?.first_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="p-user-info">
                    <h2>{user?.first_name || 'User'}</h2>
                    {user?.username && <span className="text-sm text-muted">@{user.username}</span>}
                </div>
                <span className={`badge badge-green`}>
                    {user?.tier?.toUpperCase() || 'STANDARD'}
                </span>
            </div>

            {/* Stats Grid */}
            <div className="p-stats">
                <div className="p-stat">
                    <span className="p-stat-value font-mono">{user?.trust_score || 100}%</span>
                    <span className="label">Trust Score</span>
                </div>
                <div className="p-stat">
                    <span className="p-stat-value font-mono">{user?.completed_trades || 0}</span>
                    <span className="label">Trades</span>
                </div>
                <div className="p-stat">
                    <span className="p-stat-value font-mono">{user?.trade_count || 0}</span>
                    <span className="label">Total</span>
                </div>
                <div className="p-stat">
                    <span className="p-stat-value">
                        {user?.is_verified
                            ? <IconCheck size={20} color="var(--green)" />
                            : <IconWarning size={20} color="var(--red)" />
                        }
                    </span>
                    <span className="label">Verified</span>
                </div>
            </div>

            {/* UPI Section */}
            <div className="p-section card">
                <div className="flex items-center justify-between mb-2">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconPhone size={18} /> UPI ID
                    </h3>
                    {!editing && (
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => { haptic('light'); setEditing(true); }}
                        >
                            {user?.upi_id ? 'Change' : 'Set Up'}
                        </button>
                    )}
                </div>

                {editing ? (
                    <div>
                        <input
                            placeholder="yourname@upi"
                            value={upiInput}
                            onChange={e => setUpiInput(e.target.value)}
                            className="mb-2"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button className="btn btn-primary flex-1" onClick={saveUpi} disabled={saving}>
                                {saving ? <span className="spinner" /> : 'Save'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="font-mono text-sm">
                        {user?.upi_id || <span className="text-muted">Not set — required for fiat trading</span>}
                    </p>
                )}

                {message && (
                    <div className={`mt-2 text-sm ${message.startsWith('success:') ? 'text-green' : 'text-red'}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {message.startsWith('success:')
                            ? <><IconCheck size={14} color="var(--green)" /> {message.replace('success:', '')}</>
                            : <>{message.replace('error:', '')}</>
                        }
                    </div>
                )}
            </div>

            {/* Wallet Type */}
            <div className="p-section card">
                <h3 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconLock size={18} /> Wallet Type
                </h3>
                <div className="flex items-center gap-3">
                    <span className="text-sm">
                        {user?.wallet_address
                            ? `${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-6)}`
                            : 'No wallet connected'
                        }
                    </span>
                    <span className="badge badge-green text-xs">Bot Wallet</span>
                </div>
            </div>

            {/* Account Info */}
            <div className="p-section card">
                <h3 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconInfo size={18} /> Account
                </h3>
                <div className="p-account-rows">
                    <div className="p-account-row">
                        <span className="text-muted">Telegram ID</span>
                        <span className="font-mono text-sm">{user?.telegram_id}</span>
                    </div>
                    <div className="p-account-row">
                        <span className="text-muted">Member Since</span>
                        <span className="text-sm">
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                        </span>
                    </div>
                    <div className="p-account-row">
                        <span className="text-muted">Network</span>
                        <span className="text-sm">Base (Mainnet)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
