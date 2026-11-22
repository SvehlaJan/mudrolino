import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDir = path.join(root, 'public', 'pwa');
const source = path.join(root, 'tools', 'pwa', 'bear-icon-render.png');
const background = '#F53D4C';
const ogBackground = '#F4F1EA';

const icons = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

function createBackdropSvg(width, height) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <radialGradient id="tileBg" cx="50%" cy="38%" r="68%">
          <stop offset="0%" stop-color="#FF5E6C"/>
          <stop offset="72%" stop-color="#F53D4C"/>
          <stop offset="100%" stop-color="#F53D4C"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#tileBg)"/>
    </svg>`,
  );
}

async function buildCutoutShadow(rgbaPngBuffer, width, height, shiftY) {
  const { data } = await sharp(rgbaPngBuffer)
    .ensureAlpha()
    .extractChannel('alpha')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const shadowPixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < data.length; i += 1) {
    const offset = i * 4;
    shadowPixels[offset] = 74;
    shadowPixels[offset + 1] = 11;
    shadowPixels[offset + 2] = 18;
    shadowPixels[offset + 3] = Math.round(data[i] * 0.24);
  }

  return sharp(shadowPixels, { raw: { width, height, channels: 4 } })
    .blur(Math.max(4, Math.round(width * 0.022)))
    .extract({ left: 0, top: 0, width, height: height - shiftY })
    .png()
    .toBuffer();
}

await mkdir(outputDir, { recursive: true });

// Standard/Apple/OG bust crop: keeps generous ear clearance inside rounded corners
// while grounding the blue shirt flush against the bottom edge.
const standardCutout = await sharp(source)
  .extract({ left: 92, top: 52, width: 840, height: 840 })
  .resize(512, 512)
  .png()
  .toBuffer();

const standardShiftY = Math.round(512 * 0.018);
const standardShadow = await buildCutoutShadow(standardCutout, 512, 512, standardShiftY);

const standardMaster = await sharp(createBackdropSvg(512, 512))
  .composite([
    { input: standardShadow, left: 0, top: standardShiftY },
    { input: standardCutout, left: 0, top: 0 },
  ])
  .flatten({ background })
  .png()
  .toBuffer();

for (const icon of icons) {
  await sharp(standardMaster)
    .resize(icon.size, icon.size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, icon.file));
}

// Maskable icon: places the full portrait bust safely inside the central 80% circle (r=204.8)
// while extending torso/sleeves seamlessly to the bottom edge.
const maskableSize = 512;
const maskableBearSize = 448;
const maskableLeft = (maskableSize - maskableBearSize) / 2;
const maskableTop = maskableSize - maskableBearSize;
const maskableShiftY = 8;

const maskableBear = await sharp(source)
  .resize(maskableBearSize, maskableBearSize)
  .png()
  .toBuffer();

const maskableShadow = await buildCutoutShadow(
  maskableBear,
  maskableBearSize,
  maskableBearSize,
  maskableShiftY,
);

await sharp(createBackdropSvg(maskableSize, maskableSize))
  .composite([
    { input: maskableShadow, left: maskableLeft, top: maskableTop + maskableShiftY },
    { input: maskableBear, left: maskableLeft, top: maskableTop },
  ])
  .flatten({ background })
  .png({ compressionLevel: 9 })
  .toFile(path.join(outputDir, 'pwa-maskable-512x512.png'));

// Link previews (Open Graph) crop to 1.91:1 or to a centred square, so the rounded
// bear icon sits centred on the canvas background with a soft shadow and generous margin.
const ogShadow = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="460" viewBox="0 0 460 460">
    <defs>
      <filter id="shadow" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#5D453E" flood-opacity="0.18"/>
      </filter>
    </defs>
    <rect x="20" y="10" width="420" height="420" rx="92" fill="#F53D4C" filter="url(#shadow)"/>
  </svg>`,
);
const ogRoundedMask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 420 420">
    <rect width="420" height="420" rx="92" fill="#FFFFFF"/>
  </svg>`,
);
const ogIcon = await sharp(standardMaster)
  .resize(420, 420)
  .composite([{ input: ogRoundedMask, blend: 'dest-in' }])
  .png()
  .toBuffer();

await sharp({ create: { width: 1200, height: 630, channels: 4, background: ogBackground } })
  .composite([
    { input: ogShadow, left: 370, top: 85 },
    { input: ogIcon, left: 390, top: 95 },
  ])
  .flatten({ background: ogBackground })
  .png({ compressionLevel: 9 })
  .toFile(path.join(outputDir, 'og-image.png'));

// Browser tab SVG favicon: crisp vector rounded tile enclosing a compact transparent
// 3D Bear render PNG so tabs display the real bear rather than an inline vector stand-in.
const faviconCutoutSize = 160;
const faviconCutout = await sharp(standardCutout)
  .resize(faviconCutoutSize, faviconCutoutSize)
  .png({ palette: true, quality: 92, compressionLevel: 9 })
  .toBuffer();
const faviconBase64 = faviconCutout.toString('base64');

const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Mudrolíno app icon">
  <defs>
    <radialGradient id="tileBg" cx="50%" cy="38%" r="68%">
      <stop offset="0%" stop-color="#FF5E6C"/>
      <stop offset="72%" stop-color="#F53D4C"/>
      <stop offset="100%" stop-color="#F53D4C"/>
    </radialGradient>
    <clipPath id="tileClip">
      <rect width="512" height="512" rx="112"/>
    </clipPath>
  </defs>
  <g clip-path="url(#tileClip)">
    <rect width="512" height="512" fill="url(#tileBg)"/>
    <image href="data:image/png;base64,${faviconBase64}" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid slice"/>
  </g>
</svg>
`;
await writeFile(path.join(outputDir, 'teo-icon-source.svg'), svgFavicon, 'utf8');

console.log('Generated PWA icons in public/pwa');
