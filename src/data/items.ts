// 집사 장비: 모든 고양이에게 적용되는 장비 6부위
import type { Rarity } from './cats';

export type Slot = 'collar' | 'hat' | 'toy' | 'cushion' | 'bowl' | 'bell';
export const SLOTS: Slot[] = ['collar', 'hat', 'toy', 'cushion', 'bowl', 'bell'];

export type StatKey = 'atk' | 'hp' | 'speed' | 'reduce' | 'xp' | 'coin';

export const SLOT_INFO: Record<Slot, { name: string; icon: string; stat: StatKey; statName: string; names: Record<Rarity, string> }> = {
  collar: { name: '목걸이', icon: '📿', stat: 'atk', statName: '공격력', names: { N: '면 목걸이', R: '방울 목걸이', SR: '진주 목걸이', SSR: '황금 츄르 목걸이' } },
  hat: { name: '모자', icon: '🎀', stat: 'hp', statName: '바리케이드 체력', names: { N: '털모자', R: '리본 머리띠', SR: '고양이 귀 후드', SSR: '왕관 머리띠' } },
  toy: { name: '장난감', icon: '🧸', stat: 'speed', statName: '공격 속도', names: { N: '종이 공', R: '쥐돌이 인형', SR: '깃털 막대', SSR: '자동 레이저 장난감' } },
  cushion: { name: '방석', icon: '🛏️', stat: 'reduce', statName: '받는 피해 감소', names: { N: '수건 방석', R: '극세사 방석', SR: '숨숨집', SSR: '구름 캣타워' } },
  bowl: { name: '밥그릇', icon: '🥣', stat: 'xp', statName: '전투 경험치', names: { N: '플라스틱 그릇', R: '도자기 그릇', SR: '자동 급식기', SSR: '참치 뷔페 그릇' } },
  bell: { name: '방울', icon: '🔔', stat: 'coin', statName: '코인 획득', names: { N: '작은 방울', R: '은방울', SR: '행운의 방울', SSR: '복고양이 방울' } },
};

/** Lv.1 기준 수치 (비율) */
export const BASE_STAT: Record<StatKey, Record<Rarity, number>> = {
  atk: { N: 0.04, R: 0.07, SR: 0.11, SSR: 0.16 },
  hp: { N: 0.05, R: 0.09, SR: 0.14, SSR: 0.2 },
  speed: { N: 0.03, R: 0.05, SR: 0.08, SSR: 0.12 },
  reduce: { N: 0.02, R: 0.04, SR: 0.06, SSR: 0.09 },
  xp: { N: 0.05, R: 0.08, SR: 0.12, SSR: 0.18 },
  coin: { N: 0.05, R: 0.1, SR: 0.15, SSR: 0.22 },
};

export const ITEM_MAX_LV: Record<Rarity, number> = { N: 10, R: 15, SR: 20, SSR: 30 };

/** 레벨당 증가 (Lv.1 대비) */
export const LV_GROWTH = 0.12;

export const NEXT_RARITY: Partial<Record<Rarity, Rarity>> = { N: 'R', R: 'SR', SR: 'SSR' };
