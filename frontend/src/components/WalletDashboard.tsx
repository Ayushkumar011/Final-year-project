import React, { useState } from 'react';
import { depositFunds } from '../api';
import GlassCard from './GlassCard';
import GradientButton from './GradientButton';
import type { Wallet as WalletType, PortfolioPnLResponse } from '../api';
import { WalletIcon, DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface WalletDashboardProps {
  wallet: WalletType | null;
  pnl: PortfolioPnLResponse | null;
  userId: number;
  onUpdate: () => void;
}

const WalletDashboard: React.FC<WalletDashboardProps> = ({ wallet, pnl, userId, onUpdate }) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    setLoading(true);
    try {
      await depositFunds(userId, amount);
      setDepositAmount('');
      onUpdate();
    } catch (err) {
      console.error("Deposit failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) return <GlassCard className="p-4 animate-pulse h-32 flex items-center justify-center text-white/50">Loading wallet...</GlassCard>;

  const totalEquity = wallet.balance_usd + (pnl?.total_current_value || 0);

  return (
    <GlassCard className="p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center pb-3 border-b border-white/10">
        <h2 className="font-semibold flex items-center gap-2 text-white"><WalletIcon size={18} /> Wallet & PnL</h2>
        
        <form onSubmit={handleDeposit} className="flex gap-2">
            <input 
                type="number" 
                value={depositAmount} 
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount USD" 
                className="bg-black/20 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white focus:outline-none focus:border-sky-400 backdrop-blur-md"
                min="1"
                step="any"
            />
            <GradientButton 
                type="submit" 
                disabled={loading}
                className="px-6 py-1 !w-auto text-sm"
            >
                Deposit
            </GradientButton>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Total Equity Card */}
        <div className="bg-black/20 px-5 py-4 rounded-[2rem] border border-white/10 backdrop-blur-sm md:col-span-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="text-white/70 text-xs flex items-center gap-1 relative z-10"><Activity size={14}/> Total Equity</div>
            <div className="text-2xl font-bold font-mono mt-1 text-white relative z-10">${totalEquity.toFixed(2)}</div>
            {pnl && (
                <div className={`text-xs mt-2 flex items-center gap-1 font-mono relative z-10 ${pnl.total_absolute_pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                    {pnl.total_absolute_pnl >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                    {pnl.total_absolute_pnl >= 0 ? '+' : ''}{pnl.total_absolute_pnl.toFixed(2)} ({pnl.total_percentage_pnl.toFixed(2)}%)
                </div>
            )}
        </div>

        {/* Available USD Card */}
        <div className="bg-black/20 px-5 py-4 rounded-[2rem] border border-white/10 backdrop-blur-sm relative overflow-hidden">
            <div className="text-white/70 text-xs flex items-center gap-1 relative z-10"><DollarSign size={14}/> Available USD</div>
            <div className="text-xl font-bold font-mono mt-1 text-white relative z-10">${wallet.balance_usd.toFixed(2)}</div>
        </div>
        
        {/* Asset Cards */}
        {wallet.assets.map(asset => {
            const assetPnl = pnl?.assets.find(a => a.symbol === asset.symbol);
            return (
                <div key={asset.symbol} className="bg-black/20 px-5 py-4 rounded-[2rem] border border-white/10 backdrop-blur-sm relative overflow-hidden group">
                    <div className="text-white/70 text-xs flex items-center gap-1 relative z-10"><TrendingUp size={14}/> {asset.symbol}</div>
                    <div className="text-lg font-bold font-mono mt-1 text-white relative z-10">{asset.balance.toFixed(6)}</div>
                    {assetPnl && asset.balance > 0 && (
                        <div className={`text-xs mt-1 flex items-center gap-1 font-mono relative z-10 ${assetPnl.absolute_pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                            {assetPnl.absolute_pnl >= 0 ? '+' : ''}{assetPnl.percentage_pnl.toFixed(2)}%
                        </div>
                    )}
                </div>
            )
        })}
      </div>
    </GlassCard>
  );
};

export default WalletDashboard;
