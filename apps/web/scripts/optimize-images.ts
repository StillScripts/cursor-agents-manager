/**
 * Generates WebP assets from source PNGs for better image delivery.
 * Run as part of `bun run build` (build:images) before Vite build.
 */
import path from "node:path"
import sharp from "sharp"

const publicDir = path.join(process.cwd(), "public")

await sharp(path.join(publicDir, "android-chrome-192x192.png"))
  .webp({ quality: 82 })
  .toFile(path.join(publicDir, "android-chrome-192x192.webp"))

console.log("Generated android-chrome-192x192.webp")
