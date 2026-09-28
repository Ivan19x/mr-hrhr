// Turns the syllabus (../TRADING_CURRICULUM.md) into glossary data for the game,
// so every term in the trading school has an entry.
//   node scripts/build-glossary.mjs
import { readFile, writeFile } from "node:fs/promises";

const md = await readFile(new URL("../../TRADING_CURRICULUM.md", import.meta.url), "utf8");
const terms = [];
let stage = 0;
let stageName = "";
for (const line of md.split(/\r?\n/)) {
  const h = /^## Stage (\d+) · (.+)$/.exec(line);
  if (h) {
    stage = Number(h[1]);
    stageName = h[2].trim();
    continue;
  }
  if (!stage || !line.startsWith("|") || line.includes("---") || line.startsWith("| Term")) continue;
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  if (cells.length < 4) continue;
  const [term, meaning, chart, status] = cells;
  terms.push({
    term: term.replace(/\s*🆕\s*/g, "").trim(),
    def: meaning,
    stage,
    stageName,
    chart: chart.includes("📈") ? "chart" : chart.includes("📰") ? "news" : "concept",
    built: status.includes("✅"),
  });
}
await writeFile(new URL("../src/data/academy/curriculumTerms.json", import.meta.url), JSON.stringify(terms));
console.log(`${terms.length} syllabus terms across ${new Set(terms.map((t) => t.stage)).size} stages.`);
