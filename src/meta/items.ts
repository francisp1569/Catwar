// 장비 규칙: 획득, 장착, 강화, 합성, 분해, 전투 보너스, 도감 보너스, 집사 레벨, 낮잠 보상
import { CATS, RARITY_ORDER, type Rarity } from '../data/cats';
import { BASE_STAT, ITEM_MAX_LV, LV_GROWTH, NEXT_RARITY, SLOTS, SLOT_INFO, type Slot, type StatKey } from '../data/items';
import { STAGES } from '../data/stages';
import type { Item, SaveData } from './save';

export function itemStat(it: Item): number {
  return BASE_STAT[SLOT_INFO[it.slot].stat][it.rarity] * (1 + LV_GROWTH * (it.level - 1));
}

export function itemName(it: Item): string {
  return SLOT_INFO[it.slot].names[it.rarity];
}

export function fmtStat(v: number): string {
  return `+${(v * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

const RMUL: Record<Rarity, number> = { N: 1, R: 1.6, SR: 2.6, SSR: 4 };

export function itemUpCost(it: Item): { coins: number; yarn: number } {
  return { coins: Math.round(40 * it.level * RMUL[it.rarity]), yarn: Math.ceil(it.level * RMUL[it.rarity]) };
}

export type Result = { ok: true } | { ok: false; reason: string };

export function canItemUp(save: SaveData, it: Item): Result {
  if (it.level >= ITEM_MAX_LV[it.rarity]) return { ok: false, reason: '최대 레벨이에요. 합성으로 등급을 올려보세요' };
  const c = itemUpCost(it);
  if (save.coins < c.coins) return { ok: false, reason: '코인이 부족해요' };
  if (save.yarn < c.yarn) return { ok: false, reason: '털실이 부족해요 (장비 분해로 얻을 수 있어요)' };
  return { ok: true };
}

export function itemUp(save: SaveData, it: Item): boolean {
  if (!canItemUp(save, it).ok) return false;
  const c = itemUpCost(it);
  save.coins -= c.coins;
  save.yarn -= c.yarn;
  it.level++;
  return true;
}

export function isEquipped(save: SaveData, it: Item): boolean {
  return save.equip[it.slot] === it.uid;
}

export function equip(save: SaveData, it: Item): void {
  save.equip[it.slot] = it.uid;
}

export function unequip(save: SaveData, it: Item): void {
  if (isEquipped(save, it)) delete save.equip[it.slot];
}

export function dismantleValue(it: Item): number {
  return Math.round((2 + it.level) * RMUL[it.rarity]);
}

export function dismantle(save: SaveData, it: Item): number {
  if (isEquipped(save, it)) return 0;
  const v = dismantleValue(it);
  save.items = save.items.filter((i) => i !== it);
  save.yarn += v;
  return v;
}

export function newItem(save: SaveData, slot: Slot, rarity: Rarity): Item {
  const it: Item = { uid: save.nextItemUid++, slot, rarity, level: 1 };
  save.items.push(it);
  // 빈 부위면 자동 장착
  if (save.equip[slot] === undefined) save.equip[slot] = it.uid;
  return it;
}

/** 같은 부위·같은 등급 미장착 장비 3개 → 한 단계 높은 등급 1개 */
export function mergeAll(save: SaveData): Item[] {
  const made: Item[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const slot of SLOTS) {
      for (const r of RARITY_ORDER) {
        const next = NEXT_RARITY[r];
        if (!next) continue;
        const pool = save.items.filter((i) => i.slot === slot && i.rarity === r && !isEquipped(save, i)).sort((a, b) => a.level - b.level);
        while (pool.length >= 3) {
          const used = pool.splice(0, 3);
          const lv = Math.max(1, Math.floor(Math.max(...used.map((u) => u.level)) / 2));
          save.items = save.items.filter((i) => !used.includes(i));
          const it = newItem(save, slot, next);
          it.level = lv;
          made.push(it);
          changed = true;
        }
      }
    }
  }
  return made;
}

export function rollRarity(stageNo: number, rng = Math.random): Rarity {
  const r = rng();
  const ssr = 0.01 + stageNo * 0.004;
  const sr = 0.06 + stageNo * 0.012;
  const rr = 0.25 + stageNo * 0.02;
  if (r < ssr) return 'SSR';
  if (r < ssr + sr) return 'SR';
  if (r < ssr + sr + rr) return 'R';
  return 'N';
}

export function randomItem(save: SaveData, stageNo: number): Item {
  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  return newItem(save, slot, rollRarity(stageNo));
}

export interface Bonus { atk: number; hp: number; speed: number; reduce: number; xp: number; coin: number; collection: number; }

/** 도감 보너스: 모은 고양이 1마리당 공격력 +2%, 추가 별 1개당 +1% */
export function collectionBonus(save: SaveData): number {
  let v = 0;
  for (const c of CATS) {
    const o = save.cats[c.id];
    if (!o) continue;
    v += 0.02 + 0.01 * (o.stars - 1);
  }
  return v;
}

export function bonuses(save: SaveData): Bonus {
  const b: Bonus = { atk: 0, hp: 0, speed: 0, reduce: 0, xp: 0, coin: 0, collection: collectionBonus(save) };
  for (const slot of SLOTS) {
    const uid = save.equip[slot];
    const it = save.items.find((i) => i.uid === uid);
    if (it) b[SLOT_INFO[slot].stat as StatKey] += itemStat(it);
  }
  return b;
}

// ───────────── 집사 레벨 ─────────────
export function playerLevel(exp: number): { level: number; cur: number; need: number } {
  let level = 1;
  let need = 60;
  let e = exp;
  while (e >= need) { e -= need; level++; need = 60 + level * 40; }
  return { level, cur: e, need };
}

// ───────────── 낮잠 보상 (방치형) ─────────────
const NAP_MAX_H = 8;

export function napRate(save: SaveData): number {
  const cleared = STAGES.filter((s) => (save.stages[s.id] ?? 0) > 0).length;
  return 40 + cleared * 25; // 시간당 코인
}

export function napPending(save: SaveData, now = Date.now()): { coins: number; yarn: number; hours: number } {
  const hours = Math.min(NAP_MAX_H, Math.max(0, (now - save.napAt) / 3600000));
  return { coins: Math.floor(hours * napRate(save)), yarn: Math.floor(hours * 2), hours };
}

export function claimNap(save: SaveData): { coins: number; yarn: number } {
  const p = napPending(save);
  save.coins += p.coins;
  save.yarn += p.yarn;
  save.napAt = Date.now();
  return { coins: p.coins, yarn: p.yarn };
}

export const NAP_MAX_HOURS = NAP_MAX_H;
