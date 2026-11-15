// 고양이 스킬 정의. lv은 성급(1~5)과 같다.
export type SkillKind =
  | 'rally' | 'shield' | 'crit' | 'heal' | 'knockback'
  | 'cleave' | 'slow' | 'stun' | 'frenzy' | 'pierce' | 'aura';

export const MAX_SKILL_LV = 5;

export const skill = {
  /** 주인공 액티브: 아군 전체 회복 + 공격력 증가 */
  rally: (lv: number) => ({ heal: 0.15 + 0.05 * lv, atk: 0.2 + 0.06 * lv, dur: 6, cd: 30 - 2 * lv }),
  /** 받는 피해 감소 */
  shield: (lv: number) => ({ reduce: 0.15 + 0.05 * lv }),
  /** 치명타 확률 / 배율 */
  crit: (lv: number) => ({ chance: 0.2 + 0.05 * lv, mult: 2 + 0.1 * lv }),
  /** 주기적으로 가장 다친 아군 회복 */
  heal: (lv: number) => ({ every: 5, mult: 1.6 + 0.4 * lv, radius: 260 }),
  /** N번째 공격마다 강타 + 밀쳐내기 */
  knockback: (lv: number) => ({ every: 3, push: 36 + 6 * lv, mult: 1.4 + 0.15 * lv }),
  /** N번째 공격마다 주변 광역 강타 */
  cleave: (lv: number) => ({ every: 3, radius: 75, mult: 1.5 + 0.25 * lv }),
  /** 적중 시 이동/공격 속도 감소 */
  slow: (lv: number) => ({ amount: 0.3 + 0.05 * lv, dur: 2 }),
  /** N번째 공격마다 기절 */
  stun: (lv: number) => ({ every: 4, dur: 0.8 + 0.2 * lv }),
  /** 체력이 절반 이하일 때 공격 속도 폭주 */
  frenzy: (lv: number) => ({ threshold: 0.5, speed: 1.6 + 0.15 * lv }),
  /** N번째 공격마다 사거리 안의 모든 적 공격 */
  pierce: (lv: number) => ({ every: 3, mult: 1 + 0.2 * lv }),
  /** 주변 아군 공격력 증가 */
  aura: (lv: number) => ({ radius: 170, atk: 0.1 + 0.04 * lv }),
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const SKILL_INFO: Record<SkillKind, { icon: string; desc: (lv: number) => string }> = {
  rally: { icon: '📣', desc: (lv) => { const s = skill.rally(lv); return `[액티브] 모든 아군 체력 ${pct(s.heal)} 회복, ${s.dur}초간 공격력 +${pct(s.atk)} (재사용 ${s.cd}초)`; } },
  shield: { icon: '🛡️', desc: (lv) => `받는 피해 ${pct(skill.shield(lv).reduce)} 감소` },
  crit: { icon: '💥', desc: (lv) => { const s = skill.crit(lv); return `${pct(s.chance)} 확률로 ${s.mult.toFixed(1)}배 치명타`; } },
  heal: { icon: '💗', desc: (lv) => { const s = skill.heal(lv); return `${s.every}초마다 가장 다친 아군을 공격력의 ${s.mult.toFixed(1)}배만큼 회복`; } },
  knockback: { icon: '💨', desc: (lv) => { const s = skill.knockback(lv); return `${s.every}번째 공격마다 ${s.mult.toFixed(2)}배 피해 + 적을 밀쳐냄`; } },
  cleave: { icon: '🌀', desc: (lv) => { const s = skill.cleave(lv); return `${s.every}번째 공격마다 주변 적 모두에게 ${s.mult.toFixed(2)}배 피해`; } },
  slow: { icon: '❄️', desc: (lv) => { const s = skill.slow(lv); return `적중한 적의 속도 ${pct(s.amount)} 감소 (${s.dur}초)`; } },
  stun: { icon: '💫', desc: (lv) => { const s = skill.stun(lv); return `${s.every}번째 공격마다 적을 ${s.dur.toFixed(1)}초 기절`; } },
  frenzy: { icon: '🔥', desc: (lv) => { const s = skill.frenzy(lv); return `체력 50% 이하일 때 공격 속도 ${s.speed.toFixed(2)}배`; } },
  pierce: { icon: '🎯', desc: (lv) => { const s = skill.pierce(lv); return `${s.every}번째 공격마다 사거리 안 모든 적에게 ${s.mult.toFixed(1)}배 피해`; } },
  aura: { icon: '✨', desc: (lv) => { const s = skill.aura(lv); return `주변 아군 공격력 +${pct(s.atk)}`; } },
};
