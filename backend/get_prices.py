import requests
res = requests.get('https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","SHIBUSDT"]')
print(res.json())
