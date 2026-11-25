// Loads the static catalog once per page (see src/pages/data/catalog.json.ts).
import type { ClientProduct } from '../pages/data/catalog.json';
export type { ClientProduct };

let cache: Promise<Map<string, ClientProduct>> | null = null;
export function loadCatalog(): Promise<Map<string, ClientProduct>> {
  cache ??= fetch('/data/catalog.json')
    .then((r) => { if (!r.ok) throw new Error(`catalog ${r.status}`); return r.json() as Promise<ClientProduct[]>; })
    .then((list) => new Map(list.map((p) => [p.s, p])));
  return cache;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Accent-insensitive lowercase for Vietnamese search. */
export const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
