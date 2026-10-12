import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData } from 'lightweight-charts';
import GlassCard from './GlassCard';

interface TradingChartProps {
  symbol: string;
}

const TIMEFRAMES = [
  { label: '1m', interval: '1m' },
  { label: '5m', interval: '5m' },
  { label: '15m', interval: '15m' },
  { label: '1H', interval: '1h' },
  { label: '4H', interval: '4h' },
  { label: '1D', interval: '1d' },
];

function calculateSMA(data: any[], period: number) {
  return data.map((d, i) => {
    if (i < period - 1) return null;
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
    return { time: d.time, value: sum / period };
  }).filter(d => d !== null) as LineData[];
}

function calculateEMA(data: any[], period: number) {
  const k = 2 / (period + 1);
  let ema = data[0]?.close || 0;
  return data.map((d, i) => {
    if (i === 0) return { time: d.time, value: ema };
    ema = d.close * k + ema * (1 - k);
    return { time: d.time, value: ema };
  }) as LineData[];
}

function calculateRSI(data: any[], period: number) {
  let gains = 0, losses = 0;
  return data.map((d, i) => {
    if (i === 0) return null;
    const diff = d.close - data[i - 1].close;
    if (i <= period) {
      if (diff > 0) gains += diff;
      else losses -= diff;
      if (i === period) {
        gains /= period;
        losses /= period;
        const rs = losses === 0 ? 0 : gains / losses;
        return { time: d.time, value: losses === 0 ? 100 : 100 - (100 / (1 + rs)) };
      }
      return null;
    }
    gains = (gains * (period - 1) + (diff > 0 ? diff : 0)) / period;
    losses = (losses * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    const rs = losses === 0 ? 0 : gains / losses;
    return { time: d.time, value: losses === 0 ? 100 : 100 - (100 / (1 + rs)) };
  }).filter(d => d !== null) as LineData[];
}

const TradingChart: React.FC<TradingChartProps> = ({ symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);

  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [interval, setInterval] = useState('1m');
  
  const [showVolume, setShowVolume] = useState(true);
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Main Chart
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#e2e8f0' },
      grid: { vertLines: { color: '#2b3139' }, horzLines: { color: '#2b3139' } },
      width: chartContainerRef.current.clientWidth,
      height: showRSI ? 300 : 400,
      crosshair: { mode: 0 },
      timeScale: { timeVisible: true, secondsVisible: false }
    });
    chartRef.current = chart;
    
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#2ebd85', downColor: '#f6465d', borderVisible: false,
      wickUpColor: '#2ebd85', wickDownColor: '#f6465d',
    });

    let volumeSeries: ISeriesApi<"Histogram"> | null = null;
    if (showVolume) {
      volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', 
      });
      chart.priceScale('').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
    }

    let smaSeries: ISeriesApi<"Line"> | null = null;
    if (showSMA) smaSeries = chart.addSeries(LineSeries, { color: '#fbbf24', lineWidth: 2 });
    
    let emaSeries: ISeriesApi<"Line"> | null = null;
    if (showEMA) emaSeries = chart.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 2 });

    // RSI Chart (Secondary Container)
    let rsiChart: IChartApi | null = null;
    let rsiLineSeries: ISeriesApi<"Line"> | null = null;
    if (showRSI && rsiContainerRef.current) {
        rsiChart = createChart(rsiContainerRef.current, {
            layout: { background: { color: 'transparent' }, textColor: '#e2e8f0' },
            grid: { vertLines: { color: '#2b3139' }, horzLines: { color: '#2b3139' } },
            width: rsiContainerRef.current.clientWidth,
            height: 100,
            timeScale: { timeVisible: true, secondsVisible: false }
        });
        rsiChartRef.current = rsiChart;
        rsiLineSeries = rsiChart.addSeries(LineSeries, { color: '#f472b6', lineWidth: 2 });
        
        // Sync time scales
        chart.timeScale().subscribeVisibleTimeRangeChange(range => {
            if (range) rsiChart?.timeScale().setVisibleRange(range);
        });
    }

    // Fetch historical data
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`)
      .then(res => res.json())
      .then(data => {
        const formattedData = data.map((d: any) => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        }));
        
        candleSeries.setData(formattedData);
        if (formattedData.length > 0) setCurrentPrice(formattedData[formattedData.length - 1].close);
        
        if (showVolume && volumeSeries) {
            volumeSeries.setData(formattedData.map((d: any) => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? '#2ebd8555' : '#f6465d55'
            })));
        }

        if (showSMA && smaSeries) smaSeries.setData(calculateSMA(formattedData, 20));
        if (showEMA && emaSeries) emaSeries.setData(calculateEMA(formattedData, 20));
        if (showRSI && rsiLineSeries) rsiLineSeries.setData(calculateRSI(formattedData, 14));
      })
      .catch(err => console.error("Error fetching klines", err));

    // WebSocket live updates
    const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    let fullDataForIndicators: any[] = []; // simple caching for live indicators is omitted for brevity, we just update price

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.k) {
        const kline = message.k;
        const candle = {
          time: kline.t / 1000,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
        };
        candleSeries.update(candle);
        setCurrentPrice(parseFloat(kline.c));
        
        if (showVolume && volumeSeries) {
            volumeSeries.update({
                time: kline.t / 1000,
                value: parseFloat(kline.v),
                color: parseFloat(kline.c) >= parseFloat(kline.o) ? '#2ebd8555' : '#f6465d55'
            } as any);
        }
      }
    };

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      if (showRSI && rsiContainerRef.current && rsiChartRef.current) rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current && wsRef.current.readyState === 1) wsRef.current.close();
      chart.remove();
      if (rsiChart) rsiChart.remove();
    };
  }, [symbol, interval, showVolume, showSMA, showEMA, showRSI]);

  return (
    <GlassCard className="overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-white/10 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
            <h2 className="font-semibold text-lg text-white">{symbol}</h2>
            <div className="text-xl font-bold font-mono text-white">
                {currentPrice ? `$${currentPrice.toFixed(2)}` : 'Loading...'}
            </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-black/20 rounded-full p-1 border border-white/10">
                {TIMEFRAMES.map(tf => (
                    <button 
                        key={tf.interval}
                        onClick={() => setInterval(tf.interval)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${interval === tf.interval ? 'bg-sky-500 text-white shadow' : 'text-white/60 hover:text-white'}`}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>

            <div className="flex bg-black/20 rounded-full p-1 border border-white/10 ml-2">
                <button onClick={() => setShowVolume(!showVolume)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${showVolume ? 'bg-fuchsia-500 text-white' : 'text-white/60 hover:text-white'}`}>Vol</button>
                <button onClick={() => setShowSMA(!showSMA)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${showSMA ? 'bg-fuchsia-500 text-white' : 'text-white/60 hover:text-white'}`}>SMA</button>
                <button onClick={() => setShowEMA(!showEMA)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${showEMA ? 'bg-fuchsia-500 text-white' : 'text-white/60 hover:text-white'}`}>EMA</button>
                <button onClick={() => setShowRSI(!showRSI)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${showRSI ? 'bg-fuchsia-500 text-white' : 'text-white/60 hover:text-white'}`}>RSI</button>
            </div>
        </div>
      </div>
      
      <div className="flex-1 w-full relative">
        <div ref={chartContainerRef} className="w-full" />
        {showRSI && (
            <div className="border-t border-white/10">
                <div className="absolute left-2 mt-2 z-10 text-xs text-pink-400 font-bold">RSI (14)</div>
                <div ref={rsiContainerRef} className="w-full" />
            </div>
        )}
      </div>
    </GlassCard>
  );
};

export default TradingChart;
