import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'kuromoji.js',
  'dict/base.dat.gz'
];

await Promise.all(requiredFiles.map((file) => access(new URL(`../dist/${file}`, import.meta.url))));

const manifest = JSON.parse(await readFile(new URL('../dist/manifest.json', import.meta.url), 'utf8'));
if (manifest.manifest_version !== 3) {
  throw new Error('Manifest must use version 3.');
}
if (manifest.permissions?.some((permission) => ['tabs', 'history', 'bookmarks', 'management'].includes(permission))) {
  throw new Error('Manifest includes an unnecessary permission.');
}
if (!manifest.content_scripts?.[0]?.matches?.includes('<all_urls>')) {
  throw new Error('Content script must be configured for supported websites.');
}

console.log('Build verification passed: Manifest V3 and required files are present.');
