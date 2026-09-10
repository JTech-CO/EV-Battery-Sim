import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const index = read('index.html');
assert.match(index, /js\/runtime-data\.js/);
assert.match(index, /js\/app\.bundle\.js/);
assert.doesNotMatch(index, /type=["']module["']/);
assert.match(index, /id=["']packCanvas["']/);

const runtimeData = read('js/runtime-data.js');
assert.match(runtimeData, /window\.EVBS_RUNTIME_DATA=/);
assert.ok(runtimeData.length > 5000);

const bundle = read('js/app.bundle.js');
assert.ok(bundle.length > 30000);
new Function(bundle);

const forbiddenModern = [
  ['structuredClone', /\bstructuredClone\s*\(/],
  ['Array.at', /\.at\s*\(/],
  ['flatMap', /\.flatMap\s*\(/],
  ['optional chaining', /\?\.[A-Za-z_$\[]/],
  ['nullish coalescing', /\?\?\s*/]
];
const jsSourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith('.js') && !full.endsWith('app.bundle.js')) jsSourceFiles.push(full);
  }
}
walk(path.join(root, 'js'));
const source = jsSourceFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
for (const [label, regex] of forbiddenModern) assert.doesNotMatch(source, regex, label);

const textExtensions = new Set(['.md', '.html', '.js', '.css', '.mjs']);
const emDash = String.fromCodePoint(0x2014);
const enDash = String.fromCodePoint(0x2013);
const longDashHits = [];
function scanText(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanText(full);
    else if (entry.isFile() && textExtensions.has(path.extname(full))) {
      const text = fs.readFileSync(full, 'utf8');
      if (text.includes(emDash) || text.includes(enDash)) longDashHits.push(path.relative(root, full));
    }
  }
}
scanText(root);
assert.deepEqual(longDashHits, [], 'em/en dash characters must not remain in source/docs');

const css = ['css/base.css', 'css/layout.css', 'css/components.css', 'css/responsive.css'].map(read).join('\n');
for (const match of css.matchAll(/font-size\s*:\s*([0-9.]+)px/g)) {
  assert.ok(Number(match[1]) >= 12, `font-size below 12px: ${match[0]}`);
}
for (const match of css.matchAll(/font\s*:\s*[^;{}]*?([0-9.]+)px\b/g)) {
  assert.ok(Number(match[1]) >= 12, `font shorthand below 12px: ${match[0]}`);
}
for (const breakpoint of ['1280px', '1040px', '820px', '560px', '360px']) assert.ok(css.includes(breakpoint), breakpoint);

console.log(JSON.stringify({
  ok: true,
  classicRuntime: true,
  directFileDataBundle: true,
  longDashHits: longDashHits.length,
  minCssFontPx: 12,
  responsiveBreakpoints: [1280, 1040, 820, 560, 360]
}, null, 2));
