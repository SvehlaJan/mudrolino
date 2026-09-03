import fs from 'fs';
import path from 'path';

const REQUIRED_FONTS = [
  'nunito-latin.woff2',
  'nunito-latin-ext.woff2',
  'shantell-latin.woff2',
  'shantell-latin-ext.woff2',
];

for (const font of REQUIRED_FONTS) {
  const filePath = path.join(process.cwd(), 'public/fonts', font);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing font file: ${font}`);
  }
  const size = fs.statSync(filePath).size;
  if (size < 5000) {
    throw new Error(`Font file too small or empty (${size} bytes): ${font}`);
  }
  console.log(`✓ ${font} exists (${size} bytes)`);
}
