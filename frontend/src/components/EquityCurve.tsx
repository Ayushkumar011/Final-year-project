import React, { useEffect, useRef } from 'react';
import { createChart, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import GlassCard from './GlassCard';
import type { PortfolioSnapshot } from '../api';
import { LineChart } from 'lucide-react';

interface EquityCurveProps {
  data: PortfolioSnapshot[];
}

const EquityCurve: React.FC<EquityCurveProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#e2e8f0',
      },
      grid: {
        vertLines: { color: '#2b3139', style: 1 },
        horzLines: { color: '#2b3139', style: 1 },
      },
      width: chartContainerRef.current.clientWidth,
      height: 250,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      }
    });

    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#38bdf8', // sky-400
      topColor: 'rgba(56, 189, 248, 0.4)',
      bottomColor: 'rgba(56, 189, 248, 0.0)',
      lineWidth: 2,
    });
    seriesRef.current = areaSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const formattedData = data.map(d => ({
        time: d.timestamp,
        value: d.equity,
      })).sort((a, b) => a.time - b.time); // ensure sorted by time
      
      // Lightweight charts requires strictly increasing time
      // Simple deduping just in case
      const uniqueData = formattedData.filter((v, i, a) => i === 0 || v.time > a[i - 1].time);
      
      seriesRef.current.setData(uniqueData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  return (
    <GlassCard className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h2 className="font-semibold flex items-center gap-2 text-white"><LineChart size={18} /> Equity Curve</h2>
      </div>
      <div className="flex-1 w-full p-2" ref={chartContainerRef} />
    </GlassCard>
  );
};

export default EquityCurve;
