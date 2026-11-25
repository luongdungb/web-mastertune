// Warranty records from a CSV kept on the server (never served as a static file).
// Columns (header row required): serial,product,dealer,activated,expires
// Dates as dd/mm/yyyy. Only these fields are ever returned to visitors — keep customer
// personal data (names, phones) out of this file.
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { WARRANTY_FILE } from 'astro:env/server';

export type WarrantyRecord = { serial: string; product: string; dealer: string; activated: string; expires: string };

const FILE = resolve(process.cwd(), WARRANTY_FILE || 'private/warranty.csv');
let cache: { mtime: number; map: Map<string, WarrantyRecord> } | null = null;

export const normSerial = (s: string) => s.toUpperCase().replace(/[\s\-_.]/g, '');

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === ';') { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some((x) => x)) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x)) rows.push(row);
  return rows;
}

async function load(): Promise<Map<string, WarrantyRecord>> {
  const s = await stat(FILE);
  if (cache && cache.mtime === s.mtimeMs) return cache.map;
  const rows = parseCsv((await readFile(FILE, 'utf8')).replace(/^﻿/, ''));
  const head = (rows.shift() ?? []).map((h) => h.toLowerCase());
  const col = (name: string) => head.indexOf(name);
  const map = new Map<string, WarrantyRecord>();
  for (const r of rows) {
    const serial = r[col('serial')] ?? '';
    if (!serial) continue;
    map.set(normSerial(serial), {
      serial, product: r[col('product')] ?? '', dealer: r[col('dealer')] ?? '',
      activated: r[col('activated')] ?? '', expires: r[col('expires')] ?? '',
    });
  }
  cache = { mtime: s.mtimeMs, map };
  return map;
}

export async function findWarranty(serial: string): Promise<WarrantyRecord | null | 'unavailable'> {
  try {
    return (await load()).get(normSerial(serial)) ?? null;
  } catch {
    return 'unavailable';
  }
}

/** dd/mm/yyyy -> Date (end of that day), or null */
export function parseVnDate(s: string): Date | null {
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 23, 59, 59) : null;
}
