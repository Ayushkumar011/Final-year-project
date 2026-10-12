import React, { useEffect, useState } from 'react';
import { getOrders } from '../api';
import type { Order } from '../api';
import GlassCard from './GlassCard';

interface OrderHistoryProps {
  userId: number;
  refreshTrigger: number;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ userId, refreshTrigger }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    getOrders(userId).then(setOrders).catch(console.error);
  }, [userId, refreshTrigger]);

  return (
    <GlassCard className="mt-4">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold text-white">Order History</h2>
      </div>
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-sm text-left text-white/80 relative">
          <thead className="text-xs text-white/60 bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-xl">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Limit</th>
              <th className="px-4 py-3">Stop</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-b border-white/5 hover:bg-white/10 transition-colors">
                <td className="px-4 py-3 font-semibold text-white">{order.symbol}</td>
                <td className={`px-4 py-3 font-bold ${order.side === 'BUY' ? 'text-sky-400' : 'text-fuchsia-400'}`}>{order.side}</td>
                <td className="px-4 py-3 text-xs">{order.type.replace('_', ' ')}</td>
                <td className="px-4 py-3 font-mono">{order.quantity}</td>
                <td className="px-4 py-3 font-mono text-white/50">{order.limit_price || '-'}</td>
                <td className="px-4 py-3 font-mono text-white/50">{order.stop_price || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : order.status === 'EXECUTED' ? 'bg-sky-500/20 text-sky-400' : 'bg-white/10 text-white/50'}`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/50">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

export default OrderHistory;
