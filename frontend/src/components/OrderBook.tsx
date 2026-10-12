import React, { useEffect, useState, useRef } from 'react';
import GlassCard from './GlassCard';

interface OrderBookProps {
  symbol: string;
}

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to Binance Depth Stream (Partial Book Depth 10 levels, 100ms update)
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth10@100ms`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.bids && message.asks) {
        
        let bidTotal = 0;
        const newBids = message.bids.map((b: string[]) => {
            const price = parseFloat(b[0]);
            const quantity = parseFloat(b[1]);
            bidTotal += quantity;
            return { price, quantity, total: bidTotal };
        });

        let askTotal = 0;
        const newAsks = message.asks.map((a: string[]) => {
            const price = parseFloat(a[0]);
            const quantity = parseFloat(a[1]);
            askTotal += quantity;
            return { price, quantity, total: askTotal };
        });

        setBids(newBids);
        setAsks(newAsks);
      }
    };

    return () => {
      if (wsRef.current) {
        if (wsRef.current.readyState === 1) {
          wsRef.current.close();
        } else if (wsRef.current.readyState === 0) {
          wsRef.current.onopen = () => wsRef.current?.close();
        }
      }
    };
  }, [symbol]);

  const maxTotalBid = bids.length > 0 ? bids[bids.length - 1].total : 1;
  const maxTotalAsk = asks.length > 0 ? asks[asks.length - 1].total : 1;
  const maxTotal = Math.max(maxTotalBid, maxTotalAsk);

  return (
    <GlassCard className="flex flex-col h-[400px]">
      <div className="p-3 border-b border-white/10">
        <h2 className="font-semibold text-white">Order Book</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 text-xs font-mono">
        <div className="grid grid-cols-3 text-white/60 mb-2 px-2">
            <span>Price (USDT)</span>
            <span className="text-right text-white/60">Amount</span>
            <span className="text-right text-white/60">Total</span>
        </div>
        
        {/* Asks (Sell Orders) - display in reverse so lowest price is at bottom */}
        <div className="flex flex-col-reverse">
            {asks.slice(0, 10).map((ask, i) => {
                const depthPercentage = (ask.total / maxTotal) * 100;
                return (
                    <div key={`ask-${i}`} className="grid grid-cols-3 px-2 py-0.5 relative group hover:bg-white/5 cursor-pointer">
                        <div className="absolute top-0 right-0 h-full bg-red-500/20 -z-10" style={{ width: `${depthPercentage}%` }}></div>
                        <span className="text-rose-400">{ask.price.toFixed(2)}</span>
                        <span className="text-right text-white/80">{ask.quantity.toFixed(4)}</span>
                        <span className="text-right text-white/80">{ask.total.toFixed(4)}</span>
                    </div>
                )
            })}
        </div>

        <div className="my-2 border-y border-white/10 py-1 text-center font-bold text-sm text-white/50">
            --- Spread ---
        </div>

        {/* Bids (Buy Orders) */}
        <div>
            {bids.slice(0, 10).map((bid, i) => {
                const depthPercentage = (bid.total / maxTotal) * 100;
                return (
                    <div key={`bid-${i}`} className="grid grid-cols-3 px-2 py-0.5 relative group hover:bg-white/5 cursor-pointer">
                        <div className="absolute top-0 right-0 h-full bg-sky-500/20 -z-10" style={{ width: `${depthPercentage}%` }}></div>
                        <span className="text-sky-400">{bid.price.toFixed(2)}</span>
                        <span className="text-right text-white/80">{bid.quantity.toFixed(4)}</span>
                        <span className="text-right text-white/80">{bid.total.toFixed(4)}</span>
                    </div>
                )
            })}
        </div>
      </div>
    </GlassCard>
  );
};

export default OrderBook;
