// 고양이별 전투 스킬(무기). 전투 중 카드로 Lv.1(NEW)~Lv.5까지 성장한다.
export type WeaponKind =
  | 'bolt'   // 가장 앞의 적에게 투사체 발사
  | 'guard'  // 바리케이드 피해 감소 + 반사
  | 'dash'   // 적이 많은 줄을 따라 돌진
  | 'roll'   // 천천히 굴러가며 주변 지속 피해
  | 'snipe'  // 체력 높은 적 저격 (치명타)
  | 'heal'   // 바리케이드 수리
  | 'frost'  // 얼음 장판 (감속 + 지속 피해)
  | 'quake'  // 바리케이드 앞 충격파 (기절)
  | 'aura'   // 전체 공격력 증가
  | 'slam'   // 적이 몰린 곳에 거대 냥펀치
  | 'beam';  // 세로 줄 레이저

export interface WeaponParams {
  interval: number;   // 발동 간격(초)
  dmg: number;        // 공격력 배율
  count?: number;     // 동시 발사 수
  pierce?: number;    // 관통 수
  radius?: number;
  width?: number;
  crit?: number;
  critMul?: number;
  slow?: number;
  stun?: number;
  knock?: number;
  range?: number;
  reduce?: number;    // guard: 피해 감소
  thorns?: number;    // guard: 반사 배율
  repair?: number;    // heal: 최대 체력 대비 수리량
  buff?: number;      // aura: 공격력 증가
  speed?: number;     // 투사체 속도
}

