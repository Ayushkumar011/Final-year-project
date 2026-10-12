from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
import enum
from database import Base

class OrderSide(enum.Enum):
    BUY = "BUY"
    SELL = "SELL"

class OrderType(enum.Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP_MARKET = "STOP_MARKET"
    STOP_LIMIT = "STOP_LIMIT"
    TRAILING_STOP = "TRAILING_STOP"

class OrderStatus(enum.Enum):
    PENDING = "PENDING"
    EXECUTED = "EXECUTED"
    CANCELLED = "CANCELLED"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    orders = relationship("Order", back_populates="user")

class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    balance_usd = Column(Float, default=0.0)
    user = relationship("User", back_populates="wallet")
    assets = relationship("AssetBalance", back_populates="wallet")

class AssetBalance(Base):
    __tablename__ = "asset_balances"
    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"))
    symbol = Column(String, index=True) # e.g. BTC, ETH
    balance = Column(Float, default=0.0)
    wallet = relationship("Wallet", back_populates="assets")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True) # e.g. BTCUSDT
    side = Column(Enum(OrderSide))
    type = Column(Enum(OrderType))
    quantity = Column(Float)
    limit_price = Column(Float, nullable=True)
    stop_price = Column(Float, nullable=True)
    trailing_delta = Column(Float, nullable=True) # Absolute or percentage
    is_trailing_percentage = Column(Boolean, default=False)
    execution_price = Column(Float, nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    user = relationship("User", back_populates="orders")

class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(Float) # store as unix timestamp float for simplicity, or we can use DateTime
    equity = Column(Float)
