#!/usr/bin/env node
/**
 * Post-build script for PWA support.
 * Expo export does NOT copy public/ files or inject manifest/SW links,
 * so this script does it manually after every build.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PUBLIC = path.join(__dirname, '..', 'public');
const ASSETS = path.join(__dirname, '..', 'assets');
const INDEX = path.join(DIST, 'index.html');

// 1. Copy all files from public/ into dist/
if (fs.existsSync(PUBLIC)) {
  const files = fs.readdirSync(PUBLIC);
  for (const file of files) {
    const src = path.join(PUBLIC, file);
    const dest = path.join(DIST, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      console.log(`[PWA] Copied public/${file} → dist/${file}`);
    }
  }
}

// 2. Copy logo.png into dist/ for manifest icon usage
const logoSrc = path.join(ASSETS, 'logo.png');
const logoDest = path.join(DIST, 'logo-192.png');
const logoDest512 = path.join(DIST, 'logo-512.png');
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, logoDest);
  fs.copyFileSync(logoSrc, logoDest512);
  console.log('[PWA] Copied assets/logo.png → dist/logo-192.png & logo-512.png');
}

// 3. Write manifest.json directly into dist/ (overrides if needed)
const manifest = {
  name: 'MandiBook Pro',
  short_name: 'MandiBook',
  description: 'Mandi commission agent billing app',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#00450d',
  orientation: 'portrait-primary',
  icons: [
    {
      src: '/logo-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/logo-512.png',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: '/logo-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};
fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('[PWA] Wrote manifest.json to dist/');

// 4. Inject <link rel="manifest"> and meta tags into <head> of index.html
if (fs.existsSync(INDEX)) {
  let html = fs.readFileSync(INDEX, 'utf-8');

  const pwaHead = [
    '<link rel="manifest" href="/manifest.json" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<meta name="apple-mobile-web-app-title" content="MandiBook Pro" />',
    '<link rel="apple-touch-icon" href="/logo-192.png" />',
  ].join('\n    ');

  // Insert just before </head>
  if (!html.includes('rel="manifest"')) {
    html = html.replace('</head>', `    ${pwaHead}\n  </head>`);
    fs.writeFileSync(INDEX, html, 'utf-8');
    console.log('[PWA] Injected manifest + meta tags into dist/index.html');
  } else {
    console.log('[PWA] Manifest link already present, skipping injection');
  }
} else {
  console.error('[PWA] dist/index.html not found — run expo export first');
  process.exit(1);
}

console.log('[PWA] Post-build complete ✓');
