import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookMarked, CalendarClock, Database, ExternalLink, GraduationCap, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/resources")({
  head: () => ({ meta: [{ title: "Resources — MR_HRHR Academy" }] }),
  component: ResourcesPage,
});

type Res = { name: string; url?: string; what: string };
type Group = { title: string; icon: LucideIcon; intro: string; items: Res[] };

const GROUPS: Group[] = [
  {
    title: "Free courses and references",
    icon: GraduationCap,
    intro: "Good places to read a second explanation of anything in the Academy.",
    items: [
      { name: "Babypips School of Pipsology", url: "https://www.babypips.com/learn/forex", what: "The classic free forex course, from pips to trading plans." },
      { name: "StockCharts ChartSchool", url: "https://chartschool.stockcharts.com", what: "Detailed articles on every indicator and chart pattern, with formulas." },
      { name: "Investopedia", url: "https://www.investopedia.com", what: "Definitions of almost any finance term; good for fundamentals and derivatives." },
      { name: "CME Group Education", url: "https://www.cmegroup.com/education.html", what: "Free courses on futures, options, contango, rollover and open interest." },
      { name: "Binance Academy", url: "https://academy.binance.com", what: "Crypto basics, perpetual futures, funding rates and liquidations." },
      { name: "Thomas Bulkowski's pattern site", url: "https://thepatternsite.com", what: "Statistics on how often chart and candle patterns actually work." },
      { name: "Investor.gov (SEC)", url: "https://www.investor.gov", what: "Plain-language investor education and fraud warnings from the US regulator." },
    ],
  },
  {
    title: "Smart money, Wyckoff and order flow",
    icon: BookMarked,
    intro: "Primary sources for the advanced modules. Treat every method as something to test, not a promise.",
    items: [
      { name: "The Inner Circle Trader (YouTube)", url: "https://www.youtube.com/@InnerCircleTrader", what: "Michael Huddleston's own videos: the 2022 mentorship, killzones, PD arrays, silver bullet." },
      { name: "Wyckoff Analytics", url: "https://www.wyckoffanalytics.com", what: "Articles and courses on the Wyckoff method, schematics and events." },
      { name: "TradingView", url: "https://www.tradingview.com", what: "Charts with volume profile, anchored VWAP, Ichimoku and community scripts for ICT concepts." },
    ],
  },
  {
    title: "Economic calendars and central banks",
    icon: CalendarClock,
    intro: "Check these every morning before trading.",
    items: [
      { name: "Forex Factory calendar", url: "https://www.forexfactory.com/calendar", what: "Every release with impact rating, forecast and actual." },
      { name: "Investing.com economic calendar", url: "https://www.investing.com/economic-calendar/", what: "A second calendar with filters by country and impact." },
      { name: "Federal Reserve FOMC calendar", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", what: "Official dates of the eight Fed rate decisions each year." },
      { name: "US BLS release schedule", url: "https://www.bls.gov/schedule/news_release/", what: "Official dates for NFP (Employment Situation), CPI and PPI." },
      { name: "ECB meeting calendar", url: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html", what: "European Central Bank monetary policy meetings." },
      { name: "CME FedWatch", url: "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html", what: "Market-implied probabilities of the next Fed decision." },
    ],
  },
  {
    title: "Market data",
    icon: Database,
    intro: "Where the real charts in this game come from, and where to find more.",
    items: [
      { name: "CFTC Commitments of Traders", url: "https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm", what: "Weekly futures positioning (used for the COT lesson)." },
      { name: "FRED (St. Louis Fed)", url: "https://fred.stlouisfed.org", what: "Free economic data: yields, the yield curve, inflation, employment." },
      { name: "Binance public market data", what: "Crypto candles, taker volume, funding rates and order book (used for the crypto charts, delta and DOM lessons)." },
      { name: "Yahoo Finance", what: "Forex, index, stock, dollar index, yield and VIX history (used for the other charts)." },
    ],
  },
  {
    title: "Check your broker",
    icon: ShieldCheck,
    intro: "Before depositing anywhere, confirm the broker is licensed where you live.",
    items: [
      { name: "UK FCA register", url: "https://register.fca.org.uk", what: "Look up any UK-authorised firm and its permissions." },
      { name: "US NFA BASIC", url: "https://www.nfa.futures.org/basicnet/", what: "Registration and disciplinary history of US futures and forex firms." },
      { name: "Your local regulator", what: "ASIC (Australia), CySEC (Cyprus/EU), FSCA (South Africa), CMA (Kenya) and others all publish registers." },
    ],
  },
];

const BOOKS: [string, string, string][] = [
  ["Technical Analysis of the Financial Markets", "John J. Murphy", "The standard reference for classic technical analysis."],
  ["Japanese Candlestick Charting Techniques", "Steve Nison", "The book that brought candlesticks to the West."],
  ["Encyclopedia of Chart Patterns", "Thomas Bulkowski", "Measured success rates for dozens of patterns."],
  ["Trading in the Zone", "Mark Douglas", "Trading psychology: probabilities, consistency, discipline."],
  ["Market Wizards", "Jack D. Schwager", "Interviews with top traders on method and risk."],
  ["Street Smarts", "Linda Bradford Raschke & Laurence Connors", "Short-term setups, including Turtle Soup."],
  ["Trade Your Way to Financial Freedom", "Van K. Tharp", "Expectancy, R-multiples and position sizing."],
  ["Mind Over Markets", "James Dalton", "Market profile, value areas and auction theory."],
  ["Elliott Wave Principle", "A.J. Frost & Robert Prechter", "The classic Elliott Wave text."],
  ["Harmonic Trading, Volume One", "Scott M. Carney", "Harmonic pattern ratios and rules."],
  ["The Wyckoff Methodology in Depth", "Rubén Villahermosa", "A modern, detailed guide to Wyckoff schematics."],
  ["Reminiscences of a Stock Operator", "Edwin Lefèvre", "A century-old story that still describes every market cycle."],
];

function ResourcesPage() {
  return (
    <AppShell>
      <Link to="/academy" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Academy
      </Link>
      <h1 className="mt-3 text-3xl font-black">Resources</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        The courses, calendars, data sources and books behind this Academy. Everything linked here is free to read; the books are worth buying once you've finished the course.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g.title} className="panel p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <g.icon className="h-5 w-5 text-electric" /> {g.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{g.intro}</p>
            <ul className="mt-3 space-y-2">
              {g.items.map((r) => (
                <li key={r.name} className="rounded-md border border-border p-3">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-semibold text-electric hover:underline">
                      {r.name} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <p className="font-semibold">{r.name}</p>
                  )}
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.what}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="panel mt-4 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <BookMarked className="h-5 w-5 text-gold" /> Recommended books
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {BOOKS.map(([title, author, why]) => (
            <div key={title} className="rounded-md border border-border p-3">
              <p className="font-semibold">{title}</p>
              <p className="text-xs text-gold">{author}</p>
              <p className="mt-1 text-sm text-muted-foreground">{why}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        MR_HRHR is education, not financial advice. External sites are independent of this game; check any broker or service yourself before using it.
      </p>
    </AppShell>
  );
}
