/**
 * Generates WebP assets from source PNGs for better image delivery.
 * Run as part of `bun run build` (build:images) before Vite build.
 *
 * - Logo: android-chrome-192x192.webp
 * - Hero: app-screenshot-800.webp, app-screenshot-1320.webp (responsive)
 * - Screenshots: {name}-400.webp, {name}-800.webp (responsive)
 */
import path from "node:path"
import sharp from "sharp"

const publicDir = path.join(process.cwd(), "public")
const imagesDir = path.join(publicDir, "images")

// Logo
await sharp(path.join(publicDir, "android-chrome-192x192.png"))
  .webp({ quality: 82 })
  .toFile(path.join(publicDir, "android-chrome-192x192.webp"))
console.log("Generated android-chrome-192x192.webp")

// Hero: 1540×793 → 800w and 1320w WebP (covers ~662px display at 2x and larger)
const heroPath = path.join(imagesDir, "app-screenshot.png")
await sharp(heroPath)
  .resize(800)
  .webp({ quality: 82 })
  .toFile(path.join(imagesDir, "app-screenshot-800.webp"))
await sharp(heroPath)
  .resize(1320)
  .webp({ quality: 82 })
  .toFile(path.join(imagesDir, "app-screenshot-1320.webp"))
console.log("Generated app-screenshot-800.webp, app-screenshot-1320.webp")

// Screenshots: 1258×476 → 400w and 800w WebP (cards in 3-col grid)
const screenshots = ["agents-dashboard", "launch-agent", "ai-enhancements"]
for (const name of screenshots) {
  const src = path.join(imagesDir, `${name}.png`)
  await sharp(src).resize(400).webp({ quality: 82 }).toFile(path.join(imagesDir, `${name}-400.webp`))
  await sharp(src).resize(800).webp({ quality: 82 }).toFile(path.join(imagesDir, `${name}-800.webp`))
}
console.log("Generated screenshot WebPs: agents-dashboard, launch-agent, ai-enhancements (400w, 800w)")
