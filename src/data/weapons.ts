// 고양이별 전투 스킬. 전투 중 NEW 카드로 합류한 뒤, 갈래형 강화 카드로 키운다.
export type WeaponKind =
  | 'bolt'      // 가장 앞의 적에게 투사체
  | 'guard'     // 바리케이드 피해 감소 + 반격
  | 'dash'      // 적이 많은 줄로 돌진
  | 'roll'      // 굴러가며 지속 피해
  | 'snipe'     // 체력 높은 적 저격
  | 'heal'      // 바리케이드 수리
  | 'frost'     // 장판 (감속 + 지속 피해)
  | 'quake'     // 바리케이드 앞 충격파
  | 'aura'      // 전체 공격력 증가
  | 'slam'      // 몰린 곳 내려찍기
  | 'beam'      // 세로줄 광선
  | 'lob'       // 포물선 폭탄
  | 'chain'     // 적 사이를 튀는 연쇄 피해
  | 'pounce'    // 덮치기 + 처형
  | 'boomerang' // 갔다가 돌아오는 투사체
  | 'barrier'   // 바리케이드 보호막
  | 'spray'     // 부채꼴 물줄기 + 밀쳐내기
  | 'mine';     // 바닥 덫

export interface WeaponParams {
  interval: number;
  dmg: number;
  count?: number;
  pierce?: number;
  radius?: number;
  width?: number;
  crit?: number;
  critMul?: number;
  slow?: number;
  stun?: number;
  knock?: number;
  range?: number;
  reduce?: number;
  thorns?: number;
  repair?: number;
  buff?: number;
  speed?: number;
  jumps?: number;
  execute?: number;
  shield?: number;
  cone?: number;
}

export type WeaponFx =
  | 'paw' | 'scratchpost' | 'yarn' | 'scratch' | 'wheel' | 'bell' | 'groom'
  | 'feather' | 'butt' | 'claws' | 'notes' | 'bigpaw' | 'laser'
  | 'churu' | 'zap' | 'pounce' | 'mousetoy' | 'cushion' | 'water' | 'hairball';

/** 갈래형 강화: add는 더하고 mul은 곱한다. max번까지 고를 수 있다 */
export interface ModDef {
  id: string;
  name: string;
  desc: string;
  max: number;
  add?: Partial<WeaponParams>;
  mul?: Partial<WeaponParams>;
}

export interface WeaponDef {
  kind: WeaponKind;
  fx: WeaponFx;
  icon: string;
  color: string;
  base: WeaponParams;
  intro: string;
  mods: ModDef[];
}

const m = (id: string, name: string, desc: string, max: number, add?: Partial<WeaponParams>, mul?: Partial<WeaponParams>): ModDef => ({ id, name, desc, max, add, mul });

