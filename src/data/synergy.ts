// 팀 조합(시너지): 같은 무리의 고양이가 함께 출전하면 보너스
export type SynergyId = 'kosho' | 'fluffy' | 'hunter' | 'guard' | 'rush';
export interface SynergyDef {
  id: SynergyId;
  name: string;
  icon: string;
  color: string;
  members: string[];
  /** [필요 마릿수, 효과 값, 설명] — 높은 단계가 낮은 단계를 대체 */
  tiers: [number, number, string][];
}

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'kosho', name: '코숏 패밀리', icon: '🏠', color: '#ffb347',
    members: ['cheese', 'godeungeo', 'huindungi', 'chaos', 'cheesetabby', 'tuxedo', 'samsaek', 'cow'],
    tiers: [[2, 0.1, '모든 고양이 공격력 +10%'], [4, 0.25, '모든 고양이 공격력 +25%']],
  },
  {
    id: 'fluffy', name: '복슬복슬', icon: '☁️', color: '#bfe6ff',
    members: ['huindungi', 'persian', 'mainecoon', 'norwegian', 'ragdoll'],
    tiers: [[2, 0.006, '바리케이드가 1초마다 0.6% 회복'], [3, 0.015, '바리케이드가 1초마다 1.5% 회복']],
  },
  {
    id: 'hunter', name: '사냥꾼', icon: '🎯', color: '#7dff9a',
    members: ['tuxedo', 'russianblue', 'siamese', 'americanshort', 'bengal', 'abyssinian'],
    tiers: [[2, 0.12, '공격 속도 +12%'], [3, 0.25, '공격 속도 +25%']],
  },
  {
    id: 'guard', name: '수호대', icon: '🛡️', color: '#c9c9ff',
    members: ['godeungeo', 'scottish', 'mainecoon', 'ragdoll', 'samsaek', 'persian'],
    tiers: [[2, 0.1, '바리케이드가 받는 피해 -10%'], [3, 0.2, '바리케이드가 받는 피해 -20%']],
  },
  {
    id: 'rush', name: '돌격대', icon: '⚡', color: '#ff8fb4',
    members: ['chaos', 'cheesetabby', 'munchkin', 'cow', 'norwegian', 'sphynx'],
    tiers: [[2, 0.2, '필살기 대기 시간 -20%'], [3, 0.35, '필살기 대기 시간 -35%']],
  },
];

export const SYN_BY_ID = Object.fromEntries(SYNERGIES.map((s) => [s.id, s])) as Record<SynergyId, SynergyDef>;

/** 고양이가 속한 시너지들 */
export function synergiesOf(catId: string): SynergyDef[] {
  return SYNERGIES.filter((s) => s.members.includes(catId));
}

export interface ActiveSynergy { def: SynergyDef; count: number; tier: number; value: number }

/** 출전 중인 고양이 목록 → 시너지 상태 (tier -1 = 아직 미달성) */
export function synergyState(ids: string[]): ActiveSynergy[] {
  return SYNERGIES.map((def) => {
    const count = ids.filter((id) => def.members.includes(id)).length;
    let tier = -1;
    def.tiers.forEach(([need], i) => { if (count >= need) tier = i; });
    return { def, count, tier, value: tier >= 0 ? def.tiers[tier][1] : 0 };
  });
}
