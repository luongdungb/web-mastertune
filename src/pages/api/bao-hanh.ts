// POST { serial } -> warranty status. Server-only so the full serial list is never exposed.
import type { APIRoute } from 'astro';
import { findWarranty, parseVnDate } from '../../lib/server/warranty';
import { tooManyAttempts } from '../../lib/server/dealer-auth';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (tooManyAttempts(`warranty:${clientAddress ?? 'unknown'}`, 30)) {
    return json({ error: 'Tra cứu quá nhiều lần. Thử lại sau ít phút.' }, 429);
  }
  let serial = '';
  try { serial = String((await request.json()).serial ?? '').trim(); } catch {}
  if (serial.length < 4 || serial.length > 40) return json({ error: 'Số serial không hợp lệ.' }, 400);

  const rec = await findWarranty(serial);
  if (rec === 'unavailable') return json({ error: 'Hệ thống tra cứu đang bảo trì. Vui lòng gọi hotline.' }, 503);
  if (!rec) return json({ found: false });
  const exp = parseVnDate(rec.expires);
  return json({
    found: true,
    serial: rec.serial,
    product: rec.product,
    dealer: rec.dealer,
    activated: rec.activated,
    expires: rec.expires,
    active: exp ? exp.getTime() >= Date.now() : null,
  });
};
