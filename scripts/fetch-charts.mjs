// Downloads real historical OHLCV data into a TEMPORARY cache used only by the
// extraction scripts. The game never loads these files: it ships only the small
// pre-cut sections (src/data/real/*.json). Delete scripts/.cache afterwards.
//   node scripts/fetch-charts.mjs
// Sources (free, no API key): Binance public klines, Yahoo Finance chart API.
import { mkdir, writeFile } from "node:fs/promises";

const OUT = new URL("./.cache/charts/", import.meta.url);

const B = (symbol, label, interval, pages = 3) => ({ id: `${symbol.toLowerCase()}-${interval}`, label, tf: interval === "1d" ? "1D" : interval, src: "binance", symbol, interval, pages });
const Y = (symbol, id, label, interval, range) => ({ id: `${id}-${interval}`, label, tf: interval === "1d" ? "1D" : interval, src: "yahoo", symbol, interval, range });

const DATASETS = [
  ...["1h", "4h", "1d"].flatMap((iv) => {
    const pages = iv === "1d" ? 3 : 8; // intraday: 8000 candles of history
    return [
      B("BTCUSDT", "BTC/USDT", iv, pages),
      B("ETHUSDT", "ETH/USDT", iv, pages),
      B("SOLUSDT", "SOL/USDT", iv, pages),
      B("BNBUSDT", "BNB/USDT", iv, pages),
      B("XRPUSDT", "XRP/USDT", iv, pages),
      B("ADAUSDT", "ADA/USDT", iv, pages),
      B("DOGEUSDT", "DOGE/USDT", iv, pages),
    ];
  }),
  B("BTCUSDT", "BTC/USDT", "15m", 8),
  B("ETHUSDT", "ETH/USDT", "15m", 8),
  ...[
    ["EURUSD=X", "eurusd", "EUR/USD"],
    ["GBPUSD=X", "gbpusd", "GBP/USD"],
    ["USDJPY=X", "usdjpy", "USD/JPY"],
    ["AUDUSD=X", "audusd", "AUD/USD"],
    ["GC=F", "gold", "Gold (XAU/USD)"],
  ].flatMap(([s, id, label]) => [Y(s, id, label, "1h", "730d"), Y(s, id, label, "1d", "10y")]),
  Y("EURUSD=X", "eurusd", "EUR/USD", "15m", "60d"),
  Y("GBPUSD=X", "gbpusd", "GBP/USD", "15m", "60d"),
  Y("^GSPC", "spx", "S&P 500", "15m", "60d"),
  Y("^NDX", "ndx", "NASDAQ 100", "15m", "60d"),
  Y("^GSPC", "spx", "S&P 500", "1h", "730d"),
  Y("^NDX", "ndx", "NASDAQ 100", "1h", "730d"),
  ...[
    ["^GSPC", "spx", "S&P 500"],
    ["^NDX", "ndx", "NASDAQ 100"],
    ["AAPL", "aapl", "Apple (AAPL)"],
    ["MSFT", "msft", "Microsoft (MSFT)"],
    ["NVDA", "nvda", "NVIDIA (NVDA)"],
    ["TSLA", "tsla", "Tesla (TSLA)"],
    ["AMZN", "amzn", "Amazon (AMZN)"],
    ["DX-Y.NYB", "dxy", "US Dollar Index (DXY)"],
    ["^TNX", "us10y", "US 10-year yield"],
    ["^VIX", "vix", "VIX (volatility index)"],
  ].map(([s, id, label]) => Y(s, id, label, "1d", "10y")),
];

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (MR_HRHR chart fetcher)" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function binance(d) {
  let end = Date.now();
  let rows = [];
  for (let p = 0; p < d.pages; p++) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${d.symbol}&interval=${d.interval}&limit=1000&endTime=${end}`;
    const page = await getJson(url);
    if (!page.length) break;
    rows = page.concat(rows);
    end = page[0][0] - 1;
  }
  // [openTime, open, high, low, close, volume, closeTime, quoteVol, trades, takerBuyBase, ...]
  // Kept: time, OHLC, volume, and taker (aggressive) buy volume for delta.
  return rows.map((r) => [Math.floor(r[0] / 1000), +r[1], +r[2], +r[3], +r[4], +r[5], +r[9]]);
}

async function yahoo(d) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(d.symbol)}?interval=${d.interval}&range=${d.range}`;
  const json = await getJson(url);
  const r = json.chart.result[0];
  const q = r.indicators.quote[0];
  const out = [];
  r.timestamp.forEach((t, k) => {
    const o = q.open[k], h = q.high[k], l = q.low[k], c = q.close[k], v = q.volume?.[k] ?? 0;
    if ([o, h, l, c].some((x) => x == null || !Number.isFinite(x))) return;
    if (h === l) return; // flat placeholder bars
    out.push([t, o, Math.max(h, o, c), Math.min(l, o, c), c, v ?? 0]);
  });
  return out;
}

await mkdir(OUT, { recursive: true });
const index = [];
for (const d of DATASETS) {
  try {
    const rows = d.src === "binance" ? await binance(d) : await yahoo(d);
    await writeFile(new URL(`${d.id}.json`, OUT), JSON.stringify({ id: d.id, label: d.label, tf: d.tf, source: d.src, candles: rows }));
    index.push({ id: d.id, label: d.label, tf: d.tf, source: d.src, count: rows.length });
    console.log(`✓ ${d.id.padEnd(14)} ${String(rows.length).padStart(5)} candles`);
  } catch (e) {
    console.log(`✗ ${d.id}: ${e.message}`);
  }
}
await writeFile(new URL("index.json", OUT), JSON.stringify(index, null, 1));

// Extras: BTC perpetual funding history (Binance) and euro futures positioning (CFTC COT).
try {
  let funding = [];
  let end = Date.now();
  for (let p = 0; p < 3; p++) {
    const page = await getJson(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1000&endTime=${end}`);
    if (!page.length) break;
    funding = page.concat(funding);
    end = page[0].fundingTime - 1;
  }
  const cotUrl = new URL("https://publicreporting.cftc.gov/resource/6dca-aqww.json");
  cotUrl.searchParams.set("$where", "market_and_exchange_names='EURO FX - CHICAGO MERCANTILE EXCHANGE'");
  cotUrl.searchParams.set("$order", "report_date_as_yyyy_mm_dd DESC");
  cotUrl.searchParams.set("$limit", "260");
  cotUrl.searchParams.set("$select", "report_date_as_yyyy_mm_dd,noncomm_positions_long_all,noncomm_positions_short_all,comm_positions_long_all,comm_positions_short_all");
  const cot = await getJson(cotUrl.toString());
  const depth = await getJson("https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=15");
  await writeFile(new URL("extras.json", OUT), JSON.stringify({
    funding: funding.map((f) => [Math.floor(f.fundingTime / 1000), +f.fundingRate, +f.markPrice]),
    depth: { t: Math.floor(Date.now() / 1000), bids: depth.bids.map((r) => [+r[0], +r[1]]), asks: depth.asks.map((r) => [+r[0], +r[1]]) },
    cot: cot.reverse().map((r) => [r.report_date_as_yyyy_mm_dd.slice(0, 10), +r.noncomm_positions_long_all, +r.noncomm_positions_short_all, +r.comm_positions_long_all, +r.comm_positions_short_all]),
  }));
  console.log(`✓ extras: ${funding.length} funding rates, ${cot.length} COT weeks`);
} catch (e) {
  console.log(`✗ extras: ${e.message}`);
}
console.log(`\n${index.length} datasets, ${index.reduce((s, x) => s + x.count, 0)} candles in scripts/.cache/charts/`);
