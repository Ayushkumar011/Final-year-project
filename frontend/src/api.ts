import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
});

export interface User {
  id: int;
  username: string;
}

export interface AssetBalance {
  id: number;
  symbol: string;
  balance: number;
}

export interface Wallet {
  id: number;
  balance_usd: number;
  assets: AssetBalance[];
}

export interface Order {
  id: number;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  limit_price?: number;
  stop_price?: number;
  trailing_delta?: number;
  is_trailing_percentage?: boolean;
  status: string;
}

export const createUser = async (username: string): Promise<User> => {
  const res = await api.post('/users', { username });
  return res.data;
};

export const getWallet = async (userId: number): Promise<Wallet> => {
  const res = await api.get(`/users/${userId}/wallet`);
  return res.data;
};

export const depositFunds = async (userId: number, amount: number): Promise<Wallet> => {
  const res = await api.post('/wallet/deposit', { user_id: userId, amount });
  return res.data;
};

export const createOrder = async (order: any): Promise<Order> => {
  const res = await api.post('/orders', order);
  return res.data;
};

export const createMarketBuyOrder = async (order: { user_id: number, symbol: string, usdt_spend_amount: number }): Promise<Order> => {
  const res = await api.post('/orders/market_buy', order);
  return res.data;
};

export const getOrders = async (userId: number): Promise<Order[]> => {
  const res = await api.get(`/orders/${userId}`);
  return res.data;
};

export interface AssetPnL {
  symbol: string;
  quantity: number;
  current_price: number;
  current_value: number;
  total_usdt_spent: number;
  absolute_pnl: number;
  percentage_pnl: number;
}

export interface PortfolioPnLResponse {
  user_id: number;
  total_current_value: number;
  total_usdt_spent: number;
  total_absolute_pnl: number;
  total_percentage_pnl: number;
  assets: AssetPnL[];
}

export const getPnl = async (userId: number): Promise<PortfolioPnLResponse> => {
  const res = await api.get(`/wallet/${userId}/pnl`);
  return res.data;
};

export interface PortfolioSnapshot {
  timestamp: number;
  equity: number;
}

export interface AnalyticsResponse {
  total_trades: number;
  win_rate: number;
  realized_pnl: number;
  unrealized_pnl: number;
  net_pnl: number;
  best_trade: number;
  worst_trade: number;
}

export const getEquityCurve = async (userId: number): Promise<PortfolioSnapshot[]> => {
  const res = await api.get(`/wallet/${userId}/equity`);
  return res.data;
};

export const getAnalytics = async (userId: number): Promise<AnalyticsResponse> => {
  const res = await api.get(`/wallet/${userId}/analytics`);
  return res.data;
};
