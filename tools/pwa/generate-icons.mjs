import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDir = path.join(root, 'public', 'pwa');
const source = path.join(outputDir, 'teo-icon-source.svg');
const background = '#F53D4C';

const icons = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

await mkdir(outputDir, { recursive: true });

for (const icon of icons) {
  await sharp(source)
    .resize(icon.size, icon.size)
    .flatten({ background })
    .png()
    .toFile(path.join(outputDir, icon.file));
}

const maskableInner = await sharp(source)
  .resize(408, 408)
  .flatten({ background })
  .png()
  .toBuffer();

await sharp(maskableInner)
  .extend({
    top: 52,
    right: 52,
    bottom: 52,
    left: 52,
    background,
  })
  .flatten({ background })
  .png()
  .toFile(path.join(outputDir, 'pwa-maskable-512x512.png'));

console.log('Generated PWA icons in public/pwa');
