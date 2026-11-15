import { HERO_ID } from '../data/cats';
import { STAGES, type StageDef } from '../data/stages';
import type { BattleResult } from '../game';
import { HERO_SHARDS_PER_CLEAR } from './progression';
import type { SaveData } from './save';

export interface Reward { coins: number; tuna: number; heroShards: number; firstClear: boolean; newStars: number; }

export function isUnlocked(save: SaveData, stage: StageDef): boolean {
  if (stage.no === 1) return true;
  const prev = STAGES[stage.no - 2];
  return (save.stages[prev.id] ?? 0) > 0;
}

export function applyResult(save: SaveData, stage: StageDef, res: BattleResult, wavesReached: number): Reward {
  const prevStars = save.stages[stage.id] ?? 0;
  if (!res.victory) {
    const coins = Math.round(stage.reward.coins * 0.15 * (wavesReached / stage.waves.length));
    save.coins += coins;
    return { coins, tuna: 0, heroShards: 0, firstClear: false, newStars: 0 };
  }
  const firstClear = prevStars === 0;
  const newStars = Math.max(0, res.stars - prevStars);
  const coins = firstClear ? stage.reward.coins : Math.round(stage.reward.coins * 0.4);
  const tuna = (firstClear ? stage.reward.tuna : 0) + newStars * 20;
  const heroShards = HERO_SHARDS_PER_CLEAR;
  save.coins += coins;
  save.tuna += tuna;
  save.cats[HERO_ID].shards += heroShards;
  save.stages[stage.id] = Math.max(prevStars, res.stars);
  return { coins, tuna, heroShards, firstClear, newStars };
}
