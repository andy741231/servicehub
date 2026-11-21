// Renders the two manual HTML files to PDF using the installed Edge or Chrome.
// Usage: node docs/manuals/build.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(dir, 'pdf');
mkdirSync(outDir, { recursive: true });

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const browser = candidates.find(existsSync);
if (!browser) {
  console.error('No Edge or Chrome installation found.');
  process.exit(1);
}
console.log(`Using ${browser}`);

const jobs = [
  ['serving-ones-guide.html', 'Church-Directory-Serving-Ones-Guide.pdf'],
  ['saints-guide.html', 'Church-Directory-Saints-Guide.pdf'],
];

for (const [html, pdf] of jobs) {
  const input = pathToFileURL(path.join(dir, html)).href;
  const output = path.join(outDir, pdf);
  execFileSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--generate-pdf-document-outline',
      `--print-to-pdf=${output}`,
      input,
    ],
    { stdio: 'inherit', timeout: 120_000 },
  );
  console.log(`Wrote ${output}`);
}
