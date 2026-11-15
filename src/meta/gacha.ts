// 골판지 상자 뽑기
import { CATS, type CatDef, type Rarity } from '../data/cats';
import { DUPE_SHARDS } from './progression';
import { SLOTS } from '../data/items';
import { newItem, rollRarity as rollItemRarity } from './items';
import type { Item, SaveData } from './save';

export const PULL_COST = 100;
export const PULL10_COST = 900;
export const RATES: Record<Rarity, number> = { N: 0.5, R: 0.35, SR: 0.12, SSR: 0.03 };

export interface PullResult { def: CatDef; isNew: boolean; shards: number; }

const POOL = CATS.filter((c) => !c.hero);

function rollRarity(rng: () => number, minSR: boolean): Rarity {
  let r = rng();
  if (minSR) {
    // 10연차 마지막 칸: SR 이상 확정
    return r < RATES.SSR / (RATES.SSR + RATES.SR) ? 'SSR' : 'SR';
  }
  for (const rar of ['SSR', 'SR', 'R'] as Rarity[]) {
    if (r < RATES[rar]) return rar;
    r -= RATES[rar];
  }
  return 'N';
}

export function pull(save: SaveData, count: 1 | 10, rng: () => number = Math.random): PullResult[] | null {
  const cost = count === 10 ? PULL10_COST : PULL_COST;
  if (save.tuna < cost) return null;
  save.tuna -= cost;
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(rng, count === 10 && i === 9);
    const candidates = POOL.filter((c) => c.rarity === rarity);
    const def = candidates[Math.floor(rng() * candidates.length)];
    const owned = save.cats[def.id];
    if (owned) {
      owned.shards += DUPE_SHARDS;
      results.push({ def, isNew: false, shards: DUPE_SHARDS });
    } else {
      save.cats[def.id] = { level: 1, stars: 1, shards: 0 };
      results.push({ def, isNew: true, shards: 0 });
    }
  }
  save.pulls += count;
  return results;
}

// ───────────── 장비 상자 ─────────────
export const ITEM_BOX_COST = 60;
export const ITEM_BOX10_COST = 540;

export function pullItems(save: SaveData, count: 1 | 10): Item[] | null {
  const cost = count === 10 ? ITEM_BOX10_COST : ITEM_BOX_COST;
  if (save.tuna < cost) return null;
  save.tuna -= cost;
  const best = Math.max(1, ...Object.keys(save.stages).map((id) => Number(id.slice(1))));
  return Array.from({ length: count }, (_, i) => {
    const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const r = count === 10 && i === 9 ? (Math.random() < 0.2 ? 'SSR' : 'SR') : rollItemRarity(best + 3);
    return newItem(save, slot, r);
  });
}

/** 하루 한 번 무료: 고양이 1회 + 장비 1개 */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function claimFree(save: SaveData): { cat: PullResult; item: Item } | null {
  if (save.freeDay === today()) return null;
  save.freeDay = today();
  save.tuna += PULL_COST;
  const cat = pull(save, 1)![0];
  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const item = newItem(save, slot, rollItemRarity(3));
  return { cat, item };
}
