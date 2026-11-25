// Static, cacheable catalog for client-side tools (system builder, compare).
// Built at deploy time — no server needed.
import type { APIRoute } from 'astro';
import { products, brandOf, categoryOf, keySpecs } from '../../lib/catalog';

export type ClientProduct = {
  s: string;            // slug
  n: string;            // name
  b: string;            // brand name
  bs: string;           // brand slug
  c: string;            // category slug
  cl: string;           // category label
  i: string;            // image
  k: [string, string][]; // short key specs
  sp: [string, string][]; // all specs
  w: string;            // warranty
  ins: string;          // install position
};

export const GET: APIRoute = () => {
  const data: ClientProduct[] = products.map((p) => ({
    s: p.slug,
    n: p.name,
    b: brandOf(p).name,
    bs: p.brand,
    c: p.category,
    cl: categoryOf(p)?.label ?? '',
    i: p.image,
    k: keySpecs(p, 2).map((x) => [x.k, x.v]),
    sp: p.specs.map((x) => [x.k, x.v]),
    w: p.warranty,
    ins: p.install,
  }));
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
