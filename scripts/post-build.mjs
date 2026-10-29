// Post-build safety checks. Fails the build (exit 1) if the output would break the strict CSP
// or leak data that should not be public.
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const DIST = new URL('../dist/', import.meta.url).pathname;
const problems = [];

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /\+91[\s-]?\d{5}[\s-]?\d{5}/;
let html = 0;
let images = 0;

for await (const file of walk(DIST)) {
  const ext = extname(file).toLowerCase();
  const rel = file.slice(DIST.length);

  if (ext === '.html') {
    html++;
    const src = await readFile(file, 'utf8');
    // Inline style attributes are blocked by style-src without 'unsafe-inline'.
    const styleAttr = src.match(/<[a-z][^>]*\sstyle="[^"]*"/i);
    if (styleAttr) problems.push(`${rel}: inline style attribute (blocked by CSP): ${styleAttr[0].slice(0, 120)}`);
    // Inline event handlers are blocked by script-src without 'unsafe-inline'.
    const handler = src.match(/<[a-z][^>]*\son[a-z]+="/i);
    if (handler) problems.push(`${rel}: inline event handler (blocked by CSP): ${handler[0].slice(0, 120)}`);
    if (!src.includes('http-equiv="content-security-policy"')) problems.push(`${rel}: missing CSP <meta>`);
    if (EMAIL_RE.test(src.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ''))) {
      problems.push(`${rel}: plain e-mail address in HTML (${src.match(EMAIL_RE)[0]})`);
    }
    if (PHONE_RE.test(src)) problems.push(`${rel}: phone number in HTML`);
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) {
    images++;
    const meta = await sharp(file).metadata();
    // EXIF can contain GPS coordinates and camera serials; it must never ship.
    if (meta.exif) problems.push(`${rel}: image still contains EXIF metadata`);
  }
}

if (problems.length) {
  console.error(`\n✖ post-build checks failed (${problems.length}):\n  - ${problems.join('\n  - ')}\n`);
  process.exit(1);
}
console.log(`✔ post-build checks passed: ${html} HTML pages, ${images} images, no inline styles/handlers, no EXIF, no exposed e-mail/phone.`);
