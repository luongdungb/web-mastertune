// The visitor's draft system ("cấu hình") and compare list, kept in localStorage.
// Pages listen for `mt:config` / `mt:compare` events to stay in sync.
const CONFIG_KEY = 'mt:config';
const COMPARE_KEY = 'mt:compare';
export const COMPARE_MAX = 3;

export type ConfigItem = { slug: string; qty: number };

const read = <T>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T; } catch { return fallback; }
};
const write = (key: string, value: unknown, event: string) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(event));
};

export const getConfig = (): ConfigItem[] => read<ConfigItem[]>(CONFIG_KEY, []);
export const setConfig = (items: ConfigItem[]) => write(CONFIG_KEY, items.filter((i) => i.qty > 0), 'mt:config');
export const inConfig = (slug: string) => getConfig().some((i) => i.slug === slug);
export function addToConfig(slug: string, qty = 1) {
  const items = getConfig();
  const found = items.find((i) => i.slug === slug);
  if (found) found.qty += qty; else items.push({ slug, qty });
  setConfig(items);
}
export const removeFromConfig = (slug: string) => setConfig(getConfig().filter((i) => i.slug !== slug));
export const configCount = () => getConfig().reduce((n, i) => n + i.qty, 0);

export const getCompare = (): string[] => read<string[]>(COMPARE_KEY, []);
export const setCompare = (slugs: string[]) => write(COMPARE_KEY, slugs.slice(0, COMPARE_MAX), 'mt:compare');
export function toggleCompare(slug: string): 'added' | 'removed' | 'full' {
  const list = getCompare();
  if (list.includes(slug)) { setCompare(list.filter((s) => s !== slug)); return 'removed'; }
  if (list.length >= COMPARE_MAX) return 'full';
  setCompare([...list, slug]);
  return 'added';
}

// keep tabs in sync
window.addEventListener('storage', (e) => {
  if (e.key === CONFIG_KEY) window.dispatchEvent(new CustomEvent('mt:config'));
  if (e.key === COMPARE_KEY) window.dispatchEvent(new CustomEvent('mt:compare'));
});
