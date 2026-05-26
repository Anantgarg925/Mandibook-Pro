const fs = require('fs');
const path = require('path');

const target = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '@supabase',
  'supabase-js',
  'dist',
  'index.mjs'
);

const dynamicImportBlock = `if (otelModulePromise === null) otelModulePromise = import(
\t\t/* webpackIgnore: true */
\t\t/* @vite-ignore */
\t\tOTEL_PKG
).catch(() => null);`;

const patchedBlock = 'if (otelModulePromise === null) otelModulePromise = Promise.resolve(null);';

try {
  if (!fs.existsSync(target)) {
    console.warn('[postinstall] Supabase dist file not found, skipping OpenTelemetry patch.');
    process.exit(0);
  }

  const source = fs.readFileSync(target, 'utf8');
  if (source.includes(patchedBlock)) {
    console.log('[postinstall] Supabase OpenTelemetry patch already applied.');
    process.exit(0);
  }

  if (!source.includes(dynamicImportBlock)) {
    console.warn('[postinstall] Supabase OpenTelemetry import pattern not found, skipping patch.');
    process.exit(0);
  }

  fs.writeFileSync(target, source.replace(dynamicImportBlock, patchedBlock));
  console.log('[postinstall] Supabase OpenTelemetry patch applied.');
} catch (error) {
  console.warn('[postinstall] Supabase OpenTelemetry patch failed:', error.message);
}
