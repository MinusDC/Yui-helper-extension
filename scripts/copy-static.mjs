import { copyFile, mkdir } from 'node:fs/promises';

const files = [
  ['../src/manifest.json', '../dist/manifest.json'],
  ['../src/popup/popup.html', '../dist/popup.html'],
  ['../src/popup/popup.css', '../dist/popup.css'],
  ['../node_modules/kuromoji/build/kuromoji.js', '../dist/kuromoji.js']
];

await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await Promise.all(files.map(([source, destination]) =>
  copyFile(new URL(source, import.meta.url), new URL(destination, import.meta.url))
));
