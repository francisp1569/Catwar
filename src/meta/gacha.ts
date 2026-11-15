// 골판지 상자 뽑기
import { CATS, type CatDef, type Rarity } from '../data/cats';
import { DUPE_SHARDS } from './progression';
import type { SaveData } from './save';

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
