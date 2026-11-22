// "그래서 뭘 하면 돼?" — 지금 상황에서 가장 도움이 되는 다음 행동을 골라 준다
import { CATS, HERO_ID } from '../data/cats';
import { PULL_COST, today } from './gacha';
import { canLevelUp, canStarUp } from './progression';
import { dailyPending } from './daily';
import { itemStat } from './items';
import type { SaveData } from './save';

export interface Advice {
  text: string;
  /** 누르면 갈 곳 (로비 탭/행동) */
  act: string;
  arg?: string;
  /** 높을수록 먼저 */
  score: number;
}

/** 장착한 것보다 좋은 장비가 가방에 있는 부위 수 */
function betterGear(save: SaveData): number {
  let n = 0;
  const bySlot = new Map<string, number>();
  for (const it of save.items) bySlot.set(it.slot, Math.max(bySlot.get(it.slot) ?? 0, itemStat(it)));
  for (const [slot, best] of bySlot) {
    const uid = save.equip[slot as keyof typeof save.equip];
    const cur = save.items.find((i) => i.uid === uid);
    if (!cur || itemStat(cur) < best) n++;
  }
  return n;
}

/** 로비용 추천 (점수순) */
export function lobbyAdvice(save: SaveData): Advice[] {
  const out: Advice[] = [];
  if (dailyPending(save)) out.push({ text: '📋 출석·미션 보상을 받아요', act: 'daily', score: 90 });
  if (save.freeDay !== today()) out.push({ text: '🎁 오늘의 무료 상자를 열어요', act: 'tab', arg: 'shop', score: 85 });
  const star = CATS.find((c) => save.cats[c.id] && canStarUp(save, c.id).ok);
  if (star) out.push({ text: `⭐ ${star.name} 승급할 수 있어요`, act: 'goto-cat', arg: star.id, score: 80 });
  const gear = betterGear(save);
  if (gear) out.push({ text: `🎒 더 좋은 장비 ${gear}개를 끼울 수 있어요`, act: 'tab', arg: 'bag', score: 75 });
  if (canLevelUp(save, HERO_ID).ok) out.push({ text: '🪙 대장을 레벨 업할 코인이 있어요', act: 'goto-cat', arg: HERO_ID, score: 70 });
  else {
    const lv = CATS.find((c) => save.cats[c.id] && canLevelUp(save, c.id).ok);
    if (lv) out.push({ text: `🪙 ${lv.name} 레벨 업할 코인이 있어요`, act: 'goto-cat', arg: lv.id, score: 60 });
  }
  if (save.tuna >= PULL_COST) out.push({ text: '🐟 참치로 새 고양이를 만나요', act: 'tab', arg: 'shop', score: 55 });
  return out.sort((a, b) => b.score - a.score);
}

/** 패배했을 때: 전투 중에 놓친 것 + 로비에서 할 수 있는 것 */
export function defeatAdvice(save: SaveData, battle: { ultUses: number; rallyUses: number; aimUsed: boolean; progress: number }): string[] {
  const tips: string[] = [];
  if (battle.ultUses === 0) tips.push('왼쪽 고양이 얼굴을 누르면 필살기! 위험할 때 써 봐요');
  if (battle.rallyUses === 0) tips.push('오른쪽 아래 응원 버튼으로 바리케이드를 회복해요');
  if (!battle.aimUsed) tips.push('화면을 꾹 누르면 대장이 그쪽을 집중 공격해요');
  for (const a of lobbyAdvice(save)) {
    if (a.act === 'daily') continue;
    tips.push(a.text.replace(/^\S+\s/, '') + ' → 로비에서');
  }
  if (tips.length < 2) tips.push('이전 스테이지를 다시 깨서 코인·장비를 모아 와요');
  return tips.slice(0, 2);
}
