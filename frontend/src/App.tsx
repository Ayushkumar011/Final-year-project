import React, { useEffect, useState } from 'react';
import { createUser, getWallet, getPnl, getAnalytics, getEquityCurve } from './api';
import type { User, Wallet, PortfolioPnLResponse, AnalyticsResponse, PortfolioSnapshot } from './api';
import TradingChart from './components/TradingChart';
import OrderBook from './components/OrderBook';
import WalletDashboard from './components/WalletDashboard';
import OrderForm from './components/OrderForm';
import OrderHistory from './components/OrderHistory';
import AnimatedBackground from './components/AnimatedBackground';
import GlassCard from './components/GlassCard';
import PerformanceAnalytics from './components/PerformanceAnalytics';
import OpenPositions from './components/OpenPositions';
import EquityCurve from './components/EquityCurve';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [pnl, setPnl] = useState<PortfolioPnLResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [equityData, setEquityData] = useState<PortfolioSnapshot[]>([]);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const availableSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'SHIBUSDT'];

  useEffect(() => {
    createUser('sim_user')
      .then(u => {
        setUser(u);
        return Promise.all([getWallet(u.id), getPnl(u.id), getAnalytics(u.id), getEquityCurve(u.id)]);
      })
      .then(([w, p, a, e]) => {
        setWallet(w);
        setPnl(p);
        setAnalytics(a);
        setEquityData(e);
      })
      .catch(console.error);
  }, []);

  const refreshData = () => {
    if (user) {
      Promise.all([getWallet(user.id), getPnl(user.id), getAnalytics(user.id), getEquityCurve(user.id)])
        .then(([w, p, a, e]) => {
            setWallet(w);
            setPnl(p);
            setAnalytics(a);
            setEquityData(e);
        })
        .catch(console.error);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
        Promise.all([getWallet(user.id), getPnl(user.id), getAnalytics(user.id), getEquityCurve(user.id)])
            .then(([w, p, a, e]) => {
                setWallet(w);
                setPnl(p);
                setAnalytics(a);
                setEquityData(e);
            })
            .catch(console.error);
        setRefreshTrigger(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return <div className="h-screen flex items-center justify-center bg-crypto-bg text-white">Initializing Simulator...</div>;

  return (
    <div className="min-h-screen text-crypto-text font-sans p-4 md:p-8 relative">
      <AnimatedBackground />
      <div className="max-w-[1400px] mx-auto space-y-4 relative z-10">
        
        <GlassCard className="flex justify-between items-center p-4">
          <h1 className="text-2xl font-bold text-white tracking-wide">
            Crypto Simulator Pro
          </h1>
          <div className="flex gap-2">
            {availableSymbols.map(sym => (
              <button 
                key={sym}
                onClick={() => setSymbol(sym)}
                className={`px-6 py-2 rounded-full font-bold transition-all ${symbol === sym ? 'bg-sky-500 text-white shadow-md' : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'}`}
              >
                {sym}
              </button>
            ))}
          </div>
        </GlassCard>

        <WalletDashboard wallet={wallet} pnl={pnl} userId={user.id} onUpdate={refreshData} />
        
        <PerformanceAnalytics analytics={analytics} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Main Chart Area */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <TradingChart symbol={symbol} />
          </div>
          
          {/* Order Entry & Book */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <OrderForm userId={user.id} symbol={symbol} onOrderPlaced={refreshData} />
            <OrderBook symbol={symbol} />
          </div>

          {/* Active Positions & History */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <OpenPositions userId={user.id} pnl={pnl} onUpdate={refreshData} />
            <OrderHistory userId={user.id} refreshTrigger={refreshTrigger} />
          </div>

          {/* Equity Curve */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <EquityCurve data={equityData} />
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;
