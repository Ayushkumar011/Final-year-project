import React from 'react';
import GlassCard from './GlassCard';
import type { AnalyticsResponse } from '../api';
import { Activity, Target, TrendingUp, Award, AlertTriangle } from 'lucide-react';

interface PerformanceAnalyticsProps {
  analytics: AnalyticsResponse | null;
}

const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({ analytics }) => {
  if (!analytics) return <GlassCard className="p-4 animate-pulse h-24 flex items-center justify-center text-white/50">Loading Analytics...</GlassCard>;

  const cards = [
    { label: 'Total Trades', value: analytics.total_trades.toString(), icon: <Activity size={16} />, color: 'text-sky-400' },
    { label: 'Win Rate', value: `${analytics.win_rate.toFixed(1)}%`, icon: <Target size={16} />, color: analytics.win_rate >= 50 ? 'text-crypto-green' : 'text-crypto-red' },
    { label: 'Net PnL', value: `${analytics.net_pnl >= 0 ? '+' : ''}$${analytics.net_pnl.toFixed(2)}`, icon: <TrendingUp size={16} />, color: analytics.net_pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red' },
    { label: 'Best Trade', value: `+$${analytics.best_trade.toFixed(2)}`, icon: <Award size={16} />, color: 'text-crypto-green' },
    { label: 'Worst Trade', value: `-$${Math.abs(analytics.worst_trade).toFixed(2)}`, icon: <AlertTriangle size={16} />, color: 'text-crypto-red' },
  ];

  return (
    <GlassCard className="p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center pb-3 border-b border-white/10">
        <h2 className="font-semibold flex items-center gap-2 text-white"><Activity size={18} /> Performance Analytics</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-black/20 px-5 py-4 rounded-[2rem] border border-white/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="text-white/70 text-xs flex items-center gap-1 relative z-10">{card.icon} {card.label}</div>
            <div className={`text-xl font-bold font-mono mt-1 relative z-10 ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export default PerformanceAnalytics;
