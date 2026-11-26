// Typed access to the catalog JSON (built by scripts/build-data.mjs).
import productsJson from '../data/products.json';
import brandsJson from '../data/brands.json';
import categoriesJson from '../data/categories.json';
import extrasJson from '../data/product-extras.json';

export type Spec = { k: string; v: string };
export type Product = {
  slug: string; name: string; brand: string; category: string; series: string; image: string;
  specs: Spec[]; install: string; warranty: string; source: string;
};
export type Brand = { slug: string; name: string; origin: string; logo: string | null; count: number };
export type Category = { slug: string; label: string; count: number };

export type GalleryImage = { src: string; thumb: string; w: number; h: number; alt: string };
export type ProductVideo = { src: string; poster: string; thumb: string };
type Extra = { specs?: Spec[]; install?: string; gallery?: GalleryImage[]; video?: ProductVideo };
// Hand-maintained data (scripts/import-media.mjs, manual specs) layered over the scraped catalog,
// so re-running the scraper never wipes it.
const extras = extrasJson as Record<string, Extra>;

export const products = (productsJson as Product[]).map((p) => {
  const e = extras[p.slug];
  return e ? { ...p, specs: e.specs ?? p.specs, install: e.install ?? p.install } : p;
});
export const mediaOf = (p: Product) => ({ gallery: extras[p.slug]?.gallery ?? [], video: extras[p.slug]?.video });
export const brands = brandsJson as Brand[];
export const categories = (categoriesJson as Category[]).filter((c) => c.count > 0);

const brandMap = new Map(brands.map((b) => [b.slug, b]));
const catMap = new Map(categories.map((c) => [c.slug, c]));
export const brandOf = (p: Product) => brandMap.get(p.brand)!;
export const categoryOf = (p: Product) => catMap.get(p.category);
export const getBrand = (slug: string) => brandMap.get(slug);

/** Up to `n` short specs for cards: prefer power / frequency / size / channels. */
export function keySpecs(p: Product, n = 2): Spec[] {
  const prio = [/công suất|power|rms/i, /kênh|channel/i, /tần|frequency/i, /kích thước|size|đường kính|inch/i, /trở kháng|impedance|ohm/i, /độ nhạy|sensitivity/i];
  const picked: Spec[] = [];
  for (const re of prio) {
    const s = p.specs.find((x) => re.test(x.k) && !picked.includes(x) && x.v.length <= 28);
    if (s) picked.push(s);
    if (picked.length >= n) break;
  }
  return picked;
}

/** Same category, same brand first, then same category. */
export function related(p: Product, n = 4): Product[] {
  const same = products.filter((x) => x.slug !== p.slug && x.category === p.category);
  return [...same.filter((x) => x.brand === p.brand), ...same.filter((x) => x.brand !== p.brand)].slice(0, n);
}
