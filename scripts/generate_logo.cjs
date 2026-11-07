const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

function buildLogoSvg() {
  // Kinetic Snow Leopard / Agile Lynx Mascot (Centered at 512, 512)
  // Coordinates are relative to center (0,0) inside transform="translate(512, 512)"
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="squircle-clip">
      <rect x="24" y="24" width="976" height="976" rx="220" />
    </clipPath>

    <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <linearGradient id="cyan-vector" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#00f5ff" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.2"/>
    </linearGradient>

    <linearGradient id="slate-chest" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>

    <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.18" />
    </filter>
  </defs>

  <!-- Luxury White Squircle Container -->
  <rect x="24" y="24" width="976" height="976" rx="220" fill="#ffffff" stroke="#e2e8f0" stroke-width="6" />

  <g clip-path="url(#squircle-clip)">
    <g transform="translate(512, 512)" filter="url(#subtle-shadow)">

      <!-- Hexagonal Architectural Gateway -->
      <polygon points="
        0,-390
        338,-195
        338,195
        0,390
        -338,195
        -338,-195
      " fill="none" stroke="#0f172a" stroke-width="40" stroke-linejoin="round" />

      <!-- Inner Kinetic Dashed Telemetry Ring -->
      <polygon points="
        0,-355
        307,-177
        307,177
        0,355
        -307,177
        -307,-177
      " fill="none" stroke="#00f5ff" stroke-width="4" opacity="0.45" stroke-dasharray="16, 12" />

      <!-- Symmetrical Origami Kinetic Lynx Mascot (Coordinates centered at 0,0) -->

      <!-- 1. Watertight Solid Base Silhouette (Prevents any background leaks) -->
      <path d="
        M 0 -290
        L 85 -240
        L 155 -320
        L 190 -230
        L 230 -140
        L 260 -30
        L 245 80
        L 210 170
        L 130 250
        L 80 310
        L 0 340
        L -80 310
        L -130 250
        L -210 170
        L -245 80
        L -260 -30
        L -230 -140
        L -190 -230
        L -155 -320
        L -85 -240
        Z
      " fill="#0b0f19" />

      <!-- 2. Outer Facets - Cheeks, Shoulders & Crown -->
      <!-- Ear Backs & Tufts -->
      <polygon points="85,-240 155,-320 190,-230 135,-180" fill="#1e293b" />
      <polygon points="-85,-240 -155,-320 -190,-230 -135,-180" fill="#0f172a" />
      <!-- Ear Inner Facets (Slate & Cyan Trim) -->
      <polygon points="100,-225 150,-285 170,-220 120,-175" fill="#334155" />
      <polygon points="-100,-225 -150,-285 -170,-220 -120,-175" fill="#1e293b" />
      <polygon points="120,-215 145,-265 155,-215" fill="#0284c7" opacity="0.8" />
      <polygon points="-120,-215 -145,-265 -155,-215" fill="#00f5ff" opacity="0.6" />

      <!-- Forehead Crown Facets -->
      <polygon points="0,-290 85,-240 55,-180 0,-210" fill="#475569" />
      <polygon points="0,-290 -85,-240 -55,-180 0,-210" fill="#334155" />
      <polygon points="0,-210 55,-180 0,-130" fill="#64748b" />
      <polygon points="0,-210 -55,-180 0,-130" fill="#475569" />

      <!-- Temples & Brow Ridges -->
      <polygon points="85,-240 135,-180 90,-125 55,-180" fill="#334155" />
      <polygon points="-85,-240 -135,-180 -90,-125 -55,-180" fill="#1e293b" />

      <!-- Zygomatic Wide Cheeks (Natural Feline Proportions) -->
      <polygon points="135,-180 230,-140 190,-60 90,-125" fill="#1e293b" />
      <polygon points="-135,-180 -230,-140 -190,-60 -90,-125" fill="#0f172a" />
      <polygon points="230,-140 260,-30 200,30 190,-60" fill="#334155" />
      <polygon points="-230,-140 -260,-30 -200,30 -190,-60" fill="#1e293b" />
      <polygon points="260,-30 245,80 170,90 200,30" fill="#1e293b" />
      <polygon points="-260,-30 -245,80 -170,90 -200,30" fill="#0f172a" />

      <!-- Lower Jaw & Cheek Flairs -->
      <polygon points="245,80 210,170 140,160 170,90" fill="#334155" />
      <polygon points="-245,80 -210,170 -140,160 -170,90" fill="#1e293b" />
      <polygon points="210,170 130,250 90,200 140,160" fill="#1e293b" />
      <polygon points="-210,170 -130,250 -90,200 -140,160" fill="#0f172a" />

      <!-- 3. Kinetic Central Facial Plane & Snout Bridge -->
      <polygon points="0,-130 55,-180 90,-125 45,-60 0,-80" fill="#475569" />
      <polygon points="0,-130 -55,-180 -90,-125 -45,-60 0,-80" fill="#334155" />
      <polygon points="0,-80 45,-60 30,10 0,0" fill="#64748b" />
      <polygon points="0,-80 -45,-60 -30,10 0,0" fill="#475569" />

      <!-- 4. Focused Predator Almond Eyes (Sharp Polygon Cant in Electric Cyan) -->
      <!-- Right Eye Socket -->
      <polygon points="45,-60 90,-125 120,-50 55,-35" fill="#0b0f19" />
      <!-- Right Eye Sclera / Glow -->
      <polygon points="55,-55 105,-85 115,-55 70,-40" fill="url(#cyan-glow)" />
      <!-- Right Eye Iris / Pupil Core -->
      <polygon points="75,-62 95,-75 90,-55 72,-50" fill="#042f2e" />
      <circle cx="95" cy="-65" r="3" fill="#ffffff" />

      <!-- Left Eye Socket -->
      <polygon points="-45,-60 -90,-125 -120,-50 -55,-35" fill="#0b0f19" />
      <!-- Left Eye Sclera / Glow -->
      <polygon points="-55,-55 -105,-85 -115,-55 -70,-40" fill="url(#cyan-glow)" />
      <!-- Left Eye Iris / Pupil Core -->
      <polygon points="-75,-62 -95,-75 -90,-55 -72,-50" fill="#042f2e" />
      <circle cx="-95" cy="-65" r="3" fill="#ffffff" />

      <!-- 5. Anatomical Muzzle & Whisker Facets (Refined Slate / Titanium, NO Buck Teeth) -->
      <!-- Nose Leather Keystone -->
      <polygon points="0,0 28,12 18,35 0,42" fill="#0f172a" />
      <polygon points="0,0 -28,12 -18,35 0,42" fill="#0b0f19" />
      <polygon points="0,5 18,16 12,30 0,35" fill="#00f5ff" opacity="0.6" />

      <!-- Lateral Whisker Pads (Horizontal Spanning) -->
      <polygon points="28,12 70,-15 110,15 65,55 18,35" fill="#94a3b8" />
      <polygon points="-28,12 -70,-15 -110,15 -65,55 -18,35" fill="#64748b" />
      <polygon points="18,35 65,55 50,95 0,75" fill="#cbd5e1" />
      <polygon points="-18,35 -65,55 -50,95 0,75" fill="#94a3b8" />

      <!-- Under-Eye Cheek Bridge -->
      <polygon points="70,-15 120,-50 190,-60 160,20 110,15" fill="#475569" />
      <polygon points="-70,-15 -120,-50 -190,-60 -160,20 -110,15" fill="#334155" />
      <polygon points="110,15 160,20 170,90 120,110 65,55" fill="#334155" />
      <polygon points="-110,15 -160,20 -170,90 -120,110 -65,55" fill="#1e293b" />

      <!-- Chin & Jaw Line -->
      <polygon points="0,75 40,95 25,140 0,148" fill="#e2e8f0" />
      <polygon points="0,75 -40,95 -25,140 0,148" fill="#94a3b8" />
      <polygon points="40,95 50,95 90,145 25,140" fill="#64748b" />
      <polygon points="-40,95 -50,95 -90,145 -25,140" fill="#475569" />

      <!-- 6. Muscular Neck, Kinetic Chain Vectors & Articulation Diamond -->
      <!-- Throat & Neck Plates -->
      <polygon points="0,148 25,140 70,210 0,225" fill="#475569" />
      <polygon points="0,148 -25,140 -70,210 0,225" fill="#334155" />
      <polygon points="25,140 90,145 140,160 120,230 70,210" fill="#334155" />
      <polygon points="-25,140 -90,145 -140,160 -120,230 -70,210" fill="#1e293b" />

      <!-- Lower Collar Plates -->
      <polygon points="0,225 70,210 50,300 0,315" fill="#334155" />
      <polygon points="0,225 -70,210 -50,300 0,315" fill="#1e293b" />
      <polygon points="70,210 120,230 130,250 80,310 50,300" fill="#1e293b" />
      <polygon points="-70,210 -120,230 -130,250 -80,310 -50,300" fill="#0f172a" />
      <polygon points="0,315 50,300 80,310 0,340" fill="#1e293b" />
      <polygon points="0,315 -50,300 -80,310 0,340" fill="#0f172a" />

      <!-- Biomechanical Kinetic Core Diamond (Neck Node) -->
      <polygon points="0,170 30,210 0,250 -30,210" fill="#0b0f19" stroke="#00f5ff" stroke-width="3" />
      <polygon points="0,180 20,210 0,240 -20,210" fill="url(#cyan-vector)" />
      <circle cx="0" cy="210" r="4" fill="#00f5ff" />

    </g>
  </g>
</svg>`;
}

async function renderLogo() {
  const outputDir = path.resolve(__dirname, '../docs/images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svg = buildLogoSvg();
  const svgPath = path.join(outputDir, 'logo.svg');
  const pngPath = path.join(outputDir, 'logo.png');

  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log(`✓ Wrote ${svgPath}`);

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(pngPath, pngBuffer);
  console.log(`✓ Successfully rendered ${pngPath} at 1024x1024`);
}

renderLogo().catch(err => {
  console.error('Failed to render logo:', err);
  process.exit(1);
});
