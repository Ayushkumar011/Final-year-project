from pydantic import BaseModel
from typing import List, Optional
from models import OrderSide, OrderType, OrderStatus

class AssetBalanceBase(BaseModel):
    symbol: str
    balance: float

class AssetBalance(AssetBalanceBase):
    id: int
    class Config:
        from_attributes = True

class WalletBase(BaseModel):
    balance_usd: float

class Wallet(WalletBase):
    id: int
    assets: List[AssetBalance] = []
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    wallet: Optional[Wallet] = None
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    user_id: int
    symbol: str
    side: OrderSide
    type: OrderType
    quantity: float
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    trailing_delta: Optional[float] = None
    is_trailing_percentage: Optional[bool] = False

class Order(BaseModel):
    id: int
    user_id: int
    symbol: str
    side: OrderSide
    type: OrderType
    quantity: float
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    trailing_delta: Optional[float] = None
    is_trailing_percentage: Optional[bool] = False
    execution_price: Optional[float] = None
    status: OrderStatus
    class Config:
        from_attributes = True

class DepositRequest(BaseModel):
    user_id: int
    amount: float

class MarketBuyRequest(BaseModel):
    user_id: int
    symbol: str
    usdt_spend_amount: float

class AssetPnL(BaseModel):
    symbol: str
    quantity: float
    current_price: float
    current_value: float
    total_usdt_spent: float
    absolute_pnl: float
    percentage_pnl: float

class PortfolioPnLResponse(BaseModel):
    user_id: int
    total_current_value: float
    total_usdt_spent: float
    total_absolute_pnl: float
    total_percentage_pnl: float
    assets: List[AssetPnL]

class PortfolioSnapshot(BaseModel):
    timestamp: float
    equity: float

    class Config:
        from_attributes = True

class AnalyticsResponse(BaseModel):
    total_trades: int
    win_rate: float
    realized_pnl: float
    unrealized_pnl: float
    net_pnl: float
    best_trade: float
    worst_trade: float
