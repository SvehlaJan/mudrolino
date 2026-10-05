// Paint a fictional palette-A default face into the canonical lat-long face UV layout.
// The face is drawn as a front view in head millimetres, then each UV texel is mapped
// to its point on the head surface and sampled orthographically along the face axis.
// The result looks exactly as drawn from the front and foreshortens naturally at the sides.
// Usage: node tools/avatar/paint_catalog_face.mjs --face=H02|H01 --out=PATH [--size=1024] [--preview=PATH]
import fs from 'node:fs';
import sharp from 'sharp';

const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);

const smoothstep = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

// Head surface position for lat-long (phi from the top, theta from +X) in metres.
const HEADS = {
  // Must match head_point() in tools/blender/catalog/build_catalog_female_foundation_study.py.
  H02: (phi, theta) => {
    const c = Math.cos(phi), s = Math.sin(phi), jaw = 1 - .06 * Math.max(0, -c);
    return [.139 * s * Math.cos(theta) * jaw, .012 + .131 * s * Math.sin(theta), 1.608 + .172 * c];
  },
  // Must match surface_point() in build_catalog_head.py followed by the upper-skull compression
  // and lower_face() of build_catalog_head_style_study.py, as applied by build_catalog_head_texture_study.py.
  H01: (phi, theta) => {
    const c = Math.cos(phi), s = Math.sin(phi), jaw = 1 - .16 * Math.max(0, -c);
    let x = .139 * s * Math.cos(theta) * jaw, z = 1.608 + (c >= 0 ? .172 * c : -.148 * Math.min(1, -c / .92));
    const y = .012 + .131 * s * Math.sin(theta);
    if (z > 1.700) z = 1.700 + (z - 1.700) * .88;
    const t = Math.max(0, Math.min(1, (1.620 - z) / .160));
    return [x * (1.015 + .105 * t), y, z + .022 * t];
  },
};

// sRGB bytes of the linear head skin (.72, .385, .215) used by the untextured head slot.
const SKIN = [221, 167, 128];
const rgb = c => `rgb(${c.join(',')})`;

