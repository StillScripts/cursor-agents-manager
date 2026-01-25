import { defineConfig } from "@tanstack/react-start/config"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  vite: {
    plugins: () => [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
  },
  server: {
    preset: "node-server",
  },
  routers: {
    ssr: {
      entry: "./src/entry-server.tsx",
    },
  },
  tsr: {
    routeFileIgnorePrefix: "-",
    routeFileIgnorePattern: "routeTree.gen",
  },
})
