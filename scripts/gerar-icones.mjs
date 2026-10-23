import { readFile, writeFile } from "node:fs/promises"
import sharp from "sharp"

const app = new URL("../src/app/", import.meta.url)
const svg = await readFile(new URL("icon.svg", app))

await writeFile(new URL("icon1.png", app), await sharp(svg).resize(512, 512).png().toBuffer())
await writeFile(new URL("apple-icon.png", app), await sharp(svg)
  .resize(180, 180).flatten({ background: "#0b1f3a" }).png().toBuffer())

// Cada tamanho vem do vetor, sem ampliar uma versão pequena do favicon.
const sizes = [16, 32, 48, 64, 128, 256]
const images = await Promise.all(sizes.map(size => sharp(svg).resize(size, size).png().toBuffer()))
const directory = Buffer.alloc(6 + sizes.length * 16)
directory.writeUInt16LE(1, 2)
directory.writeUInt16LE(sizes.length, 4)
let offset = directory.length
for (const [index, size] of sizes.entries()) {
  const entry = 6 + index * 16
  directory[entry] = size === 256 ? 0 : size
  directory[entry + 1] = size === 256 ? 0 : size
  directory.writeUInt16LE(1, entry + 4)
  directory.writeUInt16LE(32, entry + 6)
  directory.writeUInt32LE(images[index].length, entry + 8)
  directory.writeUInt32LE(offset, entry + 12)
  offset += images[index].length
}
await writeFile(new URL("favicon.ico", app), Buffer.concat([directory, ...images]))

const shareCard = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f4f6fb"/>
  <image x="338" y="154" width="168" height="168" href="data:image/svg+xml;base64,${svg.toString("base64")}"/>
  <text x="538" y="278" font-family="Arial, Helvetica, sans-serif" font-size="108" font-weight="700" letter-spacing="-4" fill="#0b1f3a">Afero</text>
  <g font-family="Arial, Helvetica, sans-serif" font-size="36" text-anchor="middle" fill="#3f4d62">
    <text x="600" y="402">Busca e monitoramento de</text>
    <text x="600" y="452">licitações públicas</text>
  </g>
</svg>`)
await writeFile(new URL("opengraph-image.png", app), await sharp(shareCard).png().toBuffer())
console.log("Ícones e imagem de compartilhamento gerados em src/app/.")
