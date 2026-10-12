import asyncio
import json
import websockets
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Order, OrderStatus, OrderType, OrderSide, Wallet, AssetBalance

BINANCE_WS_URL = "wss://stream.binance.com:9443/ws"
# We will track prices globally for easy access
current_prices = {}

async def process_tick(symbol: str, price: float):
    global current_prices
    current_prices[symbol] = price
    
    db: Session = SessionLocal()
    try:
        # Get all pending orders for this symbol
        pending_orders = db.query(Order).filter(Order.status == OrderStatus.PENDING, Order.symbol == symbol).all()
        
        for order in pending_orders:
            execute = False
            execution_price = price
            
            # --- MARKET ORDER ---
            if order.type == OrderType.MARKET:
                execute = True
                
            # --- LIMIT ORDER ---
            elif order.type == OrderType.LIMIT:
                if order.side == OrderSide.BUY and price <= order.limit_price:
                    execute = True
                    execution_price = order.limit_price
                elif order.side == OrderSide.SELL and price >= order.limit_price:
                    execute = True
                    execution_price = order.limit_price
                    
            # --- STOP MARKET ORDER ---
            elif order.type == OrderType.STOP_MARKET:
                if order.side == OrderSide.BUY and price >= order.stop_price:
                    execute = True
                elif order.side == OrderSide.SELL and price <= order.stop_price:
                    execute = True
                    
            # --- STOP LIMIT ORDER ---
            elif order.type == OrderType.STOP_LIMIT:
                # Triggers into a limit order
                if order.side == OrderSide.BUY and price >= order.stop_price:
                    order.type = OrderType.LIMIT
                    db.commit()
                elif order.side == OrderSide.SELL and price <= order.stop_price:
                    order.type = OrderType.LIMIT
                    db.commit()
                    
            # --- TRAILING STOP ORDER ---
            elif order.type == OrderType.TRAILING_STOP:
                delta = order.trailing_delta
                if order.is_trailing_percentage:
                    delta = price * (order.trailing_delta / 100.0)
                    
                if order.side == OrderSide.BUY:
                    # Trailing stop buy: stop price follows the price DOWN.
                    # Initially, stop price might be None, so we set it.
                    if order.stop_price is None or price + delta < order.stop_price:
                        order.stop_price = price + delta
                        db.commit()
                    elif price >= order.stop_price:
                        execute = True
                elif order.side == OrderSide.SELL:
                    # Trailing stop sell: stop price follows the price UP.
                    if order.stop_price is None or price - delta > order.stop_price:
                        order.stop_price = price - delta
                        db.commit()
                    elif price <= order.stop_price:
                        execute = True
            
            # --- EXECUTION LOGIC ---
            if execute:
                wallet = db.query(Wallet).filter(Wallet.user_id == order.user_id).first()
                if not wallet:
                    continue
                
                # The base asset is the crypto (e.g. BTC), quote is USD
                base_asset_symbol = symbol.replace("USDT", "")
                asset = db.query(AssetBalance).filter(AssetBalance.wallet_id == wallet.id, AssetBalance.symbol == base_asset_symbol).first()
                
                if not asset:
                    asset = AssetBalance(wallet_id=wallet.id, symbol=base_asset_symbol, balance=0.0)
                    db.add(asset)
                
                total_cost = order.quantity * execution_price
                
                if order.side == OrderSide.BUY:
                    if wallet.balance_usd >= total_cost:
                        wallet.balance_usd -= total_cost
                        asset.balance += order.quantity
                        order.status = OrderStatus.EXECUTED
                        db.commit()
                    else:
                        # Insufficient funds, cancel order
                        order.status = OrderStatus.CANCELLED
                        db.commit()
                elif order.side == OrderSide.SELL:
                    if asset.balance >= order.quantity:
                        asset.balance -= order.quantity
                        wallet.balance_usd += total_cost
                        order.status = OrderStatus.EXECUTED
                        db.commit()
                    else:
                        # Insufficient assets, cancel order
                        order.status = OrderStatus.CANCELLED
                        db.commit()
    finally:
        db.close()


async def binance_ws_listener():
    import requests
    try:
        def fetch_prices():
            return requests.get('https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","SHIBUSDT"]').json()
        data = await asyncio.to_thread(fetch_prices)
        for item in data:
            current_prices[item['symbol']] = float(item['price'])
        print("Successfully fetched initial prices from Binance REST API.")
    except Exception as e:
        print(f"Warning: Failed to fetch initial prices: {e}")

    streams = ["btcusdt@trade", "ethusdt@trade", "solusdt@trade", "shibusdt@trade"]
    stream_url = f"wss://stream.binance.com:9443/stream?streams={'/'.join(streams)}"
    
    while True:
        try:
            async with websockets.connect(stream_url) as ws:
                print("Connected to Binance WS for matching engine.")
                while True:
                    data = await ws.recv()
                    json_data = json.loads(data)
                    
                    if 'data' in json_data:
                        trade_data = json_data['data']
                        symbol = trade_data['s'] # e.g. BTCUSDT
                        price = float(trade_data['p'])
                        
                        await process_tick(symbol, price)
        except Exception as e:
            print(f"Binance WS error: {e}. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)
