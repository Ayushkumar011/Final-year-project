from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import asyncio
from contextlib import asynccontextmanager

import models, schemas, crud
from database import engine, get_db
from matching_engine import binance_ws_listener, current_prices

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the matching engine
    task = asyncio.create_task(binance_ws_listener())
    yield
    # Cancel the matching engine on shutdown
    task.cancel()

app = FastAPI(title="Crypto Trading Simulator API", lifespan=lifespan)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes

@app.post("/api/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        return db_user # Return existing user for simplicity in this simulator
    return crud.create_user(db=db, user=user)

@app.get("/api/users/{user_id}/wallet", response_model=schemas.Wallet)
def get_wallet(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.wallet

@app.post("/api/wallet/deposit", response_model=schemas.Wallet)
def deposit_funds(req: schemas.DepositRequest, db: Session = Depends(get_db)):
    wallet = crud.deposit_funds(db, req.user_id, req.amount)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet

@app.post("/api/orders", response_model=schemas.Order)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    # Validate user
    user = crud.get_user(db, user_id=order.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Very basic validation
    if order.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
        
    return crud.create_order(db=db, order=order)

@app.get("/api/orders/{user_id}", response_model=list[schemas.Order])
def get_orders(user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_orders(db, user_id, skip=skip, limit=limit)

@app.get("/api/prices")
def get_current_prices():
    return current_prices

@app.post("/api/orders/market_buy", response_model=schemas.Order)
def execute_market_buy(req: schemas.MarketBuyRequest, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id=req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    live_price = current_prices.get(req.symbol)
    if not live_price:
        raise HTTPException(status_code=400, detail=f"Live price not available for {req.symbol}")
        
    if req.usdt_spend_amount <= 0:
        raise HTTPException(status_code=400, detail="Spend amount must be greater than 0")
        
    wallet = db.query(models.Wallet).filter(models.Wallet.user_id == req.user_id).first()
    if not wallet or wallet.balance_usd < req.usdt_spend_amount:
        raise HTTPException(status_code=400, detail="Insufficient Funds")
        
    crypto_purchased = req.usdt_spend_amount / live_price
    
    try:
        wallet.balance_usd -= req.usdt_spend_amount
        
        base_asset_symbol = req.symbol.replace("USDT", "")
        asset = db.query(models.AssetBalance).filter(
            models.AssetBalance.wallet_id == wallet.id, 
            models.AssetBalance.symbol == base_asset_symbol
        ).first()
        
        if not asset:
            asset = models.AssetBalance(wallet_id=wallet.id, symbol=base_asset_symbol, balance=0.0)
            db.add(asset)
            
        asset.balance += crypto_purchased
        
        db_order = models.Order(
            user_id=req.user_id,
            symbol=req.symbol,
            side=models.OrderSide.BUY,
            type=models.OrderType.MARKET,
            quantity=crypto_purchased,
            execution_price=live_price,
            status=models.OrderStatus.EXECUTED
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/wallet/{user_id}/pnl", response_model=schemas.PortfolioPnLResponse)
def get_pnl(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    wallet = user.wallet
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
        
    assets_pnl = []
    total_current_value = 0.0
    total_usdt_spent_portfolio = 0.0
    
    for asset in wallet.assets:
        if asset.balance <= 0:
            continue
            
        symbol = f"{asset.symbol}USDT"
        live_price = current_prices.get(symbol, 0.0)
        
        current_value = asset.balance * live_price
        
        executed_buys = db.query(models.Order).filter(
            models.Order.user_id == user_id,
            models.Order.symbol == symbol,
            models.Order.side == models.OrderSide.BUY,
            models.Order.status == models.OrderStatus.EXECUTED
        ).all()
        
        total_bought_qty = sum(order.quantity for order in executed_buys)
        total_spent = sum(order.quantity * (order.execution_price or 0.0) for order in executed_buys)
        
        if total_bought_qty > 0:
            avg_cost = total_spent / total_bought_qty
            usdt_spent_for_current_balance = avg_cost * asset.balance
        else:
            usdt_spent_for_current_balance = 0.0
            
        absolute_pnl = current_value - usdt_spent_for_current_balance
        percentage_pnl = (absolute_pnl / usdt_spent_for_current_balance * 100) if usdt_spent_for_current_balance > 0 else 0.0
        
        assets_pnl.append(schemas.AssetPnL(
            symbol=asset.symbol,
            quantity=asset.balance,
            current_price=live_price,
            current_value=current_value,
            total_usdt_spent=usdt_spent_for_current_balance,
            absolute_pnl=absolute_pnl,
            percentage_pnl=percentage_pnl
        ))
        
        total_current_value += current_value
        total_usdt_spent_portfolio += usdt_spent_for_current_balance
        
    total_absolute_pnl = total_current_value - total_usdt_spent_portfolio
    total_percentage_pnl = (total_absolute_pnl / total_usdt_spent_portfolio * 100) if total_usdt_spent_portfolio > 0 else 0.0
    
    import time
    current_time = time.time()
    last_snapshot = db.query(models.PortfolioSnapshot).filter(models.PortfolioSnapshot.user_id == user_id).order_by(models.PortfolioSnapshot.timestamp.desc()).first()
    
    current_equity = wallet.balance_usd + total_current_value
    
    if not last_snapshot or (current_time - last_snapshot.timestamp) >= 60:
        new_snapshot = models.PortfolioSnapshot(user_id=user_id, timestamp=current_time, equity=current_equity)
        db.add(new_snapshot)
        db.commit()
    
    return schemas.PortfolioPnLResponse(
        user_id=user_id,
        total_current_value=total_current_value,
        total_usdt_spent=total_usdt_spent_portfolio,
        total_absolute_pnl=total_absolute_pnl,
        total_percentage_pnl=total_percentage_pnl,
        assets=assets_pnl
    )

@app.get("/api/wallet/{user_id}/equity", response_model=list[schemas.PortfolioSnapshot])
def get_equity_curve(user_id: int, db: Session = Depends(get_db)):
    snapshots = db.query(models.PortfolioSnapshot).filter(models.PortfolioSnapshot.user_id == user_id).order_by(models.PortfolioSnapshot.timestamp.asc()).all()
    return snapshots

@app.get("/api/wallet/{user_id}/analytics", response_model=schemas.AnalyticsResponse)
def get_analytics(user_id: int, db: Session = Depends(get_db)):
    executed_sells = db.query(models.Order).filter(
        models.Order.user_id == user_id,
        models.Order.side == models.OrderSide.SELL,
        models.Order.status == models.OrderStatus.EXECUTED
    ).all()
    
    executed_buys = db.query(models.Order).filter(
        models.Order.user_id == user_id,
        models.Order.side == models.OrderSide.BUY,
        models.Order.status == models.OrderStatus.EXECUTED
    ).all()
    
    total_trades = len(executed_sells) + len(executed_buys)
    
    realized_pnl = 0.0
    winning_trades = 0
    best_trade = 0.0
    worst_trade = 0.0
    
    avg_costs = {}
    for buy in executed_buys:
        if buy.symbol not in avg_costs:
            avg_costs[buy.symbol] = {'total_spent': 0.0, 'total_qty': 0.0}
        avg_costs[buy.symbol]['total_spent'] += buy.quantity * (buy.execution_price or 0.0)
        avg_costs[buy.symbol]['total_qty'] += buy.quantity
        
    for symbol in avg_costs:
        avg_costs[symbol]['avg_price'] = avg_costs[symbol]['total_spent'] / avg_costs[symbol]['total_qty']
        
    for sell in executed_sells:
        avg_price = avg_costs.get(sell.symbol, {}).get('avg_price', 0.0)
        trade_profit = ((sell.execution_price or 0.0) - avg_price) * sell.quantity
        realized_pnl += trade_profit
        
        if trade_profit > 0:
            winning_trades += 1
            
        if trade_profit > best_trade:
            best_trade = trade_profit
        if trade_profit < worst_trade:
            worst_trade = trade_profit
            
    win_rate = (winning_trades / len(executed_sells) * 100) if executed_sells else 0.0
    
    pnl_response = get_pnl(user_id, db)
    unrealized_pnl = pnl_response.total_absolute_pnl
    
    net_pnl = realized_pnl + unrealized_pnl
    
    return schemas.AnalyticsResponse(
        total_trades=total_trades,
        win_rate=win_rate,
        realized_pnl=realized_pnl,
        unrealized_pnl=unrealized_pnl,
        net_pnl=net_pnl,
        best_trade=best_trade,
        worst_trade=worst_trade
    )
