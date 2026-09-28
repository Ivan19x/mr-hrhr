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
  ...["1h", "4h", "1d"].flatMap((iv) => [
    B("BTCUSDT", "BTC/USDT", iv),
    B("ETHUSDT", "ETH/USDT", iv),
    B("SOLUSDT", "SOL/USDT", iv),
    B("BNBUSDT", "BNB/USDT", iv),
    B("XRPUSDT", "XRP/USDT", iv),
    B("ADAUSDT", "ADA/USDT", iv),
    B("DOGEUSDT", "DOGE/USDT", iv),
  ]),
  B("BTCUSDT", "BTC/USDT", "15m"),
  B("ETHUSDT", "ETH/USDT", "15m"),
  ...[
    ["EURUSD=X", "eurusd", "EUR/USD"],
    ["GBPUSD=X", "gbpusd", "GBP/USD"],
    ["USDJPY=X", "usdjpy", "USD/JPY"],
    ["AUDUSD=X", "audusd", "AUD/USD"],
    ["GC=F", "gold", "Gold (XAU/USD)"],
  ].flatMap(([s, id, label]) => [Y(s, id, label, "1h", "730d"), Y(s, id, label, "1d", "10y")]),
  Y("EURUSD=X", "eurusd", "EUR/USD", "15m", "60d"),
  Y("GBPUSD=X", "gbpusd", "GBP/USD", "15m", "60d"),
  ...[
    ["^GSPC", "spx", "S&P 500"],
    ["^NDX", "ndx", "NASDAQ 100"],
    ["AAPL", "aapl", "Apple (AAPL)"],
    ["MSFT", "msft", "Microsoft (MSFT)"],
    ["NVDA", "nvda", "NVIDIA (NVDA)"],
    ["TSLA", "tsla", "Tesla (TSLA)"],
    ["AMZN", "amzn", "Amazon (AMZN)"],
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
  // [openTime, open, high, low, close, volume, ...]
  return rows.map((r) => [Math.floor(r[0] / 1000), +r[1], +r[2], +r[3], +r[4], +r[5]]);
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
console.log(`\n${index.length} datasets, ${index.reduce((s, x) => s + x.count, 0)} candles in scripts/.cache/charts/`);
