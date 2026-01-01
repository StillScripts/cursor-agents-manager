const sharp = require("sharp")
const fs = require("fs")
const path = require("path")

// Dark background color from manifest.json
const BACKGROUND_COLOR = "#06070B"

// Icon files to process
const iconFiles = [
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
  "apple-touch-icon.png",
  "favicon-16x16.png",
  "favicon-32x32.png",
]

const publicDir = path.join(__dirname, "..", "public")

async function addBackgroundToIcon(filename) {
  const inputPath = path.join(publicDir, filename)
  const outputPath = path.join(publicDir, `${filename}.tmp`)

  if (!fs.existsSync(inputPath)) {
    console.log(`Skipping ${filename} - file not found`)
    return
  }

  try {
    // Read the original image
    const image = sharp(inputPath)
    const metadata = await image.metadata()

    // Create a dark background image
    const background = sharp({
      create: {
        width: metadata.width,
        height: metadata.height,
        channels: 4,
        background: BACKGROUND_COLOR,
      },
    })

    // Composite the original icon over the dark background
    await background
      .composite([
        {
          input: await image.toBuffer(),
          blend: "over",
        },
      ])
      .png()
      .toFile(outputPath)

    // Replace the original file
    fs.renameSync(outputPath, inputPath)
    console.log(`✓ Fixed ${filename}`)
  } catch (error) {
    console.error(`✗ Error processing ${filename}:`, error.message)
    // Clean up temp file if it exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath)
    }
  }
}

async function main() {
  console.log("Adding dark backgrounds to PWA icons...\n")

  for (const file of iconFiles) {
    await addBackgroundToIcon(file)
  }

  console.log("\nDone! All icons have been updated with dark backgrounds.")
}

main().catch(console.error)
