// Short, silent, small loop of a product video for the home-page spotlight tiles.
//   node scripts/make-loop.mjs <slug> [startSeconds=3] [durationSeconds=10]
// Reads public/video/p/<slug>.mp4, writes public/video/p/<slug>-loop.mp4 (960px wide, no audio).
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

export function makeLoop(slug, start = 3, dur = 10) {
  const src = `public/video/p/${slug}.mp4`;
  const out = `public/video/p/${slug}-loop.mp4`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(start), '-t', String(dur), '-i', src,
    '-an', '-vf', 'scale=960:-2,fps=30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out]);
  return { src: `/video/p/${slug}-loop.mp4`, bytes: statSync(out).size };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('make-loop.mjs')) {
  const [slug, start, dur] = process.argv.slice(2);
  if (!slug) { console.error('usage: node scripts/make-loop.mjs <slug> [start] [duration]'); process.exit(1); }
  console.log(makeLoop(slug, Number(start ?? 3), Number(dur ?? 10)));
}
