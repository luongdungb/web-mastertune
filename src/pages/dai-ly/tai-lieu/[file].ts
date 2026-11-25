// Serves dealer documents from private/dealer-docs/ to signed-in dealers only.
import type { APIRoute } from 'astro';
import { readFile, stat } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { hasSession } from '../../../lib/server/dealer-auth';

export const prerender = false;

const DIR = resolve(process.cwd(), 'private', 'dealer-docs');
const TYPES: Record<string, string> = {
  '.pdf': 'application/pdf', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.jpg': 'image/jpeg', '.png': 'image/png', '.zip': 'application/zip',
};

export const GET: APIRoute = async ({ params, cookies }) => {
  if (!hasSession(cookies)) return new Response('Cần đăng nhập khu đại lý.', { status: 401 });
  const name = basename(decodeURIComponent(params.file ?? '')); // no directory traversal
  const type = TYPES[extname(name).toLowerCase()];
  if (!name || !type) return new Response('Không tìm thấy', { status: 404 });
  const path = join(DIR, name);
  try {
    await stat(path);
    return new Response(await readFile(path), {
      headers: { 'Content-Type': type, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(name)}`, 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return new Response('Không tìm thấy', { status: 404 });
  }
};
