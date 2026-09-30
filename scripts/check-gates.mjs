// Checks the "learn before you play" rules with simulated players.
//   node scripts/check-gates.mjs
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const server = await createServer({
  root: fileURLToPath(new URL("..", import.meta.url)),
  configFile: false,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
});
let failed = 0;
const check = (name, ok, extra = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? `  (${extra})` : ""}`);
};
try {
  const G = await server.ssrLoadModule("/src/lib/lessonProgress.ts");
  const P = await server.ssrLoadModule("/src/lib/progression.ts");
  const L = await server.ssrLoadModule("/src/data/levels.ts");
  const A = await server.ssrLoadModule("/src/data/academy/index.ts");
  const PS = await server.ssrLoadModule("/src/services/progressService.ts");
  const fresh = () => structuredClone(PS.DEFAULT_PROFILE);
  const star = (p, id) => (p.results[id] = { levelId: id, stars: 3, score: 900, r: 2, won: true, completedAt: 1 });
  const finishLesson = (p, id) => {
    p.academy[id] = { best: 1, completedAt: 1 };
    for (const g of G.lessonGames(id)) star(p, g.id);
  };
  const candles = P.levelsFor("candles");
  const at = (p, list, id) => G.levelOpen(p, list, list.findIndex((l) => l.id === id));

  // The small lesson list matches the real lessons.
  check("lessonList.json matches the Academy", A.ALL_LESSONS.map((x) => x.lesson.id).join() === G.LESSONS.map((l) => l.id).join());

  // New player.
  let p = fresh();
  check("new player: Candlesticks tutorial level is open", at(p, candles, "t1-candles-tutorial"));
  star(p, "t1-candles-tutorial");
  check("new player: Easy 1 locked until its lessons are done", !at(p, candles, "t1-candles-easy-1"), G.levelLessonGate(p, candles[1])?.title);
  check("first candle lesson is open (strategy unlocked)", G.lessonUnlocked(p, "candle-ohlc"));
  check("second candle lesson waits for the first", !G.lessonUnlocked(p, "buyers-sellers"));
  check("a Tier 2 lesson is still locked", !G.lessonUnlocked(p, "bos-choch"));
  // Easy 1 is a hammer level: needs the candle lessons up to "Hammer & hanging man".
  const own = G.lessonsForStrategy("candles").map((l) => l.id);
  for (const id of own.slice(0, own.indexOf("hammer-hanging-man"))) finishLesson(p, id);
  check("one lesson short: still locked", !at(p, candles, "t1-candles-easy-1"), G.levelLessonGate(p, candles[1])?.id);
  finishLesson(p, "hammer-hanging-man");
  check("after the hammer lesson: Easy 1 opens", at(p, candles, "t1-candles-easy-1"));
  star(p, "t1-candles-easy-1");
  check("Easy 2 (engulfing) needs the engulfing lesson", !at(p, candles, "t1-candles-easy-2"), G.levelLessonGate(p, candles[2])?.title);
  check("Continue points to the lesson first", !!G.levelLessonGate(p, P.continueLevel(p)), G.levelLessonGate(p, P.continueLevel(p))?.title);

  // Player who played levels before lessons were required keeps them.
  p = fresh();
  for (const id of ["t1-candles-tutorial", "t1-candles-easy-1", "t1-candles-easy-2", "t1-candles-easy-3", "t1-candles-medium-1"]) star(p, id);
  check("old progress: played levels stay open", at(p, candles, "t1-candles-easy-3") && at(p, candles, "t1-candles-medium-1"));
  check("old progress: new levels still need their lessons", !at(p, candles, "t1-candles-easy-4"), G.levelLessonGate(p, candles.find((l) => l.id === "t1-candles-easy-4"))?.title);

  // Another strategy: core lessons before easy, advanced ones spread over medium/hard.
  p = fresh();
  p.xp = 1e6;
  const bos = P.levelsFor("bos");
  for (const s of ["candles", "trends", "sr", "sltp", "rr", "swings"]) star(p, P.levelsFor(s).at(-1).id);
  check("BOS: unlocked strategy, easy locked without lessons", P.strategyUnlocked(p, "bos") && !at(p, bos, "t2-bos-easy-1") && at(p, bos, "t2-bos-tutorial"));
  star(p, "t2-bos-tutorial");
  check("BOS: tutorial played, easy still waits for the lessons", !at(p, bos, "t2-bos-easy-1"), G.levelLessonGate(p, bos[1])?.title);
  for (const l of G.lessonsForStrategy("bos")) finishLesson(p, l.id);
  check("BOS: easy opens after its lessons", at(p, bos, "t2-bos-easy-1"));

  // Every strategy level maps to a real lesson.
  let unmapped = [];
  for (const m of L.LEVEL_INDEX) {
    const id = G.levelLesson(m);
    if (m.difficulty !== "tutorial" && G.lessonsForStrategy(m.strategyId).length && !G.lessonRef(id)) unmapped.push(m.id);
  }
  check("every non-tutorial level maps to an existing lesson", unmapped.length === 0, unmapped.slice(0, 5).join());
  const noLessons = [...new Set(L.LEVEL_INDEX.map((m) => m.strategyId))].filter((s) => !G.lessonsForStrategy(s).length);
  check("every strategy has lessons", noLessons.length === 0, noLessons.join());
} finally {
  await server.close();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