// Front-view design in millimetres: x to the character's left (viewer's right), y down from head centre.
function femaleFace() {
  const eyeY = 2, eyeX = 62, eyeTall = 1.22, mouthY = 98, noseY = 58;
  const eye = side => {
    const s = side; // +1 character left, -1 character right
    const cx = s * eyeX, cy = eyeY;
    // Almond opening: rounder upper lid, flatter lower lid; the outer corner lifts slightly.
    const inner = [cx - s * 34, cy + 2], outer = [cx + s * 35, cy - 3];
    const opening = `M ${inner} C ${cx - s * 26} ${cy - 25}, ${cx + s * 24} ${cy - 29}, ${outer} C ${cx + s * 24} ${cy + 21}, ${cx - s * 22} ${cy + 22}, ${inner} Z`;
    const lash = `M ${cx - s * 35} ${cy + 3} C ${cx - s * 26} ${cy - 26}, ${cx + s * 24} ${cy - 31}, ${cx + s * 37} ${cy - 4}`;
    const flick = `M ${cx + s * 31} ${cy - 11} Q ${cx + s * 42} ${cy - 14} ${cx + s * 47} ${cy - 22} M ${cx + s * 35} ${cy - 5} Q ${cx + s * 45} ${cy - 5} ${cx + s * 50} ${cy - 11}`;
    const lower = `M ${cx - s * 12} ${cy + 20} C ${cx - s * 2} ${cy + 23}, ${cx + s * 12} ${cy + 22}, ${cx + s * 22} ${cy + 16}`;
    const crease = `M ${cx - s * 14} ${cy - 30} C ${cx - s * 2} ${cy - 37}, ${cx + s * 16} ${cy - 36}, ${cx + s * 27} ${cy - 27}`;
    const ix = cx + s * 1.5, iy = cy + 1;
    return `<g transform="translate(0 ${cy}) scale(1 ${eyeTall}) translate(0 ${-cy})">
      <path d="${crease}" fill="none" stroke="rgb(196,128,98)" stroke-opacity=".32" stroke-width="2.2" stroke-linecap="round"/>
      <clipPath id="eye${side}"><path d="${opening}"/></clipPath>
      <path d="${opening}" fill="rgb(252,250,246)"/>
      <g clip-path="url(#eye${side})">
        <ellipse cx="${ix}" cy="${iy}" rx="23" ry="${23 / eyeTall}" fill="url(#iris)"/>
        <ellipse cx="${ix}" cy="${iy}" rx="23" ry="${23 / eyeTall}" fill="none" stroke="rgb(52,28,16)" stroke-width="2.4"/>
        <ellipse cx="${ix}" cy="${iy}" rx="11" ry="${11 / eyeTall}" fill="rgb(24,14,10)"/>
        <ellipse cx="${cx}" cy="${cy - 19}" rx="40" ry="9" fill="rgb(60,32,22)" fill-opacity=".28"/>
        <ellipse cx="${ix - 8}" cy="${iy - 7}" rx="6.5" ry="${6.5 / eyeTall}" fill="#fff"/>
        <ellipse cx="${ix + 8.5}" cy="${iy + 7}" rx="2.8" ry="${2.8 / eyeTall}" fill="#fff" fill-opacity=".9"/>
      </g>
      <path d="${lash}" fill="none" stroke="rgb(46,26,20)" stroke-width="5.2" stroke-linecap="round"/>
      <path d="${flick}" fill="none" stroke="rgb(46,26,20)" stroke-width="2.8" stroke-linecap="round"/>
      <path d="${lower}" fill="none" stroke="rgb(170,104,80)" stroke-opacity=".28" stroke-width="1.4" stroke-linecap="round"/></g>`;
  };
  const brow = s => {
    const p = (x, y) => `${s * x} ${y + eyeY - 21}`;
    // Tapered arch filled as a shape: thick inner end, thin tail.
    return `<path d="M ${p(27, -27)} C ${p(40, -44)}, ${p(70, -51)}, ${p(98, -36)} C ${p(74, -40)}, ${p(46, -32)}, ${p(28, -14)} Z" fill="rgb(78,44,28)"/>`;
  };
  return `
    <defs>
      <radialGradient id="iris" cx=".5" cy=".42" r=".6">
        <stop offset="0" stop-color="rgb(150,92,48)"/>
        <stop offset=".55" stop-color="rgb(104,58,30)"/>
        <stop offset="1" stop-color="rgb(58,30,16)"/>
      </radialGradient>
      <radialGradient id="blush">
        <stop offset="0" stop-color="rgb(238,118,104)" stop-opacity=".42"/>
        <stop offset="1" stop-color="rgb(238,118,104)" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="noseShade" cx=".5" cy=".7" r=".6">
        <stop offset="0" stop-color="rgb(190,118,88)" stop-opacity=".55"/>
        <stop offset="1" stop-color="rgb(190,118,88)" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="lip" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgb(214,108,96)"/>
        <stop offset="1" stop-color="rgb(232,138,122)"/>
      </linearGradient>
    </defs>
    <ellipse cx="-80" cy="${eyeY + 44}" rx="30" ry="20" fill="url(#blush)"/>
    <ellipse cx="80" cy="${eyeY + 44}" rx="30" ry="20" fill="url(#blush)"/>
    ${brow(-1)}${brow(1)}
    ${eye(-1)}${eye(1)}
    <ellipse cx="0" cy="${noseY - 6}" rx="15" ry="11" fill="url(#noseShade)"/>
    <path d="M -9 ${noseY} Q 0 ${noseY + 6} 9 ${noseY}" fill="none" stroke="rgb(176,104,78)" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M -31 ${mouthY - 8} C -16 ${mouthY + 3}, 16 ${mouthY + 3}, 31 ${mouthY - 8} C 19 ${mouthY + 18}, -19 ${mouthY + 18}, -31 ${mouthY - 8} Z" fill="url(#lip)"/>
    <path d="M -34 ${mouthY - 10} C -17 ${mouthY + 4}, 17 ${mouthY + 4}, 34 ${mouthY - 10}" fill="none" stroke="rgb(140,58,50)" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M -11 ${mouthY + 12} Q 0 ${mouthY + 15} 11 ${mouthY + 12}" fill="none" stroke="rgb(255,214,200)" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>`;
}

