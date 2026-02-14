// API client for Mini App backend
import { getInitData } from './telegram';

const API_BASE = '/api/miniapp';



async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const initData = getInitData();

    // 15-second timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': initData,
                ...options.headers,
            },
        });

        if (!res.ok) {
            let errorMsg = `Request failed: ${res.status}`;
            try {
                const body = await res.json();
                errorMsg = body.error || errorMsg;
            } catch {
                // Response wasn't JSON, use status text
                errorMsg = res.statusText || errorMsg;
            }
            throw new Error(errorMsg);
        }

        return res.json();
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ---- Auth ----
export const api = {
    auth: {
        login: () => request<{ user: any; token?: string }>('/auth', { method: 'POST' }),
    },

    // ---- Wallet ----
    wallet: {
        getBalances: () => request<{ eth: string; usdc: string; usdt: string; address: string }>('/wallet/balances'),
        send: (data: { to: string; amount: number; token: string }) =>
            request<{ txHash: string }>('/wallet/send', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        connectExternal: (address: string) =>
            request<{ success: boolean }>('/wallet/connect', {
                method: 'POST',
                body: JSON.stringify({ address }),
            }),
    },

    // ---- Orders ----
    orders: {
        list: (type?: 'buy' | 'sell') =>
            request<{ orders: any[] }>(`/orders${type ? `?type=${type}` : ''}`),
        create: (data: {
            type: 'buy' | 'sell';
            token: string;
            amount: number;
            rate: number;
            payment_methods: string[];
        }) =>
            request<{ order: any }>('/orders', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        cancel: (id: string) =>
            request<{ success: boolean }>(`/orders/${id}/cancel`, { method: 'POST' }),
        mine: () => request<{ orders: any[] }>('/orders/mine'),
    },

    // ---- Trades ----
    trades: {
        list: () => request<{ trades: any[] }>('/trades'),
        create: (orderId: string, amount: number) =>
            request<{ trade: any }>('/trades', {
                method: 'POST',
                body: JSON.stringify({ order_id: orderId, amount }),
            }),
        confirmPayment: (id: string) =>
            request<{ success: boolean }>(`/trades/${id}/confirm-payment`, { method: 'POST' }),
        confirmReceipt: (id: string) =>
            request<{ success: boolean }>(`/trades/${id}/confirm-receipt`, { method: 'POST' }),
        dispute: (id: string, reason: string) =>
            request<{ success: boolean }>(`/trades/${id}/dispute`, {
                method: 'POST',
                body: JSON.stringify({ reason }),
            }),
        getById: (id: string) => request<{ trade: any }>(`/trades/${id}`),
    },

    // ---- Profile ----
    profile: {
        get: () => request<{ user: any }>('/profile'),
        update: (data: { upi_id?: string }) =>
            request<{ user: any }>('/profile', {
                method: 'PUT',
                body: JSON.stringify(data),
            }),
    },

    // ---- Bridge ----
    bridge: {
        getQuote: (data: {
            fromChainId: number;
            toChainId: number;
            fromToken: string;
            toToken: string;
            amount: string;
        }) =>
            request<any>('/bridge/quote', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
    },

    // ---- Stats ----
    stats: {
        get: () => request<{ total_users: number; total_volume_usdc: number; active_orders: number }>('/stats'),
    },
};
