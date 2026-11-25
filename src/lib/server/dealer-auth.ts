// Dealer area session: one shared access code, a signed cookie, and a small brute-force guard.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { DEALER_ACCESS_CODE, SESSION_SECRET } from 'astro:env/server';

export const COOKIE = 'mt_dealer';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export const isConfigured = () => Boolean(DEALER_ACCESS_CODE && SESSION_SECRET);

const sign = (payload: string) => createHmac('sha256', SESSION_SECRET!).update(payload).digest('base64url');
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function codeMatches(input: string): boolean {
  if (!isConfigured()) return false;
  // case-insensitive, ignore spaces: codes are read out over the phone
  const norm = (s: string) => s.replace(/\s+/g, '').toUpperCase();
  return safeEqual(norm(input), norm(DEALER_ACCESS_CODE!));
}

export function startSession(cookies: AstroCookies, secure: boolean) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  // binding the code's hash means changing the code signs everyone out
  const payload = `${exp}.${sign(`code:${DEALER_ACCESS_CODE}`).slice(0, 12)}`;
  cookies.set(COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: MAX_AGE });
}

export function hasSession(cookies: AstroCookies): boolean {
  if (!isConfigured()) return false;
  const raw = cookies.get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, codeTag, mac] = raw.split('.');
  if (!exp || !codeTag || !mac) return false;
  const payload = `${exp}.${codeTag}`;
  if (!safeEqual(mac, sign(payload))) return false;
  if (codeTag !== sign(`code:${DEALER_ACCESS_CODE}`).slice(0, 12)) return false;
  return Number(exp) > Date.now() / 1000;
}

export const endSession = (cookies: AstroCookies) => cookies.delete(COOKIE, { path: '/' });

// --- tiny in-memory rate limiter (per client IP, per process)
const hits = new Map<string, { n: number; until: number }>();
export function tooManyAttempts(key: string, limit = 8, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.until < now) { hits.set(key, { n: 1, until: now + windowMs }); return false; }
  h.n++;
  return h.n > limit;
}
