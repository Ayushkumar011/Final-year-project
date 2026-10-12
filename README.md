# Crypto Trading Simulator

A full-stack crypto trading simulator featuring real-time market data from Binance WebSockets, a simulated matching engine for executing various order types, and a responsive frontend interface.

## Prerequisites
- Node.js (v18+)
- Python (v3.9+)

## How to Run

You will need two terminal windows to run the backend and the frontend concurrently.

### 1. Start the Backend (FastAPI + Matching Engine)

Open a terminal in the root directory of the project.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt # (If you haven't installed dependencies)
# To run the server:
uvicorn main:app --reload
```
*The backend runs on `http://localhost:8000` and automatically starts the background matching engine connecting to Binance WebSockets.*

### 2. Start the Frontend (React + Vite)

Open a second terminal in the root directory.

```bash
cd frontend
npm run dev
```
*The frontend runs on `http://localhost:5173`. Open this URL in your browser.*

## Features
- **Live Charts**: Candlestick charts powered by `lightweight-charts` and Binance WebSockets.
- **Order Book**: Real-time partial order book depth.
- **Simulated Trading**: Place Market, Limit, Stop Market, Stop Limit, and Trailing Stop orders.
- **Matching Engine**: Background asyncio task continuously evaluates open orders against the live price stream.
