// 출석 보상 + 일일 미션: 매일 들어올 이유
import type { DailyState, SaveData } from './save';
import { today } from './gacha';

export type MissionKind = 'battle' | 'win' | 'kill' | 'ad' | 'levelup' | 'gacha' | 'ult';

export interface MissionDef { id: string; kind: MissionKind; goal: number; text: string; tuna: number; coins: number }

export const MISSIONS: MissionDef[] = [
  { id: 'battle3', kind: 'battle', goal: 3, text: '전투 3번 하기', tuna: 30, coins: 300 },
  { id: 'win2', kind: 'win', goal: 2, text: '스테이지 2번 이기기', tuna: 40, coins: 300 },
  { id: 'kill300', kind: 'kill', goal: 300, text: '적 300마리 물리치기', tuna: 30, coins: 400 },
  { id: 'kill600', kind: 'kill', goal: 600, text: '적 600마리 물리치기', tuna: 50, coins: 600 },
  { id: 'ad1', kind: 'ad', goal: 1, text: '광고 보고 보상 1번 받기', tuna: 40, coins: 200 },
  { id: 'lv3', kind: 'levelup', goal: 3, text: '고양이 레벨 업 3번', tuna: 30, coins: 0 },
  { id: 'gacha1', kind: 'gacha', goal: 1, text: '상자 뽑기 1번', tuna: 20, coins: 300 },
  { id: 'ult5', kind: 'ult', goal: 5, text: '필살기 5번 쓰기', tuna: 30, coins: 300 },
];
export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));
/** 오늘 미션 3개를 다 하면 추가 보상 */
export const ALL_CLEAR_TUNA = 60;

/** 출석 7일 보상 (7일 다 받으면 처음부터) */
export const ATTEND: { coins?: number; tuna?: number; yarn?: number; label: string }[] = [
  { coins: 500, label: '코인 500' },
  { tuna: 50, label: '참치 50' },
  { yarn: 20, label: '털실 20' },
  { coins: 1000, label: '코인 1000' },
  { tuna: 100, label: '참치 100' },
  { yarn: 40, coins: 1000, label: '털실 40 + 코인 1000' },
  { tuna: 300, label: '참치 300' },
];

/** 날짜로 정해지는 간단한 난수 (같은 날엔 같은 미션) */
function seeded(day: string): () => number {
  let x = 0;
  for (const c of day) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}

/** 오늘 상태 (날이 바뀌었으면 새 미션) */
export function daily(save: SaveData): DailyState {
  const d = today();
  const cur = save.daily;
  if (cur && cur.day === d) return cur;
  const rnd = seeded(d);
  // 광고 미션은 매일 하나 넣고(첫 판 뒤부터), 나머지 둘은 무작위
  const pool = MISSIONS.filter((m) => m.kind !== 'ad');
  const picks: string[] = [];
  while (picks.length < 2) {
    const m = pool[Math.floor(rnd() * pool.length)];
    if (!picks.some((p) => MISSION_BY_ID[p].kind === m.kind)) picks.push(m.id);
  }
  picks.push('ad1');
  save.daily = { day: d, missions: picks.map((id) => ({ id, prog: 0, done: false })), bonusDone: false, att: cur?.att ?? 0, attDay: cur?.attDay ?? '' };
  return save.daily;
}

/** 미션 진행 올리기 */
export function bump(save: SaveData, kind: MissionKind, n = 1): void {
  const st = daily(save);
  for (const m of st.missions) {
    const def = MISSION_BY_ID[m.id];
    if (def && def.kind === kind && !m.done) m.prog = Math.min(def.goal, m.prog + n);
  }
}

export function canClaimMission(save: SaveData, i: number): boolean {
  const m = daily(save).missions[i];
  return !!m && !m.done && m.prog >= MISSION_BY_ID[m.id].goal;
}

export function claimMission(save: SaveData, i: number): MissionDef | null {
  if (!canClaimMission(save, i)) return null;
  const m = daily(save).missions[i];
  const def = MISSION_BY_ID[m.id];
  m.done = true;
  save.tuna += def.tuna;
  save.coins += def.coins;
  return def;
}

export function canClaimBonus(save: SaveData): boolean {
  const st = daily(save);
  return !st.bonusDone && st.missions.every((m) => m.done);
}

export function claimBonus(save: SaveData): boolean {
  if (!canClaimBonus(save)) return false;
  daily(save).bonusDone = true;
  save.tuna += ALL_CLEAR_TUNA;
  return true;
}

export function canAttend(save: SaveData): boolean {
  return daily(save).attDay !== today();
}

/** 출석 보상 받기 → 받은 칸 번호(0~6) */
export function attend(save: SaveData): number | null {
  if (!canAttend(save)) return null;
  const st = daily(save);
  const idx = st.att % ATTEND.length;
  const r = ATTEND[idx];
  save.coins += r.coins ?? 0;
  save.tuna += r.tuna ?? 0;
  save.yarn += r.yarn ?? 0;
  st.att += 1;
  st.attDay = today();
  return idx;
}

/** 로비 빨간 점: 받을 게 있는지 */
export function dailyPending(save: SaveData): boolean {
  const st = daily(save);
  return canAttend(save) || st.missions.some((_, i) => canClaimMission(save, i)) || canClaimBonus(save);
}
