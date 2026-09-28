# MR_HRHR

A trading school as a game. Players learn to trade on **real historical market charts**: they mark what they see (candle patterns, swings, levels, fair value gaps, order blocks…), plan a trade with a stop loss and target, answer questions about their reasoning, then watch what the real market did next.

- **16 strategies, 176 levels** across 4 tiers, from candlesticks to confluence. Every level is a real chart (crypto, forex, gold, indices, stocks).
- **Academy**: 155 lessons in 25 modules (core course 1–12, advanced course 13–25: smart money, ICT time and entry models, Wyckoff, order flow, the professional trader). Every chart concept is shown on a real market chart; each lesson ends with a quiz. Plus a 316-term glossary linked to the lessons and a Resources page.
- **Analyst**: reviews every trade and recommends what to work on.
- **Modes**: Campaign, Practice, Timed Challenge, Daily Challenge, weekly Ranked Season.
- Profiles are stored locally in the browser (no server yet).

## Run locally

Requires Node.js 20+.

```sh
npm install
npm run dev        # http://localhost:5173
```

## Build

```sh
npm run build      # Node server output in .output/
```

On Vercel the build targets Vercel automatically.

## Real chart data

Chart data is downloaded once, cut into small sections, and baked into `src/data/real/`. The raw downloads are temporary.

```sh
npm run charts:update   # download → cut lesson examples → build all levels
# Lesson examples already chosen are kept; `node scripts/extract-examples.ts --all` re-picks them all.
```

## Project layout

| Path | What |
|---|---|
| `src/routes/` | Pages (TanStack Router file routes) |
| `src/components/` | Game screen, chart, tutorials, academy widgets |
| `src/engine/` | Pure game logic: scoring, marking, trades, analyst, anti-cheat transform |
| `src/data/` | Curriculum, academy lessons, level index, real chart data |
| `src/services/` | Local profile, progress, journal, leaderboards |
| `scripts/` | Chart download and level / example extraction |
