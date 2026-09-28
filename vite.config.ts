// MR_HRHR build: TanStack Start (React SSR) + Tailwind, with Nitro producing the
// server bundle. On Vercel the Vercel preset is used automatically.
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Server code must never be imported into the browser bundle.
      importProtection: { behavior: "error", client: { files: ["**/server/**"], specifiers: ["server-only"] } },
      // SSR error wrapper (src/server.ts).
      server: { entry: "server" },
    }),
    ...(command === "build" ? [nitro(process.env["VERCEL"] ? { preset: "vercel" } : {})] : []),
    viteReact(),
  ],
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  server: { port: 5173 },
}));
