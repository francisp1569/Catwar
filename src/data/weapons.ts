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

/** 그림 효과 스타일 (고양이 장난감·행동) */
export type WeaponFx =
  | 'paw' | 'scratchpost' | 'yarn' | 'scratch' | 'wheel' | 'bell' | 'groom'
  | 'feather' | 'butt' | 'claws' | 'notes' | 'bigpaw' | 'laser';

export interface WeaponDef {
  kind: WeaponKind;
  fx: WeaponFx;
  icon: string;
  color: string;
  levels: WeaponParams[]; // index 0 = Lv.1
  desc: string[];         // desc[0] = 처음 얻을 때 설명, desc[i] = Lv.i+1 강화 내용
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const WEAPONS: Record<string, WeaponDef> = {
  cheese: {
    kind: 'bolt', fx: 'paw', icon: '🐾', color: '#ffb347',
    levels: [
      { interval: 0.55, dmg: 1.0, count: 1, speed: 720 },
      { interval: 0.55, dmg: 1.0, count: 2, speed: 720 },
      { interval: 0.55, dmg: 1.35, count: 2, speed: 720 },
      { interval: 0.55, dmg: 1.35, count: 3, speed: 720 },
      { interval: 0.4, dmg: 1.5, count: 3, pierce: 1, speed: 760 },
    ],
    desc: ['가장 가까운 적에게 말랑한 젤리 냥냥펀치를 날린다.', '냥냥펀치 2발 동시 발사', '냥냥펀치 피해 +35%', '냥냥펀치 3발 동시 발사', '펀치 속도·피해 증가, 1회 관통'],
  },
  godeungeo: {
    kind: 'guard', fx: 'scratchpost', icon: '🪵', color: '#9a9aa6',
    levels: [
      { interval: 0, dmg: 0, reduce: 0.15 },
      { interval: 0, dmg: 0, reduce: 0.22 },
      { interval: 0, dmg: 1.0, reduce: 0.27, thorns: 1.0 },
      { interval: 0, dmg: 1.0, reduce: 0.32, thorns: 1.6 },
      { interval: 0, dmg: 1.0, reduce: 0.4, thorns: 2.4 },
    ],
    desc: ['바리케이드에 스크래처를 덧대 받는 피해 15% 감소', '받는 피해 22% 감소', '피해 27% 감소 + 바리케이드를 때린 적을 할퀴어 반격', '피해 32% 감소, 할퀴기 반격 강화', '피해 40% 감소, 할퀴기 반격 대폭 강화'],
  },
  huindungi: {
    kind: 'bolt', fx: 'yarn', icon: '🧶', color: '#ff7eb6',
    levels: [
      { interval: 1.2, dmg: 1.3, count: 1, pierce: 2, speed: 520, radius: 9 },
      { interval: 1.2, dmg: 1.3, count: 2, pierce: 2, speed: 520, radius: 9 },
      { interval: 1.2, dmg: 1.3, count: 2, pierce: 5, speed: 520, radius: 11 },
      { interval: 1.0, dmg: 1.3, count: 3, pierce: 5, speed: 520, radius: 11 },
      { interval: 1.0, dmg: 2.0, count: 3, pierce: 8, speed: 560, radius: 13 },
    ],
    desc: ['적을 줄줄이 꿰뚫는 털실뭉치를 던진다.', '털실뭉치 2개 던지기', '관통 횟수 증가, 털실뭉치가 커짐', '털실뭉치 3개 던지기, 연사 증가', '털실뭉치 피해 +50%, 관통 대폭 증가'],
  },
  chaos: {
    kind: 'dash', fx: 'scratch', icon: '⚡', color: '#c8742f',
    levels: [
      { interval: 4, dmg: 2.0, width: 46, knock: 50, count: 1 },
      { interval: 4, dmg: 2.7, width: 46, knock: 60, count: 1 },
      { interval: 3, dmg: 2.7, width: 46, knock: 60, count: 1 },
      { interval: 3, dmg: 2.7, width: 72, knock: 70, count: 1 },
      { interval: 3, dmg: 3.4, width: 72, knock: 80, count: 2 },
    ],
    desc: ['적이 가장 많은 줄로 우다다 달려가며 할퀴고 밀쳐낸다.', '할퀴기 피해 증가', '우다다 간격 단축', '할퀴는 폭 증가', '두 줄 동시 우다다, 피해 증가'],
  },
  cheesetabby: {
    kind: 'roll', fx: 'wheel', icon: '🎡', color: '#f4a24c',
    levels: [
      { interval: 5, dmg: 0.77, radius: 36, speed: 160, count: 1 },
      { interval: 5, dmg: 0.77, radius: 50, speed: 160, count: 1 },
      { interval: 5, dmg: 1.19, radius: 50, speed: 160, count: 1 },
      { interval: 3.5, dmg: 1.19, radius: 54, speed: 160, count: 1 },
      { interval: 3.5, dmg: 1.4, radius: 58, speed: 165, count: 2 },
    ],
    desc: ['캣휠을 굴려 보내 닿는 적을 계속 깔아뭉갠다.', '캣휠 크기 증가', '캣휠 피해 증가', '굴리는 간격 단축', '캣휠 2개 동시에 굴리기'],
  },
  tuxedo: {
    kind: 'snipe', fx: 'bell', icon: '🔔', color: '#e8d23a',
    levels: [
      { interval: 1.6, dmg: 3.0, crit: 0.25, critMul: 2.5 },
      { interval: 1.6, dmg: 3.0, crit: 0.45, critMul: 2.5 },
      { interval: 1.6, dmg: 4.2, crit: 0.45, critMul: 2.5 },
      { interval: 1.05, dmg: 4.2, crit: 0.45, critMul: 2.5 },
      { interval: 1.05, dmg: 4.6, crit: 0.6, critMul: 3.2 },
    ],
    desc: ['체력이 가장 높은 적에게 방울공을 정확히 꽂는다. (치명타 25%)', '치명타 확률 45%', '방울공 피해 증가', '던지는 간격 단축', '치명타 확률 60%, 치명타 피해 3.2배'],
  },
  samsaek: {
    kind: 'heal', fx: 'groom', icon: '💗', color: '#7dff9a',
    levels: [
      { interval: 5, dmg: 0, repair: 0.02 },
      { interval: 5, dmg: 0, repair: 0.03 },
      { interval: 4.5, dmg: 0, repair: 0.04 },
      { interval: 4.5, dmg: 0, repair: 0.05 },
      { interval: 3.5, dmg: 0, repair: 0.06 },
    ],
    desc: ['그루밍하듯 바리케이드를 다듬어 5초마다 2% 수리', '수리량 3%', '수리량 4%, 간격 단축', '수리량 5%', '수리량 6%, 간격 대폭 단축'],
  },
  russianblue: {
    kind: 'frost', fx: 'feather', icon: '🎣', color: '#9fe3ff',
    levels: [
      { interval: 4, dmg: 0.35, radius: 70, slow: 0.4, range: 3 },
      { interval: 4, dmg: 0.35, radius: 70, slow: 0.55, range: 3 },
      { interval: 4, dmg: 0.35, radius: 92, slow: 0.55, range: 3.5 },
      { interval: 3, dmg: 0.5, radius: 92, slow: 0.55, range: 3.5 },
      { interval: 3, dmg: 0.7, radius: 100, slow: 0.65, range: 4 },
    ],
    desc: ['적이 몰린 곳에 깃털 낚싯대를 드리워 홀린다. (감속 + 지속 피해)', '홀리는 효과(감속) 증가', '낚싯대 범위·지속시간 증가', '드리우는 간격 단축, 피해 증가', '감속·피해·범위 모두 증가'],
  },
  scottish: {
    kind: 'quake', fx: 'butt', icon: '💫', color: '#e9d3b4',
    levels: [
      { interval: 5, dmg: 1.5, range: 120, stun: 1.0 },
      { interval: 5, dmg: 1.5, range: 120, stun: 1.5 },
      { interval: 5, dmg: 1.5, range: 175, stun: 1.5 },
      { interval: 5, dmg: 2.6, range: 175, stun: 1.5 },
      { interval: 3.5, dmg: 2.6, range: 200, stun: 1.8 },
    ],
    desc: ['식빵 자세에서 엉덩방아 쿵! 바리케이드 앞 적들을 기절시킨다.', '기절 시간 증가', '쿵 충격파 범위 증가', '충격파 피해 증가', '발동 간격 단축, 범위·기절 증가'],
  },
  munchkin: {
    kind: 'bolt', fx: 'claws', icon: '✂️', color: '#d9d4cf',
    levels: [
      { interval: 0.32, dmg: 0.5, count: 1, speed: 800, radius: 5 },
      { interval: 0.25, dmg: 0.5, count: 1, speed: 800, radius: 5 },
      { interval: 0.25, dmg: 0.5, count: 2, speed: 800, radius: 5 },
      { interval: 0.25, dmg: 0.72, count: 2, speed: 800, radius: 5 },
      { interval: 0.17, dmg: 0.72, count: 2, speed: 850, radius: 6 },
    ],
    desc: ['짧은 다리로 쉴 새 없이 할퀴기를 날린다.', '할퀴기 속도 증가', '할퀴기 2발 동시 발사', '할퀴기 피해 증가', '할퀴기 속도 대폭 증가'],
  },
  persian: {
    kind: 'aura', fx: 'notes', icon: '🎵', color: '#ffe9a8',
    levels: [
      { interval: 0, dmg: 0, buff: 0.08 },
      { interval: 0, dmg: 0, buff: 0.16 },
      { interval: 0, dmg: 0, buff: 0.24 },
      { interval: 0, dmg: 0, buff: 0.32 },
      { interval: 0, dmg: 0, buff: 0.42 },
    ],
    desc: [`골골송을 불러 모든 고양이 공격력 +${pct(0.08)}`, `공격력 +${pct(0.16)}`, `공격력 +${pct(0.24)}`, `공격력 +${pct(0.32)}`, `공격력 +${pct(0.42)}`],
  },
  mainecoon: {
    kind: 'slam', fx: 'bigpaw', icon: '👊', color: '#9b7350',
    levels: [
      { interval: 6, dmg: 4.0, radius: 80, knock: 40, count: 1 },
      { interval: 6, dmg: 4.0, radius: 104, knock: 50, count: 1 },
      { interval: 6, dmg: 6.0, radius: 104, knock: 50, count: 1 },
      { interval: 4.5, dmg: 6.0, radius: 110, knock: 60, count: 1 },
      { interval: 4.5, dmg: 6.5, radius: 116, knock: 60, count: 2 },
    ],
    desc: ['적이 가장 많이 몰린 곳을 거대한 앞발로 쾅 내리친다.', '냥펀치 범위 증가', '냥펀치 피해 증가', '내리치는 간격 단축', '앞발 두 개로 동시에 내리친다'],
  },
  siamese: {
    kind: 'beam', fx: 'laser', icon: '🔴', color: '#b18cff',
    levels: [
      { interval: 3, dmg: 2.6, width: 30, count: 1 },
      { interval: 3, dmg: 2.6, width: 46, count: 1 },
      { interval: 3, dmg: 3.6, width: 46, count: 1 },
      { interval: 2.2, dmg: 3.6, width: 50, count: 1 },
      { interval: 2.2, dmg: 4.0, width: 54, count: 2 },
    ],
    desc: ['적이 줄지은 곳을 레이저 포인터로 쭉 긋는다.', '레이저 굵기 증가', '레이저 피해 증가', '레이저 간격 단축', '레이저 2줄 동시 발사'],
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
