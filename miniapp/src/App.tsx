import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig, appKit } from './lib/wagmi';
import { setupTelegramApp } from './lib/telegram';
import { useAuth } from './hooks/useAuth';
import { api } from './lib/api';
import { Layout } from './components/Layout';
import { WalletSelector } from './components/WalletSelector';
import { Home } from './pages/Home';
import { Market } from './pages/Market';
import { CreateOrder } from './pages/CreateOrder';
import { TradeDetail } from './pages/TradeDetail';
import { Wallet } from './pages/Wallet';
import { Bridge } from './pages/Bridge';
import { Profile } from './pages/Profile';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30000 },
  },
});

function AppInner() {
  const { user, loading, refreshUser } = useAuth();
  const { address, isConnected } = useAccount();
  const [walletChosen, setWalletChosen] = useState(false);
  const [walletMode, setWalletMode] = useState<'bot' | 'external' | null>(null);

  useEffect(() => {
    setupTelegramApp();
  }, []);

  // When external wallet connects via WalletConnect, save it to backend
  useEffect(() => {
    if (walletMode === 'external' && isConnected && address) {
      // Update the user's wallet address in the backend
      api.wallet.connectExternal(address)
        .then(() => refreshUser())
        .catch((err) => console.error('Failed to save wallet:', err));
    }
  }, [isConnected, address, walletMode]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="logo">P2P KERALA</div>
        <div className="spinner spinner-lg" />
        <span className="text-xs text-muted">Initializing...</span>
      </div>
    );
  }

  // Always show wallet selector first
  if (!walletChosen) {
    return (
      <WalletSelector
        onSelectBot={() => {
          setWalletMode('bot');
          setWalletChosen(true);
        }}
        onSelectExternal={async () => {
          setWalletMode('external');
          // Open Reown/WalletConnect modal
          await appKit.open();
          setWalletChosen(true);
        }}
      />
    );
  }

  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home user={user} />} />
          <Route path="market" element={<Market />} />
          <Route path="create" element={<CreateOrder />} />
          <Route path="trade/:id" element={<TradeDetail />} />
          <Route path="trade/new/:orderId" element={<TradeDetail />} />
          <Route path="wallet" element={<Wallet user={user} />} />
          <Route path="bridge" element={<Bridge />} />
          <Route path="profile" element={<Profile user={user} onUpdate={refreshUser} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppInner />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