// H01: original short waves and full short beard. Eyes, brows and lips are drawn; the beard is
// a surface layer (beardH01) so it can wrap past the cheeks to the sideburns without stretching.
function maleFace() {
  const eyeY = -26, eyeX = 56, browY = -77, mouthY = 56;
  const eye = s => {
    const cx = s * eyeX, cy = eyeY;
    const inner = [cx - s * 29, cy + 3], outer = [cx + s * 29, cy - 1];
    const opening = `M ${inner} C ${cx - s * 21} ${cy - 21}, ${cx + s * 19} ${cy - 24}, ${outer} C ${cx + s * 19} ${cy + 19}, ${cx - s * 19} ${cy + 20}, ${inner} Z`;
    const lid = `M ${cx - s * 30} ${cy + 4} C ${cx - s * 21} ${cy - 22}, ${cx + s * 19} ${cy - 26}, ${cx + s * 31} ${cy}`;
    const crease = `M ${cx - s * 16} ${cy - 25} C ${cx - s * 4} ${cy - 31}, ${cx + s * 12} ${cy - 31}, ${cx + s * 22} ${cy - 24}`;
    const ix = cx + s * 1, iy = cy + 1;
    return `<g transform="translate(${cx} ${cy}) scale(1.15) translate(${-cx} ${-cy})">
      <path d="${crease}" fill="none" stroke="rgb(170,104,76)" stroke-opacity=".35" stroke-width="2.2" stroke-linecap="round"/>
      <clipPath id="maleEye${s}"><path d="${opening}"/></clipPath>
      <path d="${opening}" fill="rgb(250,248,242)"/>
      <g clip-path="url(#maleEye${s})">
        <circle cx="${ix}" cy="${iy}" r="17.5" fill="url(#maleIris)"/>
        <circle cx="${ix}" cy="${iy}" r="17.5" fill="none" stroke="rgb(46,24,14)" stroke-width="2"/>
        <circle cx="${ix}" cy="${iy}" r="8.5" fill="rgb(22,13,9)"/>
        <ellipse cx="${cx}" cy="${cy - 17}" rx="34" ry="8" fill="rgb(70,36,24)" fill-opacity=".3"/>
        <circle cx="${ix - 6}" cy="${iy - 6.5}" r="5" fill="#fff"/>
        <circle cx="${ix + 6.5}" cy="${iy + 6}" r="2.1" fill="#fff" fill-opacity=".9"/>
      </g>
      <path d="${lid}" fill="none" stroke="rgb(58,32,22)" stroke-width="3.6" stroke-linecap="round"/></g>`;
  };
  const brow = s => {
    const p = (x, y) => `${s * x} ${browY + y}`;
    return `<path d="M ${p(20, 6)} C ${p(30, -6)}, ${p(62, -12)}, ${p(84, -2)} C ${p(64, -3)}, ${p(36, 3)}, ${p(22, 15)} Z" fill="rgb(70,40,26)"/>`;
  };
  return `
    <defs>
      <radialGradient id="maleIris" cx=".5" cy=".42" r=".6">
        <stop offset="0" stop-color="rgb(140,84,44)"/>
        <stop offset=".55" stop-color="rgb(96,54,28)"/>
        <stop offset="1" stop-color="rgb(52,27,15)"/>
      </radialGradient>
      <radialGradient id="maleBlush">
        <stop offset="0" stop-color="rgb(232,120,100)" stop-opacity=".28"/>
        <stop offset="1" stop-color="rgb(232,120,100)" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="maleLip" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgb(196,104,88)"/>
        <stop offset="1" stop-color="rgb(214,126,108)"/>
      </linearGradient>
    </defs>
    <ellipse cx="-74" cy="${eyeY + 34}" rx="26" ry="16" fill="url(#maleBlush)"/>
    <ellipse cx="74" cy="${eyeY + 34}" rx="26" ry="16" fill="url(#maleBlush)"/>
    ${brow(-1)}${brow(1)}
    ${eye(-1)}${eye(1)}
    <path d="M -28 ${mouthY - 3} C -14 ${mouthY + 6}, 14 ${mouthY + 6}, 28 ${mouthY - 3} C 17 ${mouthY + 15}, -17 ${mouthY + 15}, -28 ${mouthY - 3} Z" fill="url(#maleLip)"/>
    <path d="M -31 ${mouthY - 5} C -15 ${mouthY + 7}, 15 ${mouthY + 7}, 31 ${mouthY - 5}" fill="none" stroke="rgb(112,52,40)" stroke-width="2.6" stroke-linecap="round"/>`;
}

// Deterministic per-texel noise for stubble grain and an irregular beard edge.
const hash = (i, j) => { const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); };