export const WEAPONS: Record<string, WeaponDef> = {
  cheese: {
    kind: 'bolt', fx: 'paw', icon: '🐾', color: '#ffb347',
    base: { interval: 0.55, dmg: 1.5, count: 1, speed: 720 },
    intro: '가장 가까운 적에게 말랑한 젤리 냥냥펀치를 날린다.',
    mods: [
      m('multi', '펀치 연타', '펀치 수 +1, 펀치 피해 -15%', 2, { count: 1 }, { dmg: 0.85 }),
      m('power', '젤리 강화', '냥냥펀치 피해 +35%', 2, undefined, { dmg: 1.35 }),
      m('rapid', '꾹꾹 연사', '펀치 간격 -20%', 2, undefined, { interval: 0.8 }),
      m('pierce', '관통 펀치', '펀치가 적 1마리를 더 뚫고 지나감', 2, { pierce: 1 }),
    ],
  },
  godeungeo: {
    kind: 'guard', fx: 'scratchpost', icon: '🪵', color: '#9a9aa6',
    base: { interval: 0, dmg: 1.0, reduce: 0.15, thorns: 0 },
    intro: '바리케이드에 스크래처를 덧대 받는 피해 15% 감소.',
    mods: [
      m('thick', '두꺼운 스크래처', '받는 피해 7% 추가 감소', 3, { reduce: 0.07 }),
      m('thorn', '할퀴기 반격', '바리케이드를 때린 적을 할퀴어 반격 (+공격력 100%)', 3, { thorns: 1.0 }),
    ],
  },
  huindungi: {
    kind: 'bolt', fx: 'yarn', icon: '🧶', color: '#ff7eb6',
    base: { interval: 1.2, dmg: 1.1, count: 1, pierce: 2, speed: 520, radius: 9 },
    intro: '적을 줄줄이 꿰뚫는 털실뭉치를 던진다.',
    mods: [
      m('more', '털실 추가', '털실뭉치 +1개, 피해 -15%', 2, { count: 1 }, { dmg: 0.85 }),
      m('long', '긴 털실', '관통 +3', 2, { pierce: 3 }),
      m('big', '왕털실', '털실뭉치가 커지고 피해 +25%', 2, { radius: 3 }, { dmg: 1.25 }),
      m('fast', '빠른 손놀림', '던지는 간격 -20%', 1, undefined, { interval: 0.8 }),
    ],
  },
  chaos: {
    kind: 'dash', fx: 'scratch', icon: '⚡', color: '#c8742f',
    base: { interval: 4, dmg: 1.7, width: 46, knock: 50, count: 1 },
    intro: '적이 가장 많은 줄로 우다다 달려가며 할퀴고 밀쳐낸다.',
    mods: [
      m('wide', '넓게 우다다', '할퀴는 폭 증가', 2, { width: 26 }),
      m('twin', '분신 우다다', '두 줄 동시 우다다, 피해 -15%', 1, { count: 1 }, { dmg: 0.85 }),
      m('claw', '날카로운 발톱', '할퀴기 피해 +35%', 2, undefined, { dmg: 1.35 }),
      m('often', '새벽 3시', '우다다 간격 -25%', 2, undefined, { interval: 0.75 }),
    ],
  },
  cheesetabby: {
    kind: 'roll', fx: 'wheel', icon: '🎡', color: '#f4a24c',
    base: { interval: 5, dmg: 0.77, radius: 36, speed: 160, count: 1 },
    intro: '캣휠을 굴려 보내 닿는 적을 계속 깔아뭉갠다.',
    mods: [
      m('big', '대형 캣휠', '캣휠 크기 증가', 2, { radius: 12 }),
      m('heavy', '묵직한 캣휠', '캣휠 피해 +40%', 2, undefined, { dmg: 1.4 }),
      m('twin', '캣휠 두 개', '캣휠 +1개', 1, { count: 1 }),
      m('often', '쉬지 않고 굴리기', '굴리는 간격 -25%', 2, undefined, { interval: 0.75 }),
    ],
  },
  tuxedo: {
    kind: 'snipe', fx: 'bell', icon: '🔔', color: '#e8d23a',
    base: { interval: 1.6, dmg: 7.2, crit: 0.25, critMul: 2.5 },
    intro: '체력이 가장 높은 적에게 방울공을 정확히 꽂는다. (치명타 25%)',
    mods: [
      m('luck', '행운의 방울', '치명타 확률 +15%', 2, { crit: 0.15 }),
      m('gentle', '신사의 일격', '치명타 피해 +60%', 2, { critMul: 0.6 }),
      m('often', '빠른 투구', '던지는 간격 -25%', 2, undefined, { interval: 0.75 }),
      m('heavy', '쇠방울', '방울공 피해 +30%', 1, undefined, { dmg: 1.3 }),
    ],
  },
  samsaek: {
    kind: 'heal', fx: 'groom', icon: '💗', color: '#7dff9a',
    base: { interval: 5, dmg: 0, repair: 0.02 },
    intro: '그루밍하듯 바리케이드를 다듬어 5초마다 2% 수리.',
    mods: [
      m('more', '꼼꼼한 그루밍', '수리량 +1.2%', 3, { repair: 0.012 }),
      m('often', '부지런한 혀', '수리 간격 -20%', 2, undefined, { interval: 0.8 }),
    ],
  },
  russianblue: {
    kind: 'frost', fx: 'feather', icon: '🎣', color: '#9fe3ff',
    base: { interval: 4, dmg: 0.29, radius: 70, slow: 0.4, range: 3 },
    intro: '적이 몰린 곳에 깃털 낚싯대를 드리워 홀린다. (감속 + 지속 피해)',
    mods: [
      m('charm', '매혹의 깃털', '감속 +10%', 2, { slow: 0.1 }),
      m('wide', '긴 낚싯줄', '홀리는 범위 증가', 2, { radius: 18 }),
      m('long', '끈질긴 낚시', '지속시간 +1초', 1, { range: 1 }),
      m('sting', '따끔한 깃털', '지속 피해 +60%', 2, undefined, { dmg: 1.6 }),
      m('often', '연속 캐스팅', '드리우는 간격 -20%', 1, undefined, { interval: 0.8 }),
    ],
  },
  scottish: {
    kind: 'quake', fx: 'butt', icon: '💫', color: '#e9d3b4',
    base: { interval: 5, dmg: 1.5, range: 120, stun: 1.0 },
    intro: '식빵 자세에서 엉덩방아 쿵! 바리케이드 앞 적들을 기절시킨다.',
    mods: [
      m('dizzy', '어질어질', '기절 시간 +0.4초', 2, { stun: 0.4 }),
      m('wide', '큰 엉덩이', '충격파 범위 증가', 2, { range: 45 }),
      m('heavy', '무거운 엉덩방아', '충격파 피해 +50%', 2, undefined, { dmg: 1.5 }),
      m('often', '자꾸 넘어짐', '발동 간격 -20%', 1, undefined, { interval: 0.8 }),
    ],
  },
  munchkin: {
    kind: 'bolt', fx: 'claws', icon: '✂️', color: '#d9d4cf',
    base: { interval: 0.32, dmg: 0.6, count: 1, speed: 800, radius: 5 },
    intro: '짧은 다리로 쉴 새 없이 할퀴기를 날린다.',
    mods: [
      m('rapid', '짧은 다리 폭주', '할퀴기 간격 -22%', 3, undefined, { interval: 0.78 }),
      m('twin', '양손 할퀴기', '할퀴기 +1발, 피해 -10%', 1, { count: 1 }, { dmg: 0.9 }),
      m('sharp', '발톱 손질', '할퀴기 피해 +30%', 2, undefined, { dmg: 1.3 }),
    ],
  },
  persian: {
    kind: 'aura', fx: 'notes', icon: '🎵', color: '#ffe9a8',
    base: { interval: 0, dmg: 0, buff: 0.08 },
    intro: '골골송을 불러 모든 고양이 공격력 +8%.',
    mods: [m('song', '앙코르 골골송', '모든 고양이 공격력 +8%', 4, { buff: 0.08 })],
  },
  mainecoon: {
    kind: 'slam', fx: 'bigpaw', icon: '👊', color: '#9b7350',
    base: { interval: 6, dmg: 4.72, radius: 80, knock: 40, count: 1 },
    intro: '적이 가장 많이 몰린 곳을 거대한 앞발로 쾅 내리친다.',
    mods: [
      m('big', '왕발', '냥펀치 범위 증가', 2, { radius: 22 }),
      m('heavy', '체중 실기', '냥펀치 피해 +40%', 2, undefined, { dmg: 1.4 }),
      m('twin', '양발 냥펀치', '앞발 두 개로 동시에', 1, { count: 1 }),
      m('often', '연속 냥펀치', '내리치는 간격 -20%', 2, undefined, { interval: 0.8 }),
    ],
  },
  siamese: {
    kind: 'beam', fx: 'laser', icon: '🔴', color: '#b18cff',
    base: { interval: 3, dmg: 2.6, width: 30, count: 1 },
    intro: '적이 줄지은 곳을 레이저 포인터로 쭉 긋는다.',
    mods: [
      m('thick', '굵은 레이저', '레이저 굵기 증가', 2, { width: 14 }),
      m('power', '고출력', '레이저 피해 +35%', 2, undefined, { dmg: 1.35 }),
      m('twin', '레이저 두 줄', '레이저 +1줄, 피해 -15%', 1, { count: 1 }, { dmg: 0.85 }),
      m('often', '빠른 충전', '레이저 간격 -20%', 2, undefined, { interval: 0.8 }),
    ],
  },
  // ───────── 새 고양이 ─────────
  cow: {
    kind: 'lob', fx: 'churu', icon: '🍡', color: '#ffb36b',
    base: { interval: 3.2, dmg: 1.54, radius: 60, count: 1 },
    intro: '적이 몰린 곳에 츄르 폭탄을 포물선으로 던져 터뜨린다.',
    mods: [
      m('big', '대용량 츄르', '폭발 범위 증가', 2, { radius: 18 }),
      m('more', '츄르 묶음', '폭탄 +1개, 피해 -15%', 2, { count: 1 }, { dmg: 0.85 }),
      m('often', '츄르 중독', '던지는 간격 -20%', 2, undefined, { interval: 0.8 }),
    ],
  },
  norwegian: {
    kind: 'chain', fx: 'zap', icon: '⚡', color: '#9fd8ff',
    base: { interval: 2.2, dmg: 2.4, jumps: 4 },
    intro: '풍성한 털로 모은 정전기가 적들 사이를 튀어 다닌다.',
    mods: [
      m('more', '겨울 털', '연쇄 +2회', 3, { jumps: 2 }),
      m('power', '찌릿찌릿', '정전기 피해 +30%', 2, undefined, { dmg: 1.3 }),
      m('stun', '감전', '맞은 적 0.4초 기절', 1, { stun: 0.4 }),
      m('often', '털 비비기', '발동 간격 -20%', 1, undefined, { interval: 0.8 }),
    ],
  },
  bengal: {
    kind: 'pounce', fx: 'pounce', icon: '🐆', color: '#e8a040',
    base: { interval: 3.5, dmg: 4.3, radius: 55, execute: 0.15 },
    intro: '사냥 본능! 적에게 덮쳐 주변을 할퀴고, 체력 15% 이하 적은 즉시 처치.',
    mods: [
      m('hunter', '타고난 사냥꾼', '즉시 처치 기준 +8%', 2, { execute: 0.08 }),
      m('wide', '넓은 덮치기', '덮치기 범위 증가', 2, { radius: 20 }),
      m('power', '야생의 발톱', '덮치기 피해 +35%', 2, undefined, { dmg: 1.35 }),
      m('often', '쉬지 않는 사냥', '덮치기 간격 -20%', 1, undefined, { interval: 0.8 }),
    ],
  },
  americanshort: {
    kind: 'boomerang', fx: 'mousetoy', icon: '🐭', color: '#c9ccd2',
    base: { interval: 2.4, dmg: 1.12, count: 1, range: 380, radius: 14, speed: 520 },
    intro: '쥐돌이 장난감을 던지면 적을 훑고 다시 돌아온다. (왕복으로 두 번 타격)',
    mods: [
      m('more', '쥐돌이 추가', '쥐돌이 +1개', 1, { count: 1 }),
      m('far', '멀리 던지기', '사거리 증가', 1, { range: 120 }),
      m('power', '딱딱한 쥐돌이', '피해 +35%', 2, undefined, { dmg: 1.35 }),
      m('big', '왕쥐돌이', '쥐돌이 크기 증가', 1, { radius: 6 }),
    ],
  },
  ragdoll: {
    kind: 'barrier', fx: 'cushion', icon: '☁️', color: '#bfe3ff',
    base: { interval: 8, dmg: 0, shield: 0.06 },
    intro: '꾹꾹이로 폭신한 쿠션을 만들어 바리케이드에 보호막(최대 체력 6%)을 씌운다.',
    mods: [
      m('soft', '더 폭신하게', '보호막 +3%', 3, { shield: 0.03 }),
      m('often', '열심히 꾹꾹', '보호막 간격 -20%', 2, undefined, { interval: 0.8 }),
    ],
  },
  sphynx: {
    kind: 'spray', fx: 'water', icon: '💦', color: '#7ec8ff',
    base: { interval: 2.6, dmg: 2.27, range: 260, cone: 0.45, knock: 60 },
    intro: '물을 싫어하는 건 적도 마찬가지! 분무기로 부채꼴 물줄기를 뿌려 밀쳐낸다.',
    mods: [
      m('wide', '넓게 분사', '물줄기 각도 증가', 2, { cone: 0.15 }),
      m('far', '고압 분무기', '사거리 증가', 1, { range: 80 }),
      m('push', '물대포', '밀쳐내기 강화', 2, { knock: 40 }),
      m('power', '얼음물', '피해 +35%', 2, undefined, { dmg: 1.35 }),
      m('often', '연속 분사', '분사 간격 -20%', 1, undefined, { interval: 0.8 }),
    ],
  },
  abyssinian: {
    kind: 'mine', fx: 'hairball', icon: '🧺', color: '#c8834e',
    base: { interval: 2.5, dmg: 4.35, radius: 55, count: 3 },
    intro: '바닥에 털뭉치 덫을 깔아 둔다. 적이 밟으면 펑! (최대 3개)',
    mods: [
      m('more', '털갈이 시즌', '덫 최대 +2개', 2, { count: 2 }),
      m('big', '큰 털뭉치', '폭발 범위 증가', 2, { radius: 15 }),
      m('power', '뭉친 털', '폭발 피해 +35%', 2, undefined, { dmg: 1.35 }),
    ],
  },
};

/** 스킬 레벨 = 1(합류) + 고른 강화 수 */
export function applyMods(w: WeaponDef, picks: Record<string, number>): WeaponParams {
  const p: WeaponParams = { ...w.base };
  for (const mod of w.mods) {
    const n = picks[mod.id] ?? 0;
    for (let i = 0; i < n; i++) {
      for (const [k, v] of Object.entries(mod.add ?? {})) (p as unknown as Record<string, number>)[k] = ((p as unknown as Record<string, number>)[k] ?? 0) + (v as number);
      for (const [k, v] of Object.entries(mod.mul ?? {})) (p as unknown as Record<string, number>)[k] = ((p as unknown as Record<string, number>)[k] ?? 0) * (v as number);
    }
  }
  return p;
}

export function maxPicks(w: WeaponDef): number {
  return w.mods.reduce((s, x) => s + x.max, 0);
}

/** 성급 최대치 (고양이 성장) */
export const MAX_WEAPON_LV = 5;

/** 주인공 치즈의 버튼 스킬 '꾹꾹이 응원' (성급에 따라 강화) */
export function rally(stars: number) {
  return { speed: 0.4 + 0.08 * stars, heal: 0.06 + 0.02 * stars, dur: 6, cd: 30 - 2 * stars };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

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
