// Writes a small summary of every Academy lesson (title, module, size, quiz) to
// scripts/.cache/lessons.json for scripts/build-lesson-games.ts. Loads the lesson
// TypeScript through Vite so path aliases and JSON imports resolve.
//   node scripts/dump-lessons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
});
try {
  const A = await server.ssrLoadModule("/src/data/academy/index.ts");
  const lessons = A.MODULES.flatMap((m) =>
    m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      module: m.n,
      moduleTitle: m.title,
      blocks: l.blocks.length,
      terms: l.terms ?? [],
      quiz: l.quiz,
    })),
  );
  await mkdir(new URL("./.cache/", import.meta.url), { recursive: true });
  await writeFile(new URL("./.cache/lessons.json", import.meta.url), JSON.stringify(lessons));
  console.log(`${lessons.length} lessons written to scripts/.cache/lessons.json`);
} finally {
  await server.close();
}