// Full short beard: connected moustache, cheek line rising to sideburns, chin and jaw.
function beardH01([x, y, z], phi, theta, i, j) {
  const ax = Math.abs(x) * 1000;
  // Stops just in front of the ears.
  const front = smoothstep((-Math.sin(theta) - .10) / .12);
  // Nearly level cheek line at the nose tip, rising only at the sideburns.
  const top = 1.583 + .014 * smoothstep((ax - 30) / 70) + .058 * smoothstep((ax - 96) / 36) + .004 * (hash(i, j) - .5);
  const amount = front * smoothstep((top - z) * 1000 / 9) * (1 - smoothstep((phi - 2.86) / .18));
  // The moustache band reads slightly denser; the painted lips sit on top of the beard.
  const moustache = smoothstep((1 - (((x * 1000) / 38) ** 2 + (((1.608 - z) * 1000 - 44) / 9) ** 2)) / .4);
  const grain = .88 + .24 * hash(j, i);
  const color = [124, 78, 52].map(value => value * grain * (1 - .14 * moustache));
  return { amount: amount * (.82 + .12 * moustache), color };
}

const FACES = {
  H02: { head: HEADS.H02, design: femaleFace },
  H01: { head: HEADS.H01, design: maleFace, layer: beardH01, facing: true },
};

const face = FACES[arg('face') ?? 'H02'];
const out = arg('out');
const size = Number(arg('size') ?? 1024);
if (!face || !out) throw new Error('Usage: --face=H02|H01 --out=PATH [--size=1024] [--preview=PATH]');

// Front design canvas: x -150..150 mm, y -200..200 mm (z 1.808..1.408 m), 4 px per mm.
const PX = 4, W = 300 * PX, H = 400 * PX;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="-150 -200 300 400">${face.design()}</svg>`;
const { data: design } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

function sample(xMm, yMm) {
  const fx = (xMm + 150) * PX - .5, fy = (yMm + 200) * PX - .5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const at = (x, y, c) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : design[(y * W + x) * 4 + c];
  return [0, 1, 2, 3].map(c => (1 - ty) * ((1 - tx) * at(x0, y0, c) + tx * at(x0 + 1, y0, c)) + ty * ((1 - tx) * at(x0, y0 + 1, c) + tx * at(x0 + 1, y0 + 1, c)));
}

const texture = Buffer.alloc(size * size * 4);
for (let j = 0; j < size; j++) {
  const v = 1 - (j + .5) / size, phi = Math.PI * (1 - v);
  for (let i = 0; i < size; i++) {
    const u = (i + .5) / size, theta = 2 * Math.PI * u;
    let color = SKIN;
    const point = face.head(phi, theta);
    if (face.layer) {
      const { amount, color: tone } = face.layer(point, phi, theta, i, j);
      color = color.map((value, c) => tone[c] * amount + value * (1 - amount));
    }
    // Only the front hemisphere (toward -Y) carries the projected design.
    if (Math.sin(theta) < 0) {
      let weight = 1;
      if (face.facing) {
        // Fade the projection where the surface turns away from the face axis.
        const e = 1e-3, a = face.head(phi + e, theta), b = face.head(phi, theta + e);
        const du = [a[0] - point[0], a[1] - point[1], a[2] - point[2]], dv = [b[0] - point[0], b[1] - point[1], b[2] - point[2]];
        const n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
        weight = smoothstep((-n[1] / Math.hypot(...n) - .2) / .25);
      }
      const [r, g, b, a] = sample(point[0] * 1000, (1.608 - point[2]) * 1000);
      const alpha = weight * a / 255;
      color = [r, g, b].map((value, c) => value * alpha + color[c] * (1 - alpha));
    }
    const k = (j * size + i) * 4;
    texture[k] = Math.round(color[0]); texture[k + 1] = Math.round(color[1]); texture[k + 2] = Math.round(color[2]); texture[k + 3] = 255;
  }
}
await sharp(texture, { raw: { width: size, height: size, channels: 4 } }).png({ compressionLevel: 9 }).toFile(out);
const preview = arg('preview');
if (preview) {
  await sharp(Buffer.from(svg)).flatten({ background: rgb(SKIN) }).extract({ left: 0, top: 0, width: W, height: H }).resize({ width: 320 }).toFile(preview);
}
console.log(`Painted ${arg('face') ?? 'H02'} face ${size}px to ${out}`);
