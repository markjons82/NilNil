'use strict';
const path = require('path');

// SVG path for a regular pentagon
// startAngle: angle (radians) of the first vertex from (cx, cy)
function pentagon(cx, cy, r, startAngle) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = startAngle + (2 * Math.PI / 5) * i;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

function buildSvg(S) {
  const cx = S / 2;
  const cy = S / 2;

  // ── Soccer ball geometry ────────────────────────────────────────────────────
  // All sizes are proportional to S so the design scales cleanly.
  const BR = S * 0.298;  // ball radius            ≈ 305 px at 1024
  const PR = S * 0.059;  // pentagon circumradius  ≈  60 px at 1024
  const RI = S * 0.151;  // inner ring distance    ≈ 155 px at 1024
  const RO = S * 0.259;  // outer ring distance    ≈ 265 px at 1024
  // Pentagon inradius (apothem) = PR * cos(π/5) ≈ PR * 0.809 ≈ 49 px
  // Centre → inner gap (vertex to vertex) ≈ (RI - PR) - PR = RI - 2PR ≈ 35 px  ✓
  // Outer ring centres extend past ball edge → naturally clipped             ✓

  const patches = [
    // Centre pentagon – vertex pointing up
    pentagon(cx, cy, PR, -Math.PI / 2),

    // Inner ring: 5 pentagons, vertex of each pointing toward ball centre
    ...Array.from({ length: 5 }, (_, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI / 5) * i;
      return pentagon(cx + RI * Math.cos(a), cy + RI * Math.sin(a), PR, a + Math.PI);
    }),

    // Outer ring: 5 pentagons offset 36°, vertex pointing toward ball centre
    ...Array.from({ length: 5 }, (_, i) => {
      const a = -Math.PI / 2 + Math.PI / 5 + (2 * Math.PI / 5) * i;
      return pentagon(cx + RO * Math.cos(a), cy + RO * Math.sin(a), PR, a + Math.PI);
    }),
  ];

  // ── Notification dot ────────────────────────────────────────────────────────
  // Centre sits on the ball circumference at 45° (top-right diagonal).
  // This gives the classic half-in / half-out badge look.
  const dotAngle = -Math.PI / 4;
  const dotCx = (cx + BR * Math.cos(dotAngle)).toFixed(2);
  const dotCy = (cy + BR * Math.sin(dotAngle)).toFixed(2);
  const dotR  = (S * 0.076).toFixed(2);

  const sw = (S * 0.004).toFixed(2);  // general stroke width

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <!-- Green gradient background: top-left #10B981 → bottom-right #059669 -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>

    <!-- Subtle highlight to give the ball a slight 3-D feel -->
    <radialGradient id="shine" cx="38%" cy="32%" r="65%" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.22)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.10)"/>
    </radialGradient>

    <!-- Clip patches to ball circle -->
    <clipPath id="ballClip">
      <circle cx="${cx}" cy="${cy}" r="${BR.toFixed(2)}"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect width="${S}" height="${S}" fill="url(#bg)"/>

  <!-- Soccer ball – white base -->
  <circle cx="${cx}" cy="${cy}" r="${BR.toFixed(2)}" fill="white"/>

  <!-- Black pentagon patches (auto-clipped to ball circle) -->
  <g clip-path="url(#ballClip)"
     fill="#1A1A1A"
     stroke="#1A1A1A"
     stroke-width="${sw}"
     stroke-linejoin="round">
    ${patches.map(d => `<path d="${d}"/>`).join('\n    ')}
  </g>

  <!-- 3-D highlight overlay -->
  <circle cx="${cx}" cy="${cy}" r="${BR.toFixed(2)}" fill="url(#shine)"/>

  <!-- Ball border -->
  <circle cx="${cx}" cy="${cy}" r="${BR.toFixed(2)}"
          fill="none" stroke="rgba(0,0,0,0.07)" stroke-width="${sw}"/>

  <!-- Red notification dot (half overlapping ball edge at top-right) -->
  <circle cx="${dotCx}" cy="${dotCy}" r="${dotR}"
          fill="#EF4444"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="${(S * 0.008).toFixed(2)}"/>
</svg>`;
}

async function main() {
  const sharp = require('sharp');
  const assetsDir = path.join(__dirname, '..', 'assets');
  const svg = buildSvg(1024);
  const buf = Buffer.from(svg, 'utf-8');

  const targets = [
    { name: 'icon.png',          size: 1024 },
    { name: 'adaptive-icon.png', size: 1024 },
    { name: 'splash-icon.png',   size: 1024 },
  ];

  for (const { name, size } of targets) {
    const outPath = path.join(assetsDir, name);
    await sharp(buf)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`  ✓  ${name}  (${size}×${size})`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
