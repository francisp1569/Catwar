// 레벨업 / 성급(별) 성장 규칙
import { CAT_BY_ID, RARITY_ORDER, type CatDef } from '../data/cats';
import { MAX_SKILL_LV } from '../data/skills';
import type { OwnedCat, SaveData } from './save';

export const MAX_STARS = MAX_SKILL_LV;
/** 다음 별로 올리는 데 필요한 조각 (index = 현재 별) */
export const STAR_COST = [0, 10, 20, 40, 60];
/** 중복 획득 시 얻는 조각 */
export const DUPE_SHARDS = 10;

export function levelCap(stars: number): number {
  return 10 + stars * 10; // 1성 20, 5성 60
}

export function levelUpCost(def: CatDef, level: number): number {
  const rarityMul = 1 + RARITY_ORDER.indexOf(def.rarity) * 0.3;
  return Math.round(25 * level * rarityMul);
}

export function statMul(o: OwnedCat): number {
  return (1 + 0.12 * (o.level - 1)) * (1 + 0.1 * (o.stars - 1));
}

export function catStats(def: CatDef, o: OwnedCat): { hp: number; atk: number } {
  const m = statMul(o);
  return { hp: Math.round(def.hp * m), atk: Math.round(def.atk * m) };
}

export type GrowResult = { ok: true } | { ok: false; reason: string };

export function canLevelUp(save: SaveData, id: string): GrowResult {
  const o = save.cats[id];
  const def = CAT_BY_ID[id];
  if (!o || !def) return { ok: false, reason: '보유하지 않은 고양이' };
  if (o.level >= levelCap(o.stars)) return { ok: false, reason: `레벨 상한 (별을 올리면 상한 증가)` };
  if (save.coins < levelUpCost(def, o.level)) return { ok: false, reason: '코인 부족' };
  return { ok: true };
}

export function levelUp(save: SaveData, id: string): boolean {
  if (!canLevelUp(save, id).ok) return false;
  const o = save.cats[id];
  save.coins -= levelUpCost(CAT_BY_ID[id], o.level);
  o.level++;
  return true;
}

export function canStarUp(save: SaveData, id: string): GrowResult {
  const o = save.cats[id];
  if (!o) return { ok: false, reason: '보유하지 않은 고양이' };
  if (o.stars >= MAX_STARS) return { ok: false, reason: '최대 성급' };
  if (o.shards < STAR_COST[o.stars]) return { ok: false, reason: '조각 부족' };
  return { ok: true };
}

export function starUp(save: SaveData, id: string): boolean {
  if (!canStarUp(save, id).ok) return false;
  const o = save.cats[id];
  o.shards -= STAR_COST[o.stars];
  o.stars++;
  return true;
}

/** 주인공 '치즈'는 뽑기에 나오지 않으므로 스테이지 클리어 시 조각을 얻는다 */
export const HERO_SHARDS_PER_CLEAR = 3;
