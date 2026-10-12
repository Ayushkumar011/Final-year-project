import React, { useState } from 'react';
import GlassCard from './GlassCard';
import GradientButton from './GradientButton';
import { createOrder } from '../api';
import type { PortfolioPnLResponse } from '../api';
import { Briefcase, TrendingUp, TrendingDown } from 'lucide-react';

interface OpenPositionsProps {
  userId: number;
  pnl: PortfolioPnLResponse | null;
  onUpdate: () => void;
}

const OpenPositions: React.FC<OpenPositionsProps> = ({ userId, pnl, onUpdate }) => {
  const [closing, setClosing] = useState<string | null>(null);

  const handleClose = async (symbol: string, quantity: number) => {
    setClosing(symbol);
    try {
      await createOrder({
        user_id: userId,
        symbol: `${symbol}USDT`,
        side: 'SELL',
        type: 'MARKET',
        quantity: quantity,
      });
      onUpdate();
    } catch (err) {
      console.error("Failed to close position", err);
      alert("Failed to close position");
    } finally {
      setClosing(null);
    }
  };

  if (!pnl) return null;

  const activePositions = pnl.assets.filter(a => a.quantity > 0);

  return (
    <GlassCard className="p-4 flex flex-col gap-4 h-full">
      <div className="flex justify-between items-center pb-3 border-b border-white/10">
        <h2 className="font-semibold flex items-center gap-2 text-white"><Briefcase size={18} /> Open Positions</h2>
      </div>

      {activePositions.length === 0 ? (
        <div className="text-white/50 text-sm text-center py-8">No open positions.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-2 font-medium">Asset</th>
                <th className="pb-2 font-medium">Size</th>
                <th className="pb-2 font-medium">Entry Price</th>
                <th className="pb-2 font-medium">Current Price</th>
                <th className="pb-2 font-medium">ROI %</th>
                <th className="pb-2 font-medium">Live PnL</th>
                <th className="pb-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {activePositions.map(pos => {
                const entryPrice = pos.total_usdt_spent / pos.quantity;
                return (
                  <tr key={pos.symbol} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 font-bold text-white">{pos.symbol}</td>
                    <td className="py-3 font-mono">{pos.quantity.toFixed(4)}</td>
                    <td className="py-3 font-mono">${entryPrice.toFixed(2)}</td>
                    <td className="py-3 font-mono">${pos.current_price.toFixed(2)}</td>
                    <td className={`py-3 font-mono font-semibold ${pos.percentage_pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                      {pos.percentage_pnl >= 0 ? '+' : ''}{pos.percentage_pnl.toFixed(2)}%
                    </td>
                    <td className={`py-3 font-mono font-semibold ${pos.absolute_pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                      {pos.absolute_pnl >= 0 ? '+' : ''}${pos.absolute_pnl.toFixed(2)}
                    </td>
                    <td className="py-3 text-right">
                      <GradientButton
                        onClick={() => handleClose(pos.symbol, pos.quantity)}
                        disabled={closing === pos.symbol}
                        variant="danger"
                        className="px-4 py-1.5 !w-auto text-xs rounded-full inline-block"
                      >
                        {closing === pos.symbol ? 'Closing...' : 'Close'}
                      </GradientButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
};

export default OpenPositions;
