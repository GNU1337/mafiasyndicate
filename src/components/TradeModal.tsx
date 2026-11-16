import * as d3 from 'd3';
import { motion } from 'motion/react';
import React, { useMemo, useState } from 'react';
import { Line, LineChart, YAxis } from 'recharts';
import { formatCash, formatCountdown } from '../data/initialGameState';
import type { AutoTradeRule, ContrabandGood, GameState, PriceAlert } from '../types/game';
import { sound } from '../utils/sound';

interface TradeModalProps {
  state: GameState;
  nowMs: number;
  onClose: () => void;
  onExecuteTrade: (goodId: string, side: 'BUY' | 'SELL', qty: number) => void;
  onRefreshMarket: () => void;
  onUpgradeCargo: () => void;
  onAddAlert: (goodId: string, condition: 'below' | 'above', targetPrice: number) => void;
  onRemoveAlert: (alertId: string) => void;
  onAddAutoTrade: (rule: Omit<AutoTradeRule, 'id' | 'executedCount' | 'lastTriggeredAt'>) => void;
  onToggleAutoTrade: (ruleId: string) => void;
  onRemoveAutoTrade: (ruleId: string) => void;
}

type TradeTab = 'exchange' | 'autotrade' | 'portfolio' | 'ledger';
type WatchFilter = 'all' | 'undervalued' | 'held';
type LedgerFilter = 'ALL' | 'BUY' | 'SELL';

interface OrderBookLevel {
  desk: string;
  price: number;
  qty: number;
  cumQty: number;
  depthPct: number;
}

const BUYER_DESKS = ['Gambino Pier 4', 'Corleone Docks', 'Genovese Brokers', 'Harbor Syndicate'];
const SELLER_DESKS = ['Palermo Imports', 'Salvatore Cargo', 'Padrino Warehouses', 'Blackwater Line'];

function buildOrderBook(good: ContrabandGood): {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  spread: number;
  spreadPct: number;
} {
  const step = Math.max(1, Math.round(good.currentPrice * (good.volatilityLabel === 'High' ? 0.018 : good.volatilityLabel === 'Medium' ? 0.014 : 0.01)));
  const seed = good.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + good.currentPrice;

  const rawAsks = [0, 1, 2, 3].map((i) => {
    const price = good.currentPrice + step * (i + 1);
    const qty = 3 + ((seed + i * 7) % 14);
    return { desk: SELLER_DESKS[i], price, qty };
  });

  const rawBids = [0, 1, 2, 3].map((i) => {
    const price = Math.max(1, good.currentPrice - step * (i + 1));
    const qty = 4 + ((seed + i * 5) % 15);
    return { desk: BUYER_DESKS[i], price, qty };
  });

  let askCum = 0;
  const asksWithCum = rawAsks.map((a) => {
    askCum += a.qty;
    return { ...a, cumQty: askCum };
  });
  const maxAskCum = Math.max(1, askCum);
  const asks: OrderBookLevel[] = [...asksWithCum]
    .reverse()
    .map((a) => ({ ...a, depthPct: Math.round((a.cumQty / maxAskCum) * 100) }));

  let bidCum = 0;
  const bidsWithCum = rawBids.map((b) => {
    bidCum += b.qty;
    return { ...b, cumQty: bidCum };
  });
  const maxBidCum = Math.max(1, bidCum);
  const bids: OrderBookLevel[] = bidsWithCum.map((b) => ({
    ...b,
    depthPct: Math.round((b.cumQty / maxBidCum) * 100),
  }));

  const bestAsk = rawAsks[0].price;
  const bestBid = rawBids[0].price;
  const spread = bestAsk - bestBid;
  const spreadPct = (spread / Math.max(1, good.currentPrice)) * 100;

  return { asks, bids, spread, spreadPct };
}