export interface WeaponDef {
  kind: WeaponKind;
  icon: string;
  color: string;
  levels: WeaponParams[]; // index 0 = Lv.1
  desc: string[];         // desc[0] = 처음 얻을 때 설명, desc[i] = Lv.i+1 강화 내용
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const WEAPONS: Record<string, WeaponDef> = {
  cheese: {
    kind: 'bolt', icon: '🐾', color: '#ffb347',
    levels: [
      { interval: 0.55, dmg: 1.0, count: 1, speed: 720 },
      { interval: 0.55, dmg: 1.0, count: 2, speed: 720 },
      { interval: 0.55, dmg: 1.35, count: 2, speed: 720 },
      { interval: 0.55, dmg: 1.35, count: 3, speed: 720 },
      { interval: 0.4, dmg: 1.5, count: 3, pierce: 1, speed: 760 },
    ],
    desc: ['가장 가까운 적에게 발톱 펀치를 날린다.', '발톱 펀치 2발 동시 발사', '발톱 펀치 피해 +35%', '발톱 펀치 3발 동시 발사', '연사 속도 증가, 피해 증가, 1회 관통'],
  },
  godeungeo: {
    kind: 'guard', icon: '🛡️', color: '#9a9aa6',
    levels: [
      { interval: 0, dmg: 0, reduce: 0.15 },
      { interval: 0, dmg: 0, reduce: 0.22 },
      { interval: 0, dmg: 1.0, reduce: 0.27, thorns: 1.0 },
      { interval: 0, dmg: 1.0, reduce: 0.32, thorns: 1.6 },
      { interval: 0, dmg: 1.0, reduce: 0.4, thorns: 2.4 },
    ],
    desc: ['식빵 자세로 바리케이드를 지켜 받는 피해 15% 감소', '받는 피해 22% 감소', '피해 27% 감소 + 바리케이드를 때린 적에게 반격', '피해 32% 감소, 반격 강화', '피해 40% 감소, 반격 대폭 강화'],
  },
  huindungi: {
    kind: 'bolt', icon: '🧶', color: '#ff7eb6',
    levels: [
      { interval: 1.2, dmg: 1.3, count: 1, pierce: 2, speed: 520, radius: 9 },
      { interval: 1.2, dmg: 1.3, count: 2, pierce: 2, speed: 520, radius: 9 },
      { interval: 1.2, dmg: 1.3, count: 2, pierce: 5, speed: 520, radius: 11 },
      { interval: 1.0, dmg: 1.3, count: 3, pierce: 5, speed: 520, radius: 11 },
      { interval: 1.0, dmg: 2.0, count: 3, pierce: 8, speed: 560, radius: 13 },
    ],
    desc: ['적을 꿰뚫는 털뭉치를 던진다.', '털뭉치 2개 발사', '관통 횟수 증가, 털뭉치가 커짐', '털뭉치 3개 발사, 연사 증가', '털뭉치 피해 +50%, 관통 대폭 증가'],
  },
  chaos: {
    kind: 'dash', icon: '💨', color: '#c8742f',
    levels: [
      { interval: 4, dmg: 2.0, width: 46, knock: 50, count: 1 },
      { interval: 4, dmg: 2.7, width: 46, knock: 60, count: 1 },
      { interval: 3, dmg: 2.7, width: 46, knock: 60, count: 1 },
      { interval: 3, dmg: 2.7, width: 72, knock: 70, count: 1 },
      { interval: 3, dmg: 3.4, width: 72, knock: 80, count: 2 },
    ],
    desc: ['적이 가장 많은 줄로 우다다 돌진해 밀쳐낸다.', '돌진 피해 증가', '돌진 간격 단축', '돌진 폭 증가', '두 줄 동시 돌진, 피해 증가'],
  },
  cheesetabby: {
    kind: 'roll', icon: '🌀', color: '#f4a24c',
    levels: [
      { interval: 5, dmg: 0.55, radius: 36, speed: 90, count: 1 },
      { interval: 5, dmg: 0.55, radius: 50, speed: 90, count: 1 },
      { interval: 5, dmg: 0.85, radius: 50, speed: 90, count: 1 },
      { interval: 3.5, dmg: 0.85, radius: 54, speed: 90, count: 1 },
      { interval: 3.5, dmg: 1.0, radius: 58, speed: 95, count: 2 },
    ],
    desc: ['데굴데굴 굴러가며 닿는 적에게 계속 피해를 준다.', '회오리 범위 증가', '회오리 피해 증가', '발동 간격 단축', '회오리 2개 동시 발동'],
  },
  tuxedo: {
    kind: 'snipe', icon: '🎩', color: '#e8d23a',
    levels: [
      { interval: 1.6, dmg: 3.0, crit: 0.25, critMul: 2.5 },
      { interval: 1.6, dmg: 3.0, crit: 0.45, critMul: 2.5 },
      { interval: 1.6, dmg: 4.2, crit: 0.45, critMul: 2.5 },
      { interval: 1.05, dmg: 4.2, crit: 0.45, critMul: 2.5 },
      { interval: 1.05, dmg: 4.6, crit: 0.6, critMul: 3.2 },
    ],
    desc: ['체력이 가장 높은 적을 저격한다. (치명타 25%)', '치명타 확률 45%', '저격 피해 증가', '저격 간격 단축', '치명타 확률 60%, 치명타 피해 3.2배'],
  },
  samsaek: {
    kind: 'heal', icon: '💗', color: '#7dff9a',
    levels: [
      { interval: 5, dmg: 0, repair: 0.02 },
      { interval: 5, dmg: 0, repair: 0.03 },
      { interval: 4.5, dmg: 0, repair: 0.04 },
      { interval: 4.5, dmg: 0, repair: 0.05 },
      { interval: 3.5, dmg: 0, repair: 0.06 },
    ],
    desc: ['그루밍으로 5초마다 바리케이드 2% 수리', '수리량 3%', '수리량 4%, 간격 단축', '수리량 5%', '수리량 6%, 간격 대폭 단축'],
  },
  russianblue: {
    kind: 'frost', icon: '❄️', color: '#9fe3ff',
    levels: [
      { interval: 4, dmg: 0.35, radius: 70, slow: 0.4, range: 3 },
      { interval: 4, dmg: 0.35, radius: 70, slow: 0.55, range: 3 },
      { interval: 4, dmg: 0.35, radius: 92, slow: 0.55, range: 3.5 },
      { interval: 3, dmg: 0.5, radius: 92, slow: 0.55, range: 3.5 },
      { interval: 3, dmg: 0.7, radius: 100, slow: 0.65, range: 4 },
    ],
    desc: ['적이 몰린 곳에 얼음 장판을 깔아 느리게 만든다.', '감속 효과 증가', '장판 범위·지속시간 증가', '발동 간격 단축, 피해 증가', '감속·피해·범위 모두 증가'],
  },
  scottish: {
    kind: 'quake', icon: '💫', color: '#e9d3b4',
    levels: [
      { interval: 5, dmg: 1.5, range: 120, stun: 1.0 },
      { interval: 5, dmg: 1.5, range: 120, stun: 1.5 },
      { interval: 5, dmg: 1.5, range: 175, stun: 1.5 },
      { interval: 5, dmg: 2.6, range: 175, stun: 1.5 },
      { interval: 3.5, dmg: 2.6, range: 200, stun: 1.8 },
    ],
    desc: ['박치기 충격파로 바리케이드 앞 적들을 기절시킨다.', '기절 시간 증가', '충격파 범위 증가', '충격파 피해 증가', '발동 간격 단축, 범위·기절 증가'],
  },
  munchkin: {
    kind: 'bolt', icon: '🐈', color: '#d9d4cf',
    levels: [
      { interval: 0.32, dmg: 0.5, count: 1, speed: 800, radius: 5 },
      { interval: 0.25, dmg: 0.5, count: 1, speed: 800, radius: 5 },
      { interval: 0.25, dmg: 0.5, count: 2, speed: 800, radius: 5 },
      { interval: 0.25, dmg: 0.72, count: 2, speed: 800, radius: 5 },
      { interval: 0.17, dmg: 0.72, count: 2, speed: 850, radius: 6 },
    ],
    desc: ['짧은 다리로 쉴 새 없이 작은 발톱을 날린다.', '연사 속도 증가', '발톱 2발 동시 발사', '발톱 피해 증가', '연사 속도 대폭 증가'],
  },
  persian: {
    kind: 'aura', icon: '👑', color: '#ffe9a8',
    levels: [
      { interval: 0, dmg: 0, buff: 0.08 },
      { interval: 0, dmg: 0, buff: 0.16 },
      { interval: 0, dmg: 0, buff: 0.24 },
      { interval: 0, dmg: 0, buff: 0.32 },
      { interval: 0, dmg: 0, buff: 0.42 },
    ],
    desc: [`우아한 기품으로 모든 고양이 공격력 +${pct(0.08)}`, `공격력 +${pct(0.16)}`, `공격력 +${pct(0.24)}`, `공격력 +${pct(0.32)}`, `공격력 +${pct(0.42)}`],
  },
  mainecoon: {
    kind: 'slam', icon: '🐾', color: '#9b7350',
    levels: [
      { interval: 6, dmg: 4.0, radius: 80, knock: 40, count: 1 },
      { interval: 6, dmg: 4.0, radius: 104, knock: 50, count: 1 },
      { interval: 6, dmg: 6.0, radius: 104, knock: 50, count: 1 },
      { interval: 4.5, dmg: 6.0, radius: 110, knock: 60, count: 1 },
      { interval: 4.5, dmg: 6.5, radius: 116, knock: 60, count: 2 },
    ],
    desc: ['적이 가장 많이 몰린 곳을 거대한 앞발로 내리친다.', '냥펀치 범위 증가', '냥펀치 피해 증가', '발동 간격 단축', '앞발 두 개로 동시에 내리친다'],
  },
  siamese: {
    kind: 'beam', icon: '💎', color: '#b18cff',
    levels: [
      { interval: 3, dmg: 2.6, width: 30, count: 1 },
      { interval: 3, dmg: 2.6, width: 46, count: 1 },
      { interval: 3, dmg: 3.6, width: 46, count: 1 },
      { interval: 2.2, dmg: 3.6, width: 50, count: 1 },
      { interval: 2.2, dmg: 4.0, width: 54, count: 2 },
    ],
    desc: ['적이 줄지은 곳에 사파이어 광선을 쏜다.', '광선 굵기 증가', '광선 피해 증가', '발사 간격 단축', '광선 2줄 동시 발사'],
  },
};

export const MAX_WEAPON_LV = 5;

/** 주인공 치즈의 버튼 스킬 '꾹꾹이 응원' (성급에 따라 강화) */
export function rally(stars: number) {
  return { speed: 0.4 + 0.08 * stars, heal: 0.06 + 0.02 * stars, dur: 6, cd: 30 - 2 * stars };
}

export function rallyDesc(stars: number): string {
  const r = rally(stars);
  return `[버튼 스킬] 바리케이드 ${pct(r.heal)} 수리, ${r.dur}초간 모든 고양이 공격 속도 +${pct(r.speed)} (재사용 ${r.cd}초)`;
}

/** 전투 중 공용 강화 카드 */
export type GenericCard = 'snack' | 'tuna' | 'catnip';
export const GENERIC: Record<GenericCard, { name: string; icon: string; desc: string; max: number }> = {
  snack: { name: '츄르 간식', icon: '🍡', desc: '바리케이드 체력 25% 회복', max: 99 },
  tuna: { name: '참치 파워', icon: '🐟', desc: '모든 고양이 공격력 +12%', max: 5 },
  catnip: { name: '캣닢 흥분', icon: '🌿', desc: '모든 고양이 공격 속도 +12%', max: 5 },
};
