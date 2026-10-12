from sqlalchemy.orm import Session
import models, schemas

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(username=user.username)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create a wallet for the user
    db_wallet = models.Wallet(user_id=db_user.id, balance_usd=10000.0) # Start with $10k
    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    
    # Initialize crypto balances
    for symbol in ["BTC", "ETH", "SOL", "SHIB"]:
        db_asset = models.AssetBalance(wallet_id=db_wallet.id, symbol=symbol, balance=0.0)
        db.add(db_asset)
    db.commit()
    
    return db_user

def deposit_funds(db: Session, user_id: int, amount: float):
    wallet = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).first()
    if wallet:
        wallet.balance_usd += amount
        db.commit()
        db.refresh(wallet)
    return wallet

def create_order(db: Session, order: schemas.OrderCreate):
    db_order = models.Order(
        user_id=order.user_id,
        symbol=order.symbol,
        side=order.side,
        type=order.type,
        quantity=order.quantity,
        limit_price=order.limit_price,
        stop_price=order.stop_price,
        trailing_delta=order.trailing_delta,
        is_trailing_percentage=order.is_trailing_percentage,
        status=models.OrderStatus.PENDING
    )
    
    # Deduct funds/assets if MARKET or conditionally if Limit (Simplification: we will deduct on execution for now, to handle complex order logic easily, but in real life we lock funds). 
    # Let's implement funds locking for simplicity:
    # If Buy, lock USD = quantity * limit_price (or market price, but we don't know it here).
    # Since this is a simple simulator, we'll check and deduct balances at execution time to avoid complex locking mechanisms.
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

def get_orders(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Order).filter(models.Order.user_id == user_id).order_by(models.Order.id.desc()).offset(skip).limit(limit).all()

def get_pending_orders(db: Session):
    return db.query(models.Order).filter(models.Order.status == models.OrderStatus.PENDING).all()
