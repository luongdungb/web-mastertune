// Covers the generator's sparkle watermark in the landing film with a small MASTERTUNE logo.
//   node scripts/brand-hero.mjs
// Reads the untouched originals in assets-src/hero/ (hero.mp4, hero-mobile.webp) and writes
// public/video/hero.mp4, hero.webm, hero-poster.webp and hero-mobile.webp.
// The sparkle is first blended away (ffmpeg delogo), then the stacked logo goes on top of that spot.
// Coordinates are for the current 720x1280 film / 893x1600 photo; adjust them if those change.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');

const SRC = 'assets-src/hero', OUT = 'public/video', LOGO = 'public/brand/logo.png';
const ff = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

// film: sparkle pair at x 575-640, y 1135-1215
const filter = '[0:v]delogo=x=565:y=1128:w=85:h=95[v];'
  + '[1:v]scale=96:-1,format=rgba,colorchannelmixer=aa=0.92[l];'
  + '[v][l]overlay=x=560:y=1128:format=auto[o]';
ff('-i', `${SRC}/hero.mp4`, '-i', LOGO, '-filter_complex', filter, '-map', '[o]', '-an',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${OUT}/hero.mp4`);
ff('-i', `${OUT}/hero.mp4`, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '37', '-row-mt', '1', `${OUT}/hero.webm`);
const frame = execFileSync('ffmpeg', ['-v', 'error', '-i', `${OUT}/hero.mp4`, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 64e6 });
await sharp(frame).webp({ quality: 80 }).toFile(`${OUT}/hero-poster.webp`);

// phone photo: a single small sparkle at x 813-843, y 1518-1548. Phones crop that corner off,
// so it is only blended away (no logo there).
const png = execFileSync('ffmpeg', ['-v', 'error', '-i', `${SRC}/hero-mobile.webp`, '-vf', 'delogo=x=806:y=1511:w=44:h=44',
  '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 64e6 });
await sharp(png).webp({ quality: 82 }).toFile(`${OUT}/hero-mobile.webp`);
console.log('hero branded');
