// Tutorial steps per strategy. BOS steps animate the level chart (`show` picks the
// layers); other strategies show a real chart example per step (`spec`).
import type { DiagramSpec } from "./academy/types";

export type TutorialLayer = "swings" | "bos" | "pullback" | "trade";

export type TutorialStep = {
  title: string;
  body: string;
  show: TutorialLayer[];
  revealTo: "swing" | "pullback" | "break" | "all";
  spec?: DiagramSpec;
  /** Animated formation of a real pattern (Candlesticks tutorial). */
  anim?: { id: string; label: string; tone: "up" | "down"; len: number; single?: boolean };
  /** Animate the strategy's real tutorial chart with these layers. */
  walk?: ("marks" | "trade" | "outcome")[];
};

export const TUTORIALS: Record<string, TutorialStep[]> = {
  trends: [
    {
      title: "Read the direction",
      body: "Markets move in waves. In an uptrend each peak (swing high) and each dip (swing low) is higher than the last. In a downtrend both are lower. Watch this real chart build its trend.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the swings",
      body: "Mark the last two swing highs and the last two swing lows. If both keep rising it's an uptrend (HH + HL); if both keep falling it's a downtrend (LH + LL).",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Trade with the trend",
      body: "When a new higher low forms in an uptrend, buy with the stop just under that low and target 2R. (In a downtrend: sell a new lower high.)",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "Here is how this real market played out after the entry.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  sr: [
    {
      title: "Levels the market remembers",
      body: "Support is a floor where buyers keep stepping in. Resistance is a ceiling where sellers keep appearing. They're zones where price has turned before.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the level",
      body: "Use the S/R line tool: drag across the price level that price keeps reacting to.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Trade the reaction",
      body: "Buy the bounce off support (or the retest of old resistance from above), stop just beyond the level, 2R target.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  sltp: [
    {
      title: "Every trade needs an exit plan",
      body: "Before entering, decide where you're wrong (stop loss) and where you'll take profit. The stop goes where the trade idea fails, never at a random number.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark stop and target",
      body: "Mark the swing low your stop hides behind, and draw a line at the previous high: the first natural target.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Place the orders",
      body: "Stop just below the swing low, target at least 2R. Now the trade is worth taking and the risk is known.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  rr: [
    {
      title: "Is the trade worth it?",
      body: "Risk-to-reward compares what you can lose with what you can make. At 1:2 you can lose half your trades and still grow the account.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark floor and ceiling",
      body: "Draw the range floor (where you'd buy and put the stop under) and the ceiling (your target).",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Measure it",
      body: "Entry near the floor, stop just below it, target at the ceiling: count how many times the risk fits into the reward. Only take trades where it's 2 or more.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  swings: [
    {
      title: "The skeleton of every chart",
      body: "A swing high is a peak with lower highs on both sides; a swing low is a trough with higher lows on both sides. They are the points everything else is built on.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the swings",
      body: "Tap the recent swing highs with the ▲ tool and the swing lows with ▼. Don't mark every wiggle: mark the clear turning points.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Use them",
      body: "The latest swing low near support is where buyers stepped in: buy with the stop under it.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  choch: [
    {
      title: "When a trend changes character",
      body: "An uptrend is alive while it keeps making higher lows. The moment a candle CLOSES below the last higher low, its character has changed: a CHoCH.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the break",
      body: "Mark the last higher low, then draw the break line from it to the candle that closed below.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Trade the new direction",
      body: "After a bearish CHoCH, sell with the stop above the last lower high. Target 2R.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  contrev: [
    {
      title: "Continuation or reversal?",
      body: "A break in the trend's direction (new HH in an uptrend) means continuation. A break against it (losing the last HL) warns of a reversal. Reading which one you're looking at decides your trade.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the key swing and the break",
      body: "Mark the swing that was broken and draw the break line to the breaking candle.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Trade what the break says",
      body: "Trade in the direction of the break, stop beyond the swing, 2R target.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  fvg: [
    {
      title: "Imbalance",
      body: "When price moves so fast that candle 1 and candle 3 don't overlap, the gap between them is a Fair Value Gap: only one side traded there.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the gap",
      body: "Drag an FVG box from candle 1's wick to candle 3's wick, covering the gap.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Trade the return",
      body: "Price often returns to rebalance the gap. Enter in the gap in the direction of the original move, stop beyond the move's origin.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  orderblocks: [
    {
      title: "Where big money loaded up",
      body: "The last opposite candle before an explosive move is the order block: where large orders were placed.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the order block",
      body: "Drag an order-block box over that candle's full range.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Trade the return",
      body: "When price comes back to the order block, the same side often defends it. Enter there, stop just beyond the block.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  liquidity: [
    {
      title: "Where the stops are",
      body: "Equal highs look like strong resistance, so many traders put stop orders just above them. That pool of orders is liquidity.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the pool and the sweep",
      body: "Draw a line across the equal highs, then mark the candle that wicked above them and closed back below: the sweep.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Trade the sweep",
      body: "After the stops are taken, price often reverses. Sell with the stop above the sweep wick.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  premiumdiscount: [
    {
      title: "Cheap or expensive?",
      body: "Measure the last swing from low to high. The top half is premium (expensive), the bottom half is discount (cheap). Buy in discount, sell in premium.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the swing",
      body: "Mark the swing low and the swing high that define the range.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Buy the discount",
      body: "When the pullback dips below 50% and holds, buy with the stop under the pullback low.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  mtf: [
    {
      title: "Top-down",
      body: "Pros read direction on the higher timeframe and time the entry on a lower one. The lower timeframe must agree with the bigger picture.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the trigger",
      body: "Mark the swing that gets broken and draw the break line: that's the entry trigger in the higher-timeframe direction.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Enter with a tight stop",
      body: "The lower timeframe gives a tight stop, so the same target becomes a bigger reward.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  sessions: [
    {
      title: "The London breakout",
      body: "Overnight, the quiet Asian session usually builds a tight range. When London opens, volume floods in and price often breaks out of it.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark the Asian range",
      body: "Draw a line at the Asian session high and another at its low.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "Trade the break",
      body: "Trade the direction London breaks the range, stop back inside it, 2R target.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real session played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  confluence: [
    {
      title: "Stack the reasons",
      body: "One reason to trade is a guess. Several independent reasons in the same zone is a plan: that's confluence.",
      show: [],
      revealTo: "all",
      walk: [],
    },
    {
      title: "Mark every reason",
      body: "Mark the order block AND the fair value gap: here they overlap in one zone.",
      show: [],
      revealTo: "all",
      walk: ["marks"],
    },
    {
      title: "One zone, one stop",
      body: "Enter where the reasons overlap, stop beyond the whole zone, 2R target.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade"],
    },
    {
      title: "What really happened",
      body: "How this real chart played out.",
      show: [],
      revealTo: "all",
      walk: ["marks", "trade", "outcome"],
    },
  ],
  candles: [
    {
      title: "Every candle is a fight",
      body: "Watch one real candle form. It opens, sellers push price down (that becomes the lower wick), buyers fight back, and it closes. Where it closes decides who won the period: close above the open = green, buyers won; close below = red, sellers won.",
      show: [],
      revealTo: "all",
      anim: { id: "engulfing-bull", label: "buyers won the period", tone: "up", len: 1, single: true },
    },
    {
      title: "Wicks are rejected prices",
      body: "A long lower wick means sellers pushed price down but buyers threw it back up. After a fall, that shape is a hammer: a warning the drop may be over.",
      show: [],
      revealTo: "all",
      anim: { id: "hammer", label: "Hammer", tone: "up", len: 1 },
    },
    {
      title: "Two-candle signals",
      body: "When a green body completely covers the previous red body, buyers erased the whole last period. That's a bullish engulfing, one of the strongest candle signals at a low.",
      show: [],
      revealTo: "all",
      anim: { id: "engulfing-bull", label: "Bullish engulfing", tone: "up", len: 2 },
    },
    {
      title: "How these levels work",
      body: "The chart replays until a pattern completes, then pauses. Select the ◆ Pattern tool and tap the candle that completes it. Then trade in the pattern's direction: stop beyond the pattern's wick, target 2R. Answer the questions, and watch what the real market did next.",
      show: [],
      revealTo: "all",
      anim: { id: "shooting-star", label: "Shooting star", tone: "down", len: 1 },
    },
  ],
  bos: [
    {
      title: "Markets move in swings",
      body: "Price never moves in a straight line. A swing high is a peak with lower highs on both sides. A swing low is a trough with higher lows on both sides. Together they draw the skeleton of the trend.",
      show: ["swings"],
      revealTo: "pullback",
    },
    {
      title: "The Break of Structure",
      body: "In an uptrend, when a candle closes above the last swing high, that's a Break of Structure (BOS). It proves the trend is alive and buyers are still in control.",
      show: ["swings", "bos"],
      revealTo: "break",
    },
    {
      title: "Mark what you see",
      body: "In the game you'll mark the swing high that broke, drag a BOS line from that swing to the breaking candle, and mark the pullback low. Correct marks earn +30. Wrong marks cost −20.",
      show: ["swings", "bos", "pullback"],
      revealTo: "break",
    },
    {
      title: "Trade it with a plan",
      body: "Enter in the direction of the break. Put your stop loss just beyond the pullback low, and aim for at least 2R (twice what you risk). Then answer the questions honestly: good reasoning pays even when a trade loses.",
      show: ["swings", "bos", "pullback", "trade"],
      revealTo: "all",
    },
  ],
};