function AnimatedPrice({
  good,
  className = '',
}: {
  good: ContrabandGood;
  className?: string;
}) {
  const delta = good.currentPrice - good.previousPrice;
  const pulseColor =
    delta > 0
      ? ['#4ade80', '#86efac', '#ffffff']
      : delta < 0
      ? ['#f87171', '#fca5a5', '#ffffff']
      : ['#ffffff'];
  const pulseBg =
    delta > 0
      ? ['rgba(34, 197, 94, 0.32)', 'rgba(34, 197, 94, 0.12)', 'rgba(34, 197, 94, 0)']
      : delta < 0
      ? ['rgba(239, 68, 68, 0.32)', 'rgba(239, 68, 68, 0.12)', 'rgba(239, 68, 68, 0)']
      : ['rgba(0,0,0,0)'];

  return (
    <motion.span
      key={`${good.id}-${good.priceHistory.length}-${good.currentPrice}`}
      initial={
        delta !== 0
          ? {
              scale: 1.07,
              color: pulseColor[0],
              backgroundColor: pulseBg[0],
            }
          : false
      }
      animate={{
        scale: 1,
        color: pulseColor,
        backgroundColor: pulseBg,
      }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      className={`inline-block rounded px-1 -mx-1 font-mono-num ${className}`}
    >
      ${formatCash(good.currentPrice)}
    </motion.span>
  );
}

function RechartsSparkline({ good }: { good: ContrabandGood }) {
  const data = useMemo(
    () =>
      good.priceHistory.slice(-16).map((price, idx) => ({
        idx,
        price,
      })),
    [good.priceHistory]
  );

  const first = data[0]?.price ?? good.basePrice;
  const last = data[data.length - 1]?.price ?? good.currentPrice;
  const stroke = last >= first ? '#4ade80' : '#f87171';

  return (
    <div className="w-[82px] h-[28px] shrink-0 pointer-events-none" aria-hidden="true">
      <LineChart width={82} height={28} data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <YAxis domain={['dataMin', 'dataMax']} hide />
        <Line
          type="monotone"
          dataKey="price"
          stroke={stroke}
          strokeWidth={1.8}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}

function MiniD3TrendChart({
  good,
  isSelected,
  onSelect,
}: {
  good: ContrabandGood;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const values = good.priceHistory.slice(-24);
  const w = 152;
  const h = 44;
  const padX = 4;
  const padY = 5;

  const { linePath, areaPath, lastX, lastY, trendUp, pct24h } = useMemo(() => {
    const minVal = Math.min(...values, good.basePrice * 0.92);
    const maxVal = Math.max(...values, good.basePrice * 1.08);
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, values.length - 1)])
      .range([padX, w - padX]);
    const yScale = d3
      .scaleLinear()
      .domain([minVal, Math.max(minVal + 1, maxVal)])
      .range([h - padY, padY]);

    const lineGen = d3
      .line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<number>()
      .x((_, i) => xScale(i))
      .y0(h - padY)
      .y1((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    const first = values[0] ?? good.basePrice;
    const last = values[values.length - 1] ?? good.currentPrice;
    const pct = ((last - first) / Math.max(1, first)) * 100;

    return {
      linePath: lineGen(values) ?? '',
      areaPath: areaGen(values) ?? '',
      lastX: xScale(Math.max(0, values.length - 1)),
      lastY: yScale(last),
      trendUp: last >= first,
      pct24h: pct,
    };
  }, [values, good.basePrice, good.currentPrice]);

  const stroke = trendUp ? '#4ade80' : '#f87171';
  const gradId = `mini-d3-grad-${good.id}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left p-2.5 rounded-xl border transition cursor-pointer ${
        isSelected
          ? 'bg-amber-500/15 border-amber-400/60'
          : 'bg-black/40 border-white/10 hover:border-white/25 hover:bg-white/5'
      }`}
    >
      <div className="flex items-center justify-between gap-1 text-[11px]">
        <span className="font-bold text-white truncate">{good.name.split(' ')[0]}</span>
        <span className={`font-mono-num font-bold ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {pct24h >= 0 ? '+' : ''}
          {pct24h.toFixed(1)}%
        </span>
      </div>
      <div className="my-1">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-11 overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
          <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" />
          <circle cx={lastX} cy={lastY} r="2.8" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </svg>
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono-num">
        <AnimatedPrice good={good} className="font-bold text-white text-xs" />
        <span className="text-slate-400">
          {good.currentPrice < good.basePrice ? 'BUY' : good.currentPrice > good.basePrice * 1.07 ? 'SELL' : 'HOLD'}
        </span>
      </div>
    </button>
  );
}

function D3PriceChart24h({ good }: { good: ContrabandGood }) {
  const values = good.priceHistory.slice(-24);
  const w = 480;
  const h = 178;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 24;

  const {
    linePath,
    areaPath,
    baseY,
    avgBuyY,
    yTicks,
    xScale,
    yScale,
    trendUp,
    pct24h,
    low24,
    high24,
  } = useMemo(() => {
    const extras = [good.basePrice];
    if (good.owned > 0 && good.avgBuyPrice > 0) extras.push(good.avgBuyPrice);
    const minVal = Math.floor(Math.min(...values, ...extras) * 0.94);
    const maxVal = Math.ceil(Math.max(...values, ...extras) * 1.06);

    const xs = d3
      .scaleLinear()
      .domain([0, Math.max(1, values.length - 1)])
      .range([padL, w - padR]);

    const ys = d3
      .scaleLinear()
      .domain([minVal, Math.max(minVal + 1, maxVal)])
      .range([h - padB, padT]);

    const lineGen = d3
      .line<number>()
      .x((_, i) => xs(i))
      .y((d) => ys(d))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<number>()
      .x((_, i) => xs(i))
      .y0(h - padB)
      .y1((d) => ys(d))
      .curve(d3.curveMonotoneX);

    const first = values[0] ?? good.basePrice;
    const last = values[values.length - 1] ?? good.currentPrice;

    return {
      linePath: lineGen(values) ?? '',
      areaPath: areaGen(values) ?? '',
      baseY: ys(good.basePrice),
      avgBuyY: good.owned > 0 && good.avgBuyPrice > 0 ? ys(good.avgBuyPrice) : null,
      yTicks: ys.ticks(4),
      xScale: xs,
      yScale: ys,
      trendUp: last >= first,
      pct24h: ((last - first) / Math.max(1, first)) * 100,
      low24: d3.min(values) ?? good.currentPrice,
      high24: d3.max(values) ?? good.currentPrice,
    };
  }, [values, good.basePrice, good.owned, good.avgBuyPrice, good.currentPrice]);

  const strokeColor = trendUp ? '#4ade80' : '#f87171';
  const gradId = `d3-24h-area-${good.id}`;

  return (
    <div className="w-full rounded-xl bg-black/45 border border-white/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">24-Hour Price Trend (D3.js)</span>
          <span
            className={`font-mono-num font-bold ${
              trendUp ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {pct24h >= 0 ? '▲ +' : '▼ '}
            {pct24h.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono-num text-[11px]">
          <span className="text-slate-400">
            24h Range: ${formatCash(low24)}–${formatCash(high24)}
          </span>
          <span className="text-amber-300">--- Base: ${formatCash(good.basePrice)}</span>
          {avgBuyY !== null && (
            <span className="text-sky-300">--- Avg Cost: ${formatCash(good.avgBuyPrice)}</span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = yScale(tick);
          return (
            <g key={tick}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
              <text
                x={padL - 7}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="#94a3b8"
                className="font-mono-num"
              >
                ${Math.round(tick)}
              </text>
            </g>
          );
        })}

        {/* Base Price Line */}
        <line
          x1={padL}
          y1={baseY}
          x2={w - padR}
          y2={baseY}
          stroke="#fbbf24"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />

        {/* Avg Cost Line */}
        {avgBuyY !== null && (
          <line
            x1={padL}
            y1={avgBuyY}
            x2={w - padR}
            y2={avgBuyY}
            stroke="#38bdf8"
            strokeWidth="1.4"
            strokeDasharray="3 3"
          />
        )}

        {/* D3 Area & Path */}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {values.map((v, i) => {
          const isLast = i === values.length - 1;
          return (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(v)}
              r={isLast ? 4.2 : 2}
              fill={isLast ? '#ffffff' : strokeColor}
              stroke={isLast ? strokeColor : 'none'}
              strokeWidth={isLast ? 2 : 0}
            />
          );
        })}

        <text x={padL} y={h - 5} fontSize="10" fill="#64748b" className="font-mono-num">
          -24h
        </text>
        <text
          x={padL + (w - padL - padR) * 0.5}
          y={h - 5}
          textAnchor="middle"
          fontSize="10"
          fill="#64748b"
          className="font-mono-num"
        >
          -12h
        </text>
        <text
          x={w - padR}
          y={h - 5}
          textAnchor="end"
          fontSize="10"
          fill="#94a3b8"
          className="font-mono-num"
        >
          Now
        </text>
      </svg>
    </div>
  );
}

export const TradeModal: React.FC<TradeModalProps> = ({
  state,
  nowMs,
  onClose,
  onExecuteTrade,
  onRefreshMarket,
  onUpgradeCargo,
  onAddAlert,
  onRemoveAlert,
  onAddAutoTrade,
  onToggleAutoTrade,
  onRemoveAutoTrade,
}) => {
  const {
    player,
    contraband,
    tradeHistory,
    priceAlerts,
    autoTradeRules,
    cargoCapacity,
    marketNextTickAt,
  } = state;

  const [activeTab, setActiveTab] = useState<TradeTab>('exchange');
  const [selectedId, setSelectedId] = useState<string>(contraband[0]?.id ?? 'whiskey');
  const [watchFilter, setWatchFilter] = useState<WatchFilter>('all');
  const [qtyInput, setQtyInput] = useState<string>('1');
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('ALL');

  const [alertGoodId, setAlertGoodId] = useState<string>(contraband[0]?.id ?? 'whiskey');
  const [alertCond, setAlertCond] = useState<'below' | 'above'>('below');
  const [alertTarget, setAlertTarget] = useState<string>('42');

  const [autoGoodId, setAutoGoodId] = useState<string>(contraband[0]?.id ?? 'whiskey');
  const [autoSide, setAutoSide] = useState<'BUY' | 'SELL'>('SELL');
  const [autoCond, setAutoCond] = useState<'below' | 'above'>('above');
  const [autoPrice, setAutoPrice] = useState<string>(
    String(Math.round((contraband[0]?.basePrice ?? 45) * 1.15))
  );
  const [autoQtyMode, setAutoQtyMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [autoQtyNum, setAutoQtyNum] = useState<string>('5');
  const [autoRepeat, setAutoRepeat] = useState<boolean>(false);

  const selectedGood = contraband.find((g) => g.id === selectedId) ?? contraband[0];

  const totalOwnedUnits = useMemo(
    () => contraband.reduce((acc, g) => acc + g.owned, 0),
    [contraband]
  );
  const cargoFree = Math.max(0, cargoCapacity - totalOwnedUnits);

  const portfolioStats = useMemo(() => {
    let holdingsValue = 0;
    let totalCostBasis = 0;
    let totalRealized = 0;
    for (const g of contraband) {
      holdingsValue += g.owned * g.currentPrice;
      totalCostBasis += g.owned * g.avgBuyPrice;
      totalRealized += g.realizedProfit;
    }
    const unrealizedPnl = holdingsValue - totalCostBasis;
    const sellTrades = tradeHistory.filter((t) => t.side === 'SELL');
    const winningSells = sellTrades.filter((t) => (t.realizedDelta ?? 0) > 0).length;
    const winRate = sellTrades.length > 0 ? Math.round((winningSells / sellTrades.length) * 100) : 0;
    const totalVolume = tradeHistory.reduce((acc, t) => acc + t.total, 0);
    const bestTrade = sellTrades.reduce(
      (best, t) => Math.max(best, t.realizedDelta ?? 0),
      0
    );
    return {
      holdingsValue,
      unrealizedPnl,
      totalRealized,
      winRate,
      sellCount: sellTrades.length,
      totalVolume,
      bestTrade,
    };
  }, [contraband, tradeHistory]);

  const filteredGoods = useMemo(() => {
    return contraband.filter((g) => {
      if (watchFilter === 'held') return g.owned > 0;
      if (watchFilter === 'undervalued') return g.currentPrice < g.basePrice;
      return true;
    });
  }, [contraband, watchFilter]);

  const orderBook = useMemo(() => buildOrderBook(selectedGood), [selectedGood]);

  const parsedQty = Math.max(1, Math.floor(Number(qtyInput) || 1));
  const maxAffordable = Math.floor(player.cash / Math.max(1, selectedGood.currentPrice));
  const maxBuyable = Math.max(0, Math.min(cargoFree, maxAffordable));

  const orderTotal = parsedQty * selectedGood.currentPrice;
  const canBuy = parsedQty > 0 && parsedQty <= maxBuyable;
  const canSell = parsedQty > 0 && parsedQty <= selectedGood.owned;

  const spreadVsBasePct =
    ((selectedGood.currentPrice - selectedGood.basePrice) / selectedGood.basePrice) * 100;
  const tickDelta = selectedGood.currentPrice - selectedGood.previousPrice;
  const sessionLow = Math.min(...selectedGood.priceHistory);
  const sessionHigh = Math.max(...selectedGood.priceHistory);

  const selectedUnrealized =
    selectedGood.owned > 0
      ? (selectedGood.currentPrice - selectedGood.avgBuyPrice) * selectedGood.owned
      : 0;
  const selectedUnrealizedPct =
    selectedGood.owned > 0 && selectedGood.avgBuyPrice > 0
      ? ((selectedGood.currentPrice - selectedGood.avgBuyPrice) / selectedGood.avgBuyPrice) * 100
      : 0;

  const sellAllProceeds = selectedGood.owned * selectedGood.currentPrice;
  const sellAllProfit =
    selectedGood.owned > 0
      ? (selectedGood.currentPrice - selectedGood.avgBuyPrice) * selectedGood.owned
      : 0;

  const projectedSellDelta =
    selectedGood.owned > 0
      ? (selectedGood.currentPrice - selectedGood.avgBuyPrice) * Math.min(parsedQty, selectedGood.owned)
      : 0;

  const marketCountdownMs = Math.max(0, marketNextTickAt - nowMs);
  const triggeredAlertsCount = priceAlerts.filter((a) => a.triggered).length;
  const activeAutoRulesCount = autoTradeRules.filter((r) => r.enabled).length;

  const filteredLedger = useMemo(
    () =>
      tradeHistory.filter((t) => (ledgerFilter === 'ALL' ? true : t.side === ledgerFilter)),
    [tradeHistory, ledgerFilter]
  );

  const advisorOpportunities = useMemo(() => {
    const buyDips = contraband
      .filter((g) => g.currentPrice <= g.basePrice * 0.94)
      .sort((a, b) => a.currentPrice / a.basePrice - b.currentPrice / b.basePrice);
    const takeProfits = contraband
      .filter((g) => g.owned > 0 && g.currentPrice > g.avgBuyPrice * 1.03)
      .sort(
        (a, b) =>
          (b.currentPrice - b.avgBuyPrice) / Math.max(1, b.avgBuyPrice) -
          (a.currentPrice - a.avgBuyPrice) / Math.max(1, a.avgBuyPrice)
      );
    return { buyDips, takeProfits };
  }, [contraband]);

  const handlePrefillAutoTrade = (
    good: ContrabandGood,
    side: 'BUY' | 'SELL',
    targetPrice: number
  ) => {
    sound.playClick();
    setAutoGoodId(good.id);
    setAutoSide(side);
    setAutoCond(side === 'BUY' ? 'below' : 'above');
    setAutoPrice(String(Math.max(1, Math.round(targetPrice))));
    setAutoQtyMode(side === 'SELL' ? 'ALL' : 'CUSTOM');
    setActiveTab('autotrade');
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[1040px] max-h-[92vh] flex flex-col rounded-2xl bg-[#131110]/98 border-2 border-[#b99142]/75 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#261a12] border-b border-amber-500/25">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-amber-200 tracking-wide whitespace-nowrap">
              Contraband Exchange
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-black/45 border border-white/10 overflow-x-auto">
              {(
                [
                  ['exchange', 'Exchange'],
                  ['autotrade', `Auto-Trade${activeAutoRulesCount > 0 ? ` (${activeAutoRulesCount})` : ''}`],
                  ['portfolio', 'Portfolio & P&L'],
                  ['ledger', `Ledger & Alerts${triggeredAlertsCount > 0 ? ` (${triggeredAlertsCount})` : ''}`],
                ] as const
              ).map(([tabKey, label]) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab(tabKey);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    activeTab === tabKey
                      ? 'bg-[#b99142] text-black shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onRefreshMarket();
              }}
              className="px-3 py-1.5 rounded-lg bg-black/50 border border-amber-400/40 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition cursor-pointer whitespace-nowrap"
            >
              Scout Quotes ($5) · {formatCountdown(marketCountdownMs).slice(3)}
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              aria-label="Close Contraband Exchange"
              className="w-10 h-10 flex items-center justify-center text-white text-xl font-bold hover:text-amber-300 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Single-Row Portfolio Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-white/10 bg-[#1a1613] border-b border-white/10 px-4 py-2.5 text-xs">
          <div className="px-2 py-1">
            <div className="text-slate-400">Cash Available</div>
            <div className="text-sm sm:text-base font-bold font-mono-num text-white">
              ${formatCash(player.cash)}
            </div>
          </div>
          <div className="px-2 py-1 flex items-center justify-between gap-2">
            <div>
              <div className="text-slate-400">Cargo Hold</div>
              <div className="text-sm sm:text-base font-bold font-mono-num text-white">
                {totalOwnedUnits} / {cargoCapacity}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onUpgradeCargo();
              }}
              title="Expand Cargo Hold +10 Crates ($200)"
              className="px-2 py-1 rounded bg-white/10 hover:bg-amber-500/25 text-[11px] font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
            >
              +10 ($200)
            </button>
          </div>
          <div className="px-2 py-1">
            <div className="text-slate-400">Holdings Value</div>
            <div className="text-sm sm:text-base font-bold font-mono-num text-amber-200">
              ${formatCash(portfolioStats.holdingsValue)}
            </div>
          </div>
          <div className="px-2 py-1">
            <div className="text-slate-400">Unrealized P&amp;L</div>
            <div
              className={`text-sm sm:text-base font-bold font-mono-num ${
                portfolioStats.unrealizedPnl > 0.01
                  ? 'text-emerald-400'
                  : portfolioStats.unrealizedPnl < -0.01
                  ? 'text-red-400'
                  : 'text-slate-300'
              }`}
            >
              {portfolioStats.unrealizedPnl >= 0 ? '+' : '-'}${formatCash(Math.abs(portfolioStats.unrealizedPnl))}{' '}
              <span className="text-[11px] font-sans font-semibold">
                {portfolioStats.unrealizedPnl > 0.01
                  ? 'PROFIT'
                  : portfolioStats.unrealizedPnl < -0.01
                  ? 'LOSS'
                  : 'EVEN'}
              </span>
            </div>
          </div>
          <div className="px-2 py-1">
            <div className="text-slate-400">Realized Profit</div>
            <div
              className={`text-sm sm:text-base font-bold font-mono-num ${
                portfolioStats.totalRealized >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {portfolioStats.totalRealized >= 0 ? '+' : '-'}${formatCash(Math.abs(portfolioStats.totalRealized))}
            </div>
          </div>
        </div>

        {/* Main Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto mafia-scroll p-4 sm:p-5 space-y-5">
          {activeTab === 'exchange' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[1.02fr_1.18fr] gap-5 items-start">
                {/* Left Column: Watchlist with Recharts Sparklines + Buy/Sell Order Book */}
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-300">
                        Harbor Commodity Quotes (Recharts Sparklines)
                      </span>
                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/45 border border-white/10">
                        {(
                          [
                            ['all', 'All'],
                            ['undervalued', 'Below Avg'],
                            ['held', 'Held'],
                          ] as const
                        ).map(([fKey, fLabel]) => (
                          <button
                            key={fKey}
                            type="button"
                            onClick={() => setWatchFilter(fKey)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                              watchFilter === fKey
                                ? 'bg-zinc-700 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {fLabel}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="divide-y divide-white/10 rounded-xl border border-white/15 bg-black/35 overflow-hidden">
                      {filteredGoods.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400">
                          No commodities match this filter. Switch to <strong>All</strong> to view all quotes.
                        </div>
                      ) : (
                        filteredGoods.map((good) => {
                          const isSelected = good.id === selectedGood.id;
                          const diff = good.currentPrice - good.previousPrice;
                          const vsBasePct = ((good.currentPrice - good.basePrice) / good.basePrice) * 100;
                          const signalText =
                            vsBasePct <= -6
                              ? 'BUY DIP'
                              : vsBasePct >= 8
                              ? 'HIGH SELL'
                              : 'FAIR PAR';
                          const signalColor =
                            vsBasePct <= -6
                              ? 'text-emerald-400'
                              : vsBasePct >= 8
                              ? 'text-amber-300'
                              : 'text-slate-400';

                          return (
                            <button
                              key={good.id}
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                setSelectedId(good.id);
                              }}
                              className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-left transition cursor-pointer min-h-[60px] ${
                                isSelected ? 'bg-amber-500/15' : 'hover:bg-white/5'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-sm text-white truncate">
                                  {good.name}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-mono-num">
                                  <span className={signalColor}>{signalText}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>Owned: {good.owned}</span>
                                  {good.owned > 0 && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-sky-300">Avg ${formatCash(good.avgBuyPrice)}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <RechartsSparkline good={good} />

                              <div className="text-right shrink-0">
                                <div className="font-bold text-sm text-white">
                                  <AnimatedPrice good={good} />
                                </div>
                                <div
                                  className={`text-xs font-mono-num ${
                                    diff >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}
                                >
                                  {diff >= 0 ? '▲' : '▼'} {diff >= 0 ? '+' : ''}
                                  {diff.toFixed(0)} ({vsBasePct >= 0 ? '+' : ''}
                                  {vsBasePct.toFixed(1)}%)
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Visual Buy/Sell Order Book */}
                  <div className="rounded-xl border border-white/15 bg-black/40 p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-amber-200">
                          Buy/Sell Order Book — {selectedGood.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Click any Bid or Ask price to stage an Auto-Trade trigger
                        </div>
                      </div>
                      <span className="text-[11px] font-mono-num text-slate-300">
                        Spread: ${formatCash(orderBook.spread)} ({orderBook.spreadPct.toFixed(1)}%)
                      </span>
                    </div>

                    {/* Top Market Asks (Sellers) */}
                    <div className="space-y-1">
                      <div className="grid grid-cols-[1.1fr_0.7fr_0.7fr] text-[10px] font-semibold text-slate-400 px-2">
                        <span>ASK DESK (SELLERS)</span>
                        <span className="text-right">CRATES</span>
                        <span className="text-right">ASK PRICE</span>
                      </div>
                      {orderBook.asks.map((lvl, idx) => (
                        <button
                          key={`ask-${idx}`}
                          type="button"
                          onClick={() => handlePrefillAutoTrade(selectedGood, 'SELL', lvl.price)}
                          className="relative w-full grid grid-cols-[1.1fr_0.7fr_0.7fr] items-center px-2 py-1.5 rounded text-xs font-mono-num overflow-hidden hover:bg-white/5 cursor-pointer text-left"
                        >
                          <span
                            className="absolute inset-y-0 right-0 bg-red-500/15 pointer-events-none"
                            style={{ width: `${lvl.depthPct}%` }}
                          />
                          <span className="relative text-[11px] font-sans text-slate-300 truncate">
                            ASK · {lvl.desk}
                          </span>
                          <span className="relative text-right text-slate-200">{lvl.qty}</span>
                          <span className="relative text-right font-bold text-red-400">
                            ${formatCash(lvl.price)}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Historical Midpoint & 24h Fluctuation Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#1c1714] border border-amber-500/25 text-[11px] font-mono-num">
                      <span className="text-amber-200 font-bold">
                        MID ${formatCash(selectedGood.currentPrice)}
                      </span>
                      <span className="text-slate-300">
                        24h Low: <strong className="text-emerald-300">${formatCash(sessionLow)}</strong>
                      </span>
                      <span className="text-slate-300">
                        24h High: <strong className="text-red-300">${formatCash(sessionHigh)}</strong>
                      </span>
                    </div>

                    {/* Top Market Bids (Buyers) */}
                    <div className="space-y-1">
                      <div className="grid grid-cols-[1.1fr_0.7fr_0.7fr] text-[10px] font-semibold text-slate-400 px-2">
                        <span>BID DESK (BUYERS)</span>
                        <span className="text-right">CRATES</span>
                        <span className="text-right">BID PRICE</span>
                      </div>
                      {orderBook.bids.map((lvl, idx) => (
                        <button
                          key={`bid-${idx}`}
                          type="button"
                          onClick={() => handlePrefillAutoTrade(selectedGood, 'BUY', lvl.price)}
                          className="relative w-full grid grid-cols-[1.1fr_0.7fr_0.7fr] items-center px-2 py-1.5 rounded text-xs font-mono-num overflow-hidden hover:bg-white/5 cursor-pointer text-left"
                        >
                          <span
                            className="absolute inset-y-0 right-0 bg-emerald-500/15 pointer-events-none"
                            style={{ width: `${lvl.depthPct}%` }}
                          />
                          <span className="relative text-[11px] font-sans text-slate-300 truncate">
                            BID · {lvl.desk}
                          </span>
                          <span className="relative text-right text-slate-200">{lvl.qty}</span>
                          <span className="relative text-right font-bold text-emerald-400">
                            ${formatCash(lvl.price)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Selected Inspector (D3 24h Chart + Order Ticket + Sell All) */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-display text-2xl font-bold text-white">
                        {selectedGood.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-num mt-0.5">
                        <span>Volatility: {selectedGood.volatilityLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>24h Low: ${formatCash(sessionLow)}</span>
                        <span aria-hidden="true">·</span>
                        <span>24h High: ${formatCash(sessionHigh)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        <AnimatedPrice good={selectedGood} />
                      </div>
                      <div
                        className={`text-xs font-mono-num ${
                          tickDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tickDelta >= 0 ? 'Up +' : 'Down '}
                        {tickDelta.toFixed(0)} · {spreadVsBasePct >= 0 ? '+' : ''}
                        {spreadVsBasePct.toFixed(1)}% vs Base
                      </div>
                    </div>
                  </div>

                  {/* Primary D3.js 24-Hour Line Chart */}
                  <D3PriceChart24h good={selectedGood} />

                  {/* Position Summary if Held */}
                  {selectedGood.owned > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-sky-950/35 border border-sky-400/30 text-xs">
                      <div className="space-y-0.5">
                        <div className="text-slate-300">
                          Position: <strong className="text-white font-mono-num">{selectedGood.owned} crates</strong> · Avg Cost{' '}
                          <strong className="text-sky-300 font-mono-num">${formatCash(selectedGood.avgBuyPrice)}</strong>
                        </div>
                        <div
                          className={`font-mono-num font-semibold ${
                            selectedUnrealized >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          Open P&amp;L: {selectedUnrealized >= 0 ? '+' : '-'}${formatCash(Math.abs(selectedUnrealized))} ({selectedUnrealizedPct >= 0 ? '+' : ''}
                          {selectedUnrealizedPct.toFixed(1)}%)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handlePrefillAutoTrade(
                            selectedGood,
                            'SELL',
                            Math.round(selectedGood.avgBuyPrice * 1.12)
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-black/50 border border-amber-400/40 text-amber-200 font-semibold text-xs hover:bg-amber-500/20 cursor-pointer whitespace-nowrap"
                      >
                        Set Auto-Sell (+12%)
                      </button>
                    </div>
                  )}

                  {/* Order Execution Ticket */}
                  <div className="p-4 rounded-xl bg-black/45 border border-white/15 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-300">Order Quantity</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[1, 5, 10].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setQtyInput(String(preset))}
                            className="px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs font-mono-num font-bold text-white cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setQtyInput(String(Math.max(1, maxBuyable)))}
                          className="px-2.5 py-1.5 rounded bg-emerald-900/60 border border-emerald-500/40 hover:bg-emerald-800/70 text-xs font-bold text-emerald-200 cursor-pointer"
                        >
                          Max Buy ({maxBuyable})
                        </button>
                        {selectedGood.owned > 0 && (
                          <button
                            type="button"
                            onClick={() => setQtyInput(String(selectedGood.owned))}
                            className="px-2.5 py-1.5 rounded bg-amber-900/60 border border-amber-500/40 hover:bg-amber-800/70 text-xs font-bold text-amber-200 cursor-pointer"
                          >
                            Max Sell ({selectedGood.owned})
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQtyInput(String(Math.max(1, parsedQty - 1)))}
                        className="w-11 h-11 rounded-lg bg-zinc-800 border border-white/15 text-lg font-bold text-white hover:bg-zinc-700 cursor-pointer"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={qtyInput}
                        onChange={(e) => setQtyInput(e.target.value)}
                        className="flex-1 h-11 px-3 rounded-lg bg-black/70 border border-white/20 text-center text-base font-mono-num font-bold text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setQtyInput(String(parsedQty + 1))}
                        className="w-11 h-11 rounded-lg bg-zinc-800 border border-white/15 text-lg font-bold text-white hover:bg-zinc-700 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 font-mono-num pt-1 border-t border-white/10">
                      <span>
                        Order Value: <strong className="text-white">${formatCash(orderTotal)}</strong>
                      </span>
                      {selectedGood.owned > 0 ? (
                        <span className={projectedSellDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          Est. Sell P&amp;L: {projectedSellDelta >= 0 ? '+' : '-'}${formatCash(Math.abs(projectedSellDelta))}
                        </span>
                      ) : (
                        <span>Free Hold: {cargoFree} crates</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        disabled={!canBuy}
                        onClick={() => onExecuteTrade(selectedGood.id, 'BUY', parsedQty)}
                        className="h-11 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition cursor-pointer"
                      >
                        Buy {parsedQty} (${formatCash(orderTotal)})
                      </button>
                      <button
                        type="button"
                        disabled={!canSell}
                        onClick={() => onExecuteTrade(selectedGood.id, 'SELL', parsedQty)}
                        className="h-11 rounded-xl bg-[#b99142] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition cursor-pointer"
                      >
                        Sell {parsedQty} (${formatCash(orderTotal)})
                      </button>
                    </div>

                    {/* Dedicated Sell All Action with Total Potential Profit Calculation */}
                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-mono-num">
                        {selectedGood.owned > 0 ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-300">
                              Sell All Proceeds:{' '}
                              <strong className="text-white">${formatCash(sellAllProceeds)}</strong>
                            </div>
                            <div
                              className={
                                sellAllProfit > 0.01
                                  ? 'text-emerald-400 font-bold'
                                  : sellAllProfit < -0.01
                                  ? 'text-red-400 font-bold'
                                  : 'text-slate-300 font-bold'
                              }
                            >
                              Potential {sellAllProfit >= 0 ? 'PROFIT' : 'LOSS'}:{' '}
                              {sellAllProfit >= 0 ? '+' : '-'}${formatCash(Math.abs(sellAllProfit))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-sans">
                            Buy crates above to unlock instant Sell All liquidation.
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={selectedGood.owned <= 0}
                        onClick={() => {
                          sound.playCash();
                          onExecuteTrade(selectedGood.id, 'SELL', selectedGood.owned);
                        }}
                        className="h-10 px-4 rounded-xl bg-amber-300 hover:bg-amber-200 disabled:opacity-35 disabled:cursor-not-allowed text-black font-bold text-xs sm:text-sm transition cursor-pointer whitespace-nowrap"
                      >
                        Sell All ({selectedGood.owned}){selectedGood.owned > 0 ? ` · ${sellAllProfit >= 0 ? '+' : '-'}$${formatCash(Math.abs(sellAllProfit))}` : ''}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 24-Hour Mini D3.js Line Charts Across All Contraband Items */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    24-Hour Market Overview — Mini D3.js Line Charts (Click Item to Inspect)
                  </span>
                  <span className="text-[11px] font-mono-num text-slate-400">
                    Next market tick in {formatCountdown(marketCountdownMs).slice(3)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {contraband.map((g) => (
                    <MiniD3TrendChart
                      key={g.id}
                      good={g}
                      isSelected={g.id === selectedGood.id}
                      onSelect={() => {
                        sound.playClick();
                        setSelectedId(g.id);
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'autotrade' && (
            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.25fr] gap-5 items-start">
              {/* Create Conditional Auto-Trade Rule */}
              <div className="p-4 rounded-xl bg-black/45 border border-white/15 space-y-3.5">
                <div>
                  <div className="font-bold text-sm text-amber-200">Create Auto-Trade Trigger</div>
                  <p className="text-xs text-slate-400 mt-1">
                    Rules execute automatically on every 30s market tick and Scout refresh—even while you are out on missions or playing mini-games.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-xs text-slate-300 font-semibold">
                    Commodity
                    <select
                      value={autoGoodId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setAutoGoodId(nextId);
                        const found = contraband.find((g) => g.id === nextId);
                        if (found) {
                          setAutoPrice(
                            String(
                              Math.round(
                                found.currentPrice * (autoSide === 'BUY' ? 0.9 : 1.12)
                              )
                            )
                          );
                        }
                      }}
                      className="mt-1 w-full h-10 px-2.5 rounded-lg bg-zinc-900 border border-white/20 text-xs text-white"
                    >
                      {contraband.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} (Now ${g.currentPrice} · Owned {g.owned})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block text-xs text-slate-300 font-semibold">
                      Action
                      <select
                        value={autoSide}
                        onChange={(e) => {
                          const s = e.target.value as 'BUY' | 'SELL';
                          setAutoSide(s);
                          setAutoCond(s === 'BUY' ? 'below' : 'above');
                          if (s === 'BUY') setAutoQtyMode('CUSTOM');
                        }}
                        className="mt-1 w-full h-10 px-2.5 rounded-lg bg-zinc-900 border border-white/20 text-xs text-white"
                      >
                        <option value="BUY">Automatically BUY</option>
                        <option value="SELL">Automatically SELL</option>
                      </select>
                    </label>

                    <label className="block text-xs text-slate-300 font-semibold">
                      Condition
                      <select
                        value={autoCond}
                        onChange={(e) => setAutoCond(e.target.value as 'below' | 'above')}
                        className="mt-1 w-full h-10 px-2.5 rounded-lg bg-zinc-900 border border-white/20 text-xs text-white"
                      >
                        <option value="below">If Price Drops Below ≤</option>
                        <option value="above">If Price Rises Above ≥</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block text-xs text-slate-300 font-semibold">
                      Target Price ($)
                      <input
                        type="number"
                        min={1}
                        value={autoPrice}
                        onChange={(e) => setAutoPrice(e.target.value)}
                        className="mt-1 w-full h-10 px-3 rounded-lg bg-black/70 border border-white/20 text-sm font-mono-num text-white"
                      />
                    </label>

                    <label className="block text-xs text-slate-300 font-semibold">
                      Quantity
                      <div className="mt-1 flex items-center gap-1.5">
                        {autoSide === 'SELL' && (
                          <button
                            type="button"
                            onClick={() =>
                              setAutoQtyMode((m) => (m === 'ALL' ? 'CUSTOM' : 'ALL'))
                            }
                            className={`h-10 px-2.5 rounded-lg border text-xs font-bold cursor-pointer whitespace-nowrap ${
                              autoQtyMode === 'ALL'
                                ? 'bg-[#b99142] border-amber-300 text-black'
                                : 'bg-zinc-900 border-white/20 text-slate-300'
                            }`}
                          >
                            {autoQtyMode === 'ALL' ? 'ALL' : 'Qty'}
                          </button>
                        )}
                        <input
                          type="number"
                          min={1}
                          disabled={autoSide === 'SELL' && autoQtyMode === 'ALL'}
                          value={autoSide === 'SELL' && autoQtyMode === 'ALL' ? '' : autoQtyNum}
                          placeholder={autoSide === 'SELL' && autoQtyMode === 'ALL' ? 'All Held' : '5'}
                          onChange={(e) => setAutoQtyNum(e.target.value)}
                          className="w-full h-10 px-2.5 rounded-lg bg-black/70 border border-white/20 text-sm font-mono-num text-white disabled:opacity-50"
                        />
                      </div>
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRepeat}
                      onChange={(e) => setAutoRepeat(e.target.checked)}
                      className="rounded border-white/30"
                    />
                    <span>Repeat automatically on future triggers (otherwise pauses after 1st execution)</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const targetGood = contraband.find((g) => g.id === autoGoodId);
                    if (!targetGood) return;
                    const parsedTarget = Math.max(1, Math.round(Number(autoPrice) || 1));
                    const qtyVal: number | 'ALL' =
                      autoSide === 'SELL' && autoQtyMode === 'ALL'
                        ? 'ALL'
                        : Math.max(1, Math.floor(Number(autoQtyNum) || 1));
                    sound.playClick();
                    onAddAutoTrade({
                      goodId: targetGood.id,
                      goodName: targetGood.name,
                      side: autoSide,
                      condition: autoCond,
                      targetPrice: parsedTarget,
                      qty: qtyVal,
                      repeat: autoRepeat,
                      enabled: true,
                    });
                  }}
                  className="w-full h-11 rounded-xl bg-[#b99142] text-black font-bold text-sm hover:brightness-110 cursor-pointer"
                >
                  Activate Auto-Trade Rule
                </button>
              </div>

              {/* Active & Paused Auto-Trade Rules */}
              <div className="p-4 rounded-xl bg-black/45 border border-white/15 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-white">
                    Syndicate Auto-Trade Desk ({autoTradeRules.length})
                  </span>
                  <span className="text-[11px] font-mono-num text-emerald-400">
                    {activeAutoRulesCount} Armed
                  </span>
                </div>

                {autoTradeRules.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 space-y-1">
                    <p>No Auto-Trade rules armed yet.</p>
                    <p>
                      Set rules like <strong>Sell All if Unmarked Gold Bullion rises above $340</strong> or click any Bid/Ask level in the Order Book.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10 max-h-[340px] overflow-y-auto mafia-scroll">
                    {autoTradeRules.map((rule) => {
                      const liveGood = contraband.find((g) => g.id === rule.goodId);
                      return (
                        <div
                          key={rule.id}
                          className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold font-mono-num ${
                                  rule.side === 'BUY' ? 'text-emerald-400' : 'text-amber-300'
                                }`}
                              >
                                AUTO {rule.side}
                              </span>
                              <span className="font-bold text-white truncate">
                                {rule.qty === 'ALL' ? 'ALL HELD' : `${rule.qty}×`} {rule.goodName}
                              </span>
                            </div>
                            <div className="font-mono-num text-slate-400">
                              Trigger: {rule.condition === 'below' ? '≤' : '≥'} ${formatCash(rule.targetPrice)}
                              {liveGood && ` (Now $${formatCash(liveGood.currentPrice)})`} ·{' '}
                              {rule.repeat ? 'Repeat' : 'One-Shot'} · Executed {rule.executedCount}×
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                onToggleAutoTrade(rule.id);
                              }}
                              className={`px-2.5 py-1.5 rounded font-bold cursor-pointer ${
                                rule.enabled
                                  ? 'bg-emerald-800/70 text-emerald-200 hover:bg-emerald-700'
                                  : 'bg-zinc-800 text-slate-300 hover:bg-zinc-700'
                              }`}
                            >
                              {rule.enabled ? 'ARMED' : 'PAUSED'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                onRemoveAutoTrade(rule.id);
                              }}
                              className="px-2.5 py-1.5 rounded bg-white/10 text-slate-300 hover:bg-red-800/70 hover:text-white cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-5">
              {/* Smart Street Signals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black/40 border border-white/15 space-y-2.5">
                  <div className="text-sm font-bold text-emerald-300">Prime Buy-In Opportunities (Below Base)</div>
                  {advisorOpportunities.buyDips.length === 0 ? (
                    <p className="text-xs text-slate-400">No commodities are deeply discounted right now. Watch the next quote cycle.</p>
                  ) : (
                    advisorOpportunities.buyDips.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/10 last:border-0">
                        <div>
                          <span className="font-bold text-white">{g.name}</span>
                          <span className="ml-2 font-mono-num text-emerald-400">
                            {(((g.currentPrice - g.basePrice) / g.basePrice) * 100).toFixed(1)}% below avg
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(g.id);
                            setActiveTab('exchange');
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-700 text-white font-bold cursor-pointer"
                        >
                          Trade
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/15 space-y-2.5">
                  <div className="text-sm font-bold text-amber-300">Ready to Take Profit (Above Cost Basis)</div>
                  {advisorOpportunities.takeProfits.length === 0 ? (
                    <p className="text-xs text-slate-400">No held cargo is currently above your buy-in target (+3%).</p>
                  ) : (
                    advisorOpportunities.takeProfits.map((g) => (
                      <div key={g.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/10 last:border-0">
                        <div>
                          <span className="font-bold text-white">{g.name} (×{g.owned})</span>
                          <span className="ml-2 font-mono-num text-emerald-400">
                            +${formatCash((g.currentPrice - g.avgBuyPrice) * g.owned)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onExecuteTrade(g.id, 'SELL', g.owned)}
                          className="px-2.5 py-1 rounded bg-[#b99142] text-black font-bold cursor-pointer"
                        >
                          Sell All
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-slate-400">Completed Sells</div>
                  <div className="text-lg font-bold font-mono-num text-white">{portfolioStats.sellCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-slate-400">Profitable Sell Rate</div>
                  <div className="text-lg font-bold font-mono-num text-emerald-400">{portfolioStats.winRate}%</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-slate-400">Total Volume</div>
                  <div className="text-lg font-bold font-mono-num text-white">${formatCash(portfolioStats.totalVolume)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-slate-400">Best Trade Profit</div>
                  <div className="text-lg font-bold font-mono-num text-amber-300">+${formatCash(portfolioStats.bestTrade)}</div>
                </div>
              </div>

              {/* Holdings Breakdown Table */}
              <div className="overflow-x-auto rounded-xl border border-white/15 bg-black/35">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-white/5 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Commodity</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Owned</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Avg Cost</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Current</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Open P&amp;L</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Realized</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 font-mono-num">
                    {contraband.map((g) => {
                      const openPnl = g.owned > 0 ? (g.currentPrice - g.avgBuyPrice) * g.owned : 0;
                      return (
                        <tr key={g.id} className="hover:bg-white/5">
                          <td className="py-2.5 px-3 font-sans font-semibold text-white">{g.name}</td>
                          <td className="py-2.5 px-3 text-right text-white">{g.owned}</td>
                          <td className="py-2.5 px-3 text-right text-sky-300">
                            {g.owned > 0 ? `$${formatCash(g.avgBuyPrice)}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-white">
                            <AnimatedPrice good={g} />
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right ${
                              openPnl > 0.01 ? 'text-emerald-400' : openPnl < -0.01 ? 'text-red-400' : 'text-slate-400'
                            }`}
                          >
                            {g.owned > 0
                              ? `${openPnl >= 0 ? '+' : '-'}$${formatCash(Math.abs(openPnl))}`
                              : '—'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right ${
                              g.realizedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {g.realizedProfit >= 0 ? '+' : '-'}${formatCash(Math.abs(g.realizedProfit))}
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            {g.owned > 0 ? (
                              <button
                                type="button"
                                onClick={() => onExecuteTrade(g.id, 'SELL', g.owned)}
                                className="px-2.5 py-1 rounded bg-[#b99142] text-black text-xs font-bold hover:brightness-110 cursor-pointer"
                              >
                                Sell All
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedId(g.id);
                                  setActiveTab('exchange');
                                }}
                                className="px-2.5 py-1 rounded bg-white/10 text-slate-200 text-xs font-semibold hover:bg-white/20 cursor-pointer"
                              >
                                Inspect
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.25fr] gap-5 items-start">
              {/* Price Alerts Panel */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/15 space-y-3">
                <div className="font-bold text-sm text-amber-200">Target Price Alerts</div>
                <p className="text-xs text-slate-400">
                  Set alerts for buy dips or profit targets. Active alerts trigger automatically on each market quote update.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={alertGoodId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setAlertGoodId(nextId);
                      const found = contraband.find((g) => g.id === nextId);
                      if (found) setAlertTarget(String(Math.round(found.currentPrice * 0.92)));
                    }}
                    className="h-10 px-2.5 rounded-lg bg-zinc-900 border border-white/20 text-xs text-white"
                  >
                    {contraband.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (${g.currentPrice})
                      </option>
                    ))}
                  </select>
                  <select
                    value={alertCond}
                    onChange={(e) => setAlertCond(e.target.value as 'below' | 'above')}
                    className="h-10 px-2.5 rounded-lg bg-zinc-900 border border-white/20 text-xs text-white"
                  >
                    <option value="below">Drops Below (Buy)</option>
                    <option value="above">Rises Above (Sell)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={alertTarget}
                    onChange={(e) => setAlertTarget(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-lg bg-black/70 border border-white/20 text-sm font-mono-num text-white"
                    placeholder="Target $"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const num = Math.max(1, Math.round(Number(alertTarget) || 0));
                      sound.playClick();
                      onAddAlert(alertGoodId, alertCond, num);
                    }}
                    className="h-10 px-4 rounded-lg bg-[#b99142] text-black font-bold text-xs hover:brightness-110 cursor-pointer whitespace-nowrap"
                  >
                    Set Alert
                  </button>
                </div>

                <div className="divide-y divide-white/10 border-t border-white/10 pt-2">
                  {priceAlerts.length === 0 ? (
                    <div className="py-4 text-xs text-slate-400 text-center">
                      No active price alerts yet.
                    </div>
                  ) : (
                    priceAlerts.map((a: PriceAlert) => (
                      <div key={a.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="font-bold text-white">{a.goodName}</div>
                          <div className="font-mono-num text-slate-400">
                            {a.condition === 'below' ? 'Drops below' : 'Rises above'} ${formatCash(a.targetPrice)} ·{' '}
                            <span className={a.triggered ? 'text-amber-300 font-bold' : 'text-emerald-400'}>
                              {a.triggered ? 'TRIGGERED' : 'WATCHING'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveAlert(a.id)}
                          className="px-2.5 py-1 rounded bg-white/10 text-slate-300 hover:bg-red-800/70 hover:text-white cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Execution Ledger */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/15 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-white">Trade Execution Ledger</span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/55 border border-white/10">
                    {(['ALL', 'BUY', 'SELL'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setLedgerFilter(f)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                          ledgerFilter === f ? 'bg-zinc-700 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredLedger.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    No trades executed yet. Head to the <strong>Exchange</strong> tab to buy low and sell high.
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto mafia-scroll divide-y divide-white/10">
                    {filteredLedger.map((entry) => (
                      <div key={entry.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold font-mono-num ${
                                entry.side === 'BUY' ? 'text-sky-300' : 'text-amber-300'
                              }`}
                            >
                              {entry.side}
                            </span>
                            <span className="font-semibold text-white">
                              {entry.qty}× {entry.goodName}
                            </span>
                          </div>
                          <div className="text-slate-400 font-mono-num mt-0.5">
                            @ ${formatCash(entry.unitPrice)} ·{' '}
                            {new Date(entry.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                        </div>

                        <div className="text-right font-mono-num">
                          <div className="font-bold text-white">
                            {entry.side === 'BUY' ? '-' : '+'}${formatCash(entry.total)}
                          </div>
                          {typeof entry.realizedDelta === 'number' && (
                            <div
                              className={
                                entry.realizedDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }
                            >
                              P&amp;L: {entry.realizedDelta >= 0 ? '+' : '-'}${formatCash(Math.abs(entry.realizedDelta))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
