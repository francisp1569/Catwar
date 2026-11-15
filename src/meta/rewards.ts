import { HERO_ID } from '../data/cats';
import { STAGES, type StageDef } from '../data/stages';
import type { BattleResult } from '../game';
import { bonuses, playerLevel, randomItem } from './items';
import { HERO_SHARDS_PER_CLEAR } from './progression';
import type { Item, SaveData } from './save';

export interface Reward {
  coins: number; tuna: number; yarn: number; exp: number; heroShards: number;
  firstClear: boolean; newStars: number; items: Item[];
  discovered: number;
  /** 집사 레벨이 올랐으면 [이전, 이후] */
  levelUp: [number, number] | null;
  levelTuna: number;
}

export const DISCOVER_TUNA = 10;

export function isUnlocked(save: SaveData, stage: StageDef): boolean {
  if (stage.no === 1) return true;
  const prev = STAGES[stage.no - 2];
  return (save.stages[prev.id] ?? 0) > 0;
}

export function applyResult(save: SaveData, stage: StageDef, res: BattleResult): Reward {
  const coinMul = 1 + bonuses(save).coin;
  const exp = Math.round(10 + res.kills * 0.3 + (res.victory ? 20 + stage.no * 5 : 0));
  const lvBefore = playerLevel(save.exp).level;
  save.exp += exp;
  const lvAfter = playerLevel(save.exp).level;
  const levelUp: [number, number] | null = lvAfter > lvBefore ? [lvBefore, lvAfter] : null;
  let levelTuna = 0;
  for (let l = lvBefore + 1; l <= lvAfter; l++) levelTuna += 30 + l * 10;
  save.tuna += levelTuna;
  const newSeen = res.discovered.filter((k) => !save.seen.includes(k));
  save.seen.push(...newSeen);
  save.tuna += newSeen.length * DISCOVER_TUNA;
  const extra = { discovered: newSeen.length, levelUp, levelTuna };
  const prevStars = save.stages[stage.id] ?? 0;
  if (!res.victory) {
    const coins = Math.round(stage.reward.coins * 0.2 * res.progress * coinMul);
    const yarn = Math.round(res.progress * 3);
    save.coins += coins;
    save.yarn += yarn;
    return { coins, tuna: 0, yarn, exp, heroShards: 0, firstClear: false, newStars: 0, items: [], ...extra };
  }
  const firstClear = prevStars === 0;
  const newStars = Math.max(0, res.stars - prevStars);
  const coins = Math.round((firstClear ? stage.reward.coins : stage.reward.coins * 0.4) * coinMul);
  const tuna = (firstClear ? stage.reward.tuna : 0) + newStars * 20;
  const yarn = 3 + stage.no + res.stars;
  const heroShards = HERO_SHARDS_PER_CLEAR;
  save.coins += coins;
  save.tuna += tuna;
  save.yarn += yarn;
  save.cats[HERO_ID].shards += heroShards;
  save.stages[stage.id] = Math.max(prevStars, res.stars);
  // 장비 드롭: 1개 + 별 3개면 1개 더 + 첫 클리어 1개 더
  const n = 1 + (res.stars >= 3 ? 1 : 0) + (firstClear ? 1 : 0);
  const items = Array.from({ length: n }, () => randomItem(save, stage.no));
  return { coins, tuna, yarn, exp, heroShards, firstClear, newStars, items, ...extra };
}
