import type { Module, Note } from "./types";
import { real, swings } from "./real";

// Trailing stop on a real uptrend: after each higher low, the stop moves up under it.
const tr = real("trend-up");
const lows = swings(tr).filter((s) => s.kind === "L");
const trailNotes: Note[] = lows.map((s, k) => {
  const next = lows[k + 1]?.i ?? tr.candles.length - 1;
  const pad = (tr.hi(s.name) - tr.lo(s.name)) * 0.3;
  return { k: "hline", p: tr.lo(s.name) - pad, text: `stop ${k + 1}`, color: "down", dash: true, i1: s.i, i2: next };
});

export const M12_TECHNIQUES: Module = {
  id: "techniques",
  n: 12,
  title: "Pro Techniques",
  tagline: "Risk, sizing, trade management, psychology and the routines that keep traders alive.",
  icon: "🛡️",
  lessons: [
    {
      id: "risk-per-trade",
      title: "Risk per trade and position sizing",
      summary: "Decide the loss first, then size the trade. The #1 survival skill.",
      minutes: 6,
      blocks: [
        {
          t: "p",
          text: "Professionals never ask 'how much can I make?' first. They ask **'how much am I willing to lose if I'm wrong?'** Most risk **0.5–2% of the account per trade**. At 1% you can be wrong 10 times in a row and still have 90% of your account.",
        },
        {
          t: "table",
          head: ["Losing streak", "Risking 1%", "Risking 5%", "Risking 10%"],
          rows: [
            ["5 losses", "−4.9%", "−22.6%", "−41.0%"],
            ["10 losses", "−9.6%", "−40.1%", "−65.1%"],
            ["20 losses", "−18.2%", "−64.2%", "−87.8%"],
          ],
        },
        { t: "h", text: "The position-size formula" },
        { t: "callout", tone: "key", text: "**Position size = (Account × Risk %) ÷ (Stop distance × Value per point)**. Your stop comes from the chart (invalidation); the size is what changes." },
        { t: "widget", name: "positionSizer" },
      ],
      quiz: [
        { q: "What do you decide first?", options: ["Profit target", "How much you'll lose if wrong", "Leverage", "The lot size"], answer: 1, why: "Risk first, size second." },
        { q: "$5,000 account, 1% risk. Max loss?", options: ["$5", "$50", "$500", "$1"], answer: 1, why: "1% of 5,000 = 50." },
        { q: "If your stop must be wider, you should…", options: ["Keep the same size", "Reduce position size", "Remove the stop", "Increase risk %"], answer: 1, why: "Wider stop, smaller size, same money at risk." },
      ],
    },
    {
      id: "rr-expectancy",
      title: "Risk-to-reward and expectancy",
      summary: "Why a 40% win rate can make money, and a 70% win rate can lose it.",
      minutes: 6,
      blocks: [
        {
          t: "p",
          text: "**R** = the amount you risk. A trade that makes twice the risk is +2R. **Expectancy** is the average R you make per trade over many trades:",
        },
        { t: "callout", tone: "key", text: "**Expectancy = (Win% × Avg win R) − (Loss% × Avg loss R)**. Positive expectancy + consistent risk = long-term profit." },
        {
          t: "table",
          head: ["Win rate", "Avg win", "Avg loss", "Expectancy", "Verdict"],
          rows: [
            ["40%", "2.5R", "1R", "+0.40R", "Profitable ✅"],
            ["50%", "1R", "1R", "0R", "Breakeven (minus costs) ⚠️"],
            ["70%", "0.4R", "1R", "−0.02R", "Losing ❌"],
            ["35%", "3R", "1R", "+0.40R", "Profitable ✅"],
          ],
        },
        { t: "widget", name: "expectancy" },
        { t: "callout", tone: "tip", text: "That's why MR_HRHR scores in R, not dollars: it rewards good trade structure, not bet size." },
      ],
      quiz: [
        { q: "You risk $100 and make $250. That's…", options: ["+0.25R", "+2.5R", "+250R", "+1R"], answer: 1, why: "250 ÷ 100 = 2.5R." },
        { q: "40% win rate, avg win 2.5R, avg loss 1R. Expectancy?", options: ["−0.4R", "+0.4R", "0R", "+1R"], answer: 1, why: "0.4×2.5 − 0.6×1 = 0.4." },
        { q: "A high win rate alone guarantees profit?", options: ["Yes", "No, the size of wins vs losses matters", "Only in forex", "Only on demo"], answer: 1, why: "Small wins + big losses can still lose." },
      ],
    },
    {
      id: "trade-management",
      title: "Managing a live trade",
      summary: "Break-even, partial profits and trailing stops.",
      minutes: 5,
      blocks: [
        {
          t: "diagram",
          caption: "A trailing stop on a real uptrend: after each new higher low forms, move the stop just below it. The trend pays you until it ends.",
          spec: { candles: tr.candles, source: tr.source, notes: trailNotes },
        },
        {
          t: "table",
          head: ["Technique", "How", "Trade-off"],
          rows: [
            ["Break-even", "Move the stop to entry after +1R", "Protects capital, but normal pullbacks can knock you out"],
            ["Partial profit", "Close 30–50% at +1R or the first target", "Locks gains; reduces the big-winner payoff"],
            ["Trailing stop", "Move the stop behind each new swing", "Rides trends; gives some profit back at the end"],
            ["Time stop", "Exit if the trade does nothing for X candles", "Frees capital; may exit early"],
          ],
        },
        { t: "callout", tone: "warn", text: "Never move a stop further away to 'give it room'. That turns a planned 1R loss into an unplanned disaster." },
      ],
      quiz: [
        { q: "A trailing stop in an uptrend moves…", options: ["Down", "Up behind new higher lows", "Randomly", "Never"], answer: 1, why: "It follows the trend's structure." },
        { q: "Moving your stop further away when losing is…", options: ["Smart", "A classic account-killer", "Required", "Break-even"], answer: 1, why: "It increases the planned loss." },
        { q: "Break-even means…", options: ["Stop moved to the entry price", "Taking all profit", "Doubling size", "Closing half"], answer: 0, why: "The worst case becomes zero." },
      ],
    },
    {
      id: "trading-plan",
      title: "Your trading plan and journal",
      summary: "Written rules and honest records: how amateurs become professionals.",
      minutes: 5,
      blocks: [
        { t: "h", text: "A plan answers these questions in writing" },
        {
          t: "list",
          ordered: true,
          items: [
            "Which markets and timeframes do I trade?",
            "Which setup(s) exactly? (Entry trigger, stop, target.)",
            "How much do I risk per trade and per day? (e.g. 1% per trade, stop after −3% in a day.)",
            "When do I trade (sessions) and when do I NOT (news, tired, emotional)?",
            "How do I manage open trades?",
            "When do I review my results?",
          ],
        },
        { t: "h", text: "The journal" },
        {
          t: "p",
          text: "Record every trade: setup, screenshot, entry/stop/target, R result, emotions, mistakes. After 30–50 trades patterns appear: which setup works, which session loses, which mistake repeats.",
        },
        { t: "callout", tone: "tip", text: "MR_HRHR's **Analyst** does this for you automatically: every trade is logged and reviewed for your best setups, weak spots and recommendations." },
      ],
      quiz: [
        { q: "A trading plan should be…", options: ["In your head", "Written down", "Changed every trade", "Secret from yourself"], answer: 1, why: "Written rules can't be bent in the moment." },
        { q: "A daily loss limit is used to…", options: ["Trade more", "Stop revenge trading and protect capital", "Increase leverage", "Please the broker"], answer: 1, why: "It caps bad days." },
        { q: "How many trades before judging a strategy?", options: ["1", "30–50+", "5", "Never judge"], answer: 1, why: "Small samples are mostly luck." },
      ],
    },
    {
      id: "psychology",
      title: "Trading psychology",
      summary: "FOMO, revenge trading, overconfidence, and how to beat your own brain.",
      minutes: 5,
      blocks: [
        {
          t: "table",
          head: ["Trap", "What it looks like", "The fix"],
          rows: [
            ["FOMO", "Chasing a candle that already ran because you 'can't miss it'", "No setup, no trade. There's always another one."],
            ["Revenge trading", "Doubling size right after a loss to 'win it back'", "Daily loss limit; walk away after 2 losses"],
            ["Overconfidence", "Raising risk after a winning streak", "Fixed % risk regardless of streaks"],
            ["Loss aversion", "Closing winners early and letting losers run", "Set SL/TP before entry and leave them alone"],
            ["Confirmation bias", "Only seeing signals that agree with you", "Write the invalidation first"],
          ],
        },
        { t: "callout", tone: "key", text: "Your job isn't to be right. Your job is to follow your plan. A losing trade that followed the plan is a good trade; a winning trade that broke the rules is a bad one." },
      ],
      quiz: [
        { q: "Doubling size after a loss is…", options: ["Smart recovery", "Revenge trading", "Position sizing", "Hedging"], answer: 1, why: "Emotional, not planned." },
        { q: "A losing trade that followed your plan is…", options: ["A mistake", "A good trade", "A reason to quit", "Impossible"], answer: 1, why: "Process over outcome." },
        { q: "Best defence against FOMO?", options: ["Trade every move", "Only take trades that match your setup", "Use more indicators", "Increase leverage"], answer: 1, why: "Rules remove the urge." },
      ],
    },
    {
      id: "backtesting",
      title: "Backtesting and demo practice",
      summary: "Prove a strategy on history before risking real money.",
      minutes: 4,
      blocks: [
        {
          t: "flow",
          steps: [
            { title: "1. Define the rules", text: "Exact entry, stop, target. If two people can't apply them the same way, they're not rules yet." },
            { title: "2. Replay history", text: "Scroll back, hide the future, step forward candle by candle, just like MR_HRHR's replay." },
            { title: "3. Log every setup", text: "Take every valid signal, not just the ones that 'look good'." },
            { title: "4. Measure", text: "Win rate, average R, expectancy, max losing streak, max drawdown." },
            { title: "5. Forward-test on demo", text: "30–50 live-market trades on demo with the same rules." },
            { title: "6. Go small live", text: "Minimum size first; scale up only if results hold." },
          ],
        },
        { t: "callout", tone: "tip", text: "Practice Replay mode is a backtesting trainer: random historical charts, the future hidden, your result in R." },
      ],
      quiz: [
        { q: "When backtesting you should…", options: ["Only log the good-looking trades", "Log every valid signal", "Peek at the future", "Skip stops"], answer: 1, why: "Cherry-picking fakes the results." },
        { q: "Which metric shows your worst run?", options: ["Win rate", "Max drawdown / losing streak", "Average win", "Spread"], answer: 1, why: "It tells you what you must survive." },
        { q: "After backtesting, next step?", options: ["Go all-in live", "Forward-test on demo", "Quit", "Add 10 indicators"], answer: 1, why: "Test in live conditions without real money." },
      ],
    },
  ],
};
