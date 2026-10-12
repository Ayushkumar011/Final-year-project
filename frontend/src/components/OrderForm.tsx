import React, { useState } from 'react';
import { createOrder, createMarketBuyOrder } from '../api';
import GlassCard from './GlassCard';
import GradientButton from './GradientButton';

interface OrderFormProps {
  userId: number;
  symbol: string;
  onOrderPlaced: () => void;
}

const ORDER_TYPES = ['MARKET', 'LIMIT', 'STOP_MARKET', 'STOP_LIMIT', 'TRAILING_STOP'];

const OrderForm: React.FC<OrderFormProps> = ({ userId, symbol, onOrderPlaced }) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [type, setType] = useState('MARKET');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [trailingDelta, setTrailingDelta] = useState('');
  const [isPercentage, setIsPercentage] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (type === 'MARKET' && side === 'BUY') {
        await createMarketBuyOrder({
          user_id: userId,
          symbol: symbol,
          usdt_spend_amount: parseFloat(quantity)
        });
      } else {
        await createOrder({
          user_id: userId,
          symbol: symbol,
          side,
          type,
          quantity: parseFloat(quantity),
          limit_price: limitPrice ? parseFloat(limitPrice) : null,
          stop_price: stopPrice ? parseFloat(stopPrice) : null,
          trailing_delta: trailingDelta ? parseFloat(trailingDelta) : null,
          is_trailing_percentage: isPercentage
        });
      }
      setQuantity('');
      setLimitPrice('');
      setStopPrice('');
      setTrailingDelta('');
      onOrderPlaced();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
      alert(`Order failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="flex flex-col h-full">
      <div className="flex text-center border-b border-white/10">
        <button 
            onClick={() => setSide('BUY')}
            className={`flex-1 py-3 font-semibold transition-all ${side === 'BUY' ? 'text-sky-300 border-b-2 border-sky-400 bg-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
            Buy
        </button>
        <button 
            onClick={() => setSide('SELL')}
            className={`flex-1 py-3 font-semibold transition-all ${side === 'SELL' ? 'text-fuchsia-400 border-b-2 border-fuchsia-500 bg-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
            Sell
        </button>
      </div>

      <div className="p-4 flex-1">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
          <div>
            <label className="block text-xs text-white/70 mb-1">Order Type</label>
            <div className="flex gap-1 overflow-x-auto pb-2">
                {ORDER_TYPES.map(t => (
                    <button 
                        key={t} 
                        type="button"
                        onClick={() => setType(t)}
                        className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${type === t ? 'bg-white/20 text-white shadow-md' : 'text-white/60 hover:bg-white/10'}`}
                    >
                        {t.replace('_', ' ')}
                    </button>
                ))}
            </div>
          </div>

          {(type === 'LIMIT' || type === 'STOP_LIMIT') && (
            <div>
              <label className="block text-xs text-white/70 mb-1">Limit Price (USDT)</label>
              <input required type="number" step="any" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-sky-400 backdrop-blur-md" />
            </div>
          )}

          {(type === 'STOP_MARKET' || type === 'STOP_LIMIT') && (
            <div>
              <label className="block text-xs text-white/70 mb-1">Stop Price (USDT)</label>
              <input required type="number" step="any" value={stopPrice} onChange={e => setStopPrice(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-sky-400 backdrop-blur-md" />
            </div>
          )}

          {type === 'TRAILING_STOP' && (
            <div>
              <label className="block text-xs text-white/70 mb-1 flex justify-between">
                <span>Trailing Delta</span>
                <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={isPercentage} onChange={e => setIsPercentage(e.target.checked)} className="accent-sky-400" />
                    <span>Percentage %</span>
                </label>
              </label>
              <input required type="number" step="any" value={trailingDelta} onChange={e => setTrailingDelta(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-sky-400 backdrop-blur-md" />
            </div>
          )}

          <div>
            <label className="block text-xs text-white/70 mb-1">
              {type === 'MARKET' && side === 'BUY' ? 'Spend Amount (USDT)' : `Amount (${symbol.replace('USDT', '')})`}
            </label>
            <input required type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:border-sky-400 backdrop-blur-md" />
          </div>

          <div className="mt-auto pt-4">
            <GradientButton 
                type="submit" 
                disabled={loading}
                variant={side === 'BUY' ? 'primary' : 'danger'}
            >
                {side} {symbol.replace('USDT', '')}
            </GradientButton>
          </div>
        </form>
      </div>
    </GlassCard>
  );
};

export default OrderForm;
