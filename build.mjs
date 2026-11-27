// Bundles the extension into dist/ (the folder to load unpacked). `--watch` rebuilds scripts on change.
import { build, context } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));

const options = {
  entryPoints: {
    content: 'src/content/index.ts',
    'popup/popup': 'src/pages/popup/popup.ts',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  define: { __VERSION__: JSON.stringify(pkg.version) },
  logLevel: 'info',
};

async function copyStatic() {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  manifest.version = pkg.version; // package.json is the single source of the version
  await mkdir('dist/popup', { recursive: true });
  await writeFile('dist/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  await cp('icons', 'dist/icons', { recursive: true });
  await cp('src/pages/popup/popup.html', 'dist/popup/popup.html');
  await cp('src/pages/popup/popup.css', 'dist/popup/popup.css');
}

await rm('dist', { recursive: true, force: true });
await copyStatic();

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
