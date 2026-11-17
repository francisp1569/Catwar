import type { EnemyKind } from './enemies';

export type Area = 'entrance' | 'living' | 'kitchen' | 'attic' | 'bathroom' | 'balcony' | 'garden';
export const AREA_NAME: Record<Area, string> = {
  entrance: '현관', living: '거실', kitchen: '부엌', attic: '다락방',
  bathroom: '욕실', balcony: '베란다', garden: '마당',
};
/** 장(챕터) 이름: 시작 스테이지 번호 → 이름 */
export const CHAPTERS: { from: number; name: string }[] = [
  { from: 1, name: '1장 · 우리 집을 지켜라' },
  { from: 11, name: '2장 · 찍찍 도적단의 역습' },
];

export type Mix = Partial<Record<EnemyKind, number>>;

/** 특정 시각에 한 줄로 몰려오는 무리 */
export interface Burst { t: number; kind: EnemyKind; count: number; }

export interface StageDef {
  id: string;
  no: number;
  area: Area;
  name: string;
  /** 적 체력/공격력 배율 */
  mul: number;
  /** 버텨야 하는 시간(초). 끝나면 마지막 무리/보스 등장 */
  duration: number;
  /** 초당 출현 수 (시작 → 끝) */
  rate: [number, number];
  early: Mix;
  late: Mix;
  bursts: Burst[];
  boss?: { kind: EnemyKind; count: number; with?: EnemyKind };
  /** 바리케이드 기본 체력 */
  baseHp: number;
  reward: { coins: number; tuna: number };
  /** 어려움 모드 */
  hard?: boolean;
}

const b = (t: number, kind: EnemyKind, count: number): Burst => ({ t, kind, count });

type Raw = Omit<StageDef, 'id' | 'no' | 'reward'>;

const RAW: Raw[] = [
  { area: 'entrance', name: '현관 앞 정찰병', mul: 1.9, duration: 150, rate: [2.5, 5.6], baseHp: 400,
    early: { mouse: 3, ant: 2 }, late: { mouse: 3, ant: 3, roach: 1 },
    bursts: [b(75, 'ant', 24), b(133, 'mouse', 20)] },
  { area: 'entrance', name: '신발장의 비밀', mul: 3.3, duration: 162, rate: [3.2, 7.0], baseHp: 400,
    early: { ant: 3, mouse: 2 }, late: { roach: 3, mouse: 2, ant: 2 },
    bursts: [b(65, 'roach', 20), b(138, 'ant', 39)] },
  { area: 'entrance', name: '현관문 사수', mul: 5.6, duration: 174, rate: [3.5, 7.7], baseHp: 450,
    early: { roach: 2, mouse: 2, mosquito: 1 }, late: { roach: 2, mosquito: 2, mouse: 2, spider: 0.4 },
    bursts: [b(79, 'mosquito', 24), b(150, 'roach', 28)] },
  { area: 'living', name: '소파 밑 탐험', mul: 7.1, duration: 186, rate: [3.9, 8.8], baseHp: 450,
    early: { ant: 3, mosquito: 2 }, late: { mosquito: 2, mouse: 2, spider: 0.6, ant: 2 },
    bursts: [b(62, 'ant', 48), b(124, 'mosquito', 28), b(170, 'mouse', 28)] },
  { area: 'living', name: 'TV 뒤 거미줄', mul: 9.6, duration: 198, rate: [4.2, 9.5], baseHp: 500,
    early: { spider: 0.6, mouse: 2, roach: 2 }, late: { spider: 1, roach: 3, mosquito: 2 },
    bursts: [b(74, 'spider', 12), b(148, 'roach', 44)] },
  { area: 'living', name: '[보스] 대왕쥐의 습격', mul: 10.5, duration: 210, rate: [4.6, 9.9], baseHp: 500,
    early: { mouse: 3, ant: 2 }, late: { mouse: 3, roach: 2, spider: 0.6 },
    bursts: [b(105, 'mouse', 33), b(175, 'ant', 57)], boss: { kind: 'ratking', count: 1 } },
  { area: 'kitchen', name: '싱크대 아래', mul: 11.6, duration: 222, rate: [5.3, 11.3], baseHp: 550,
    early: { roach: 4, ant: 2, fly: 1 }, late: { roach: 4, spider: 1, mosquito: 2, fly: 2 },
    bursts: [b(68, 'roach', 48), b(154, 'ant', 72), b(205, 'spider', 15)] },
  { area: 'kitchen', name: '냉장고 뒤편', mul: 13.5, duration: 234, rate: [5.6, 12.0], baseHp: 600,
    early: { fly: 3, mouse: 2 }, late: { mosquito: 2, fly: 2, mouse: 2, shieldmouse: 1, spider: 1, roach: 2 },
    bursts: [b(84, 'fly', 48), b(167, 'mouse', 44), b(217, 'spider', 20)] },
  { area: 'kitchen', name: '[보스] 쓰레기통의 바퀴 장군', mul: 13.4, duration: 246, rate: [6.3, 13.4], baseHp: 650,
    early: { roach: 3, ant: 3, fly: 2 }, late: { roach: 3, spider: 1.2, fly: 2, shieldmouse: 1.2 },
    bursts: [b(74, 'ant', 72), b(156, 'roach', 57), b(221, 'shieldmouse', 16)], boss: { kind: 'roachgen', count: 1 } },
  { area: 'attic', name: '[보스] 다락방의 거미 여왕', mul: 15.9, duration: 258, rate: [7.0, 14.8], baseHp: 700,
    early: { mouse: 3, ant: 3, mosquito: 2 }, late: { mouse: 2, shieldmouse: 1.5, roach: 3, spider: 1.4, mosquito: 2 },
    bursts: [b(76, 'mouse', 57), b(152, 'mosquito', 57), b(228, 'shieldmouse', 24)], boss: { kind: 'spiderqueen', count: 1, with: 'ratking' } },
  // ───── 2장: 찍찍 도적단의 역습 (욕실 → 베란다 → 마당) ─────
  { area: 'bathroom', name: '젖은 타일 위의 행진', mul: 12.9, duration: 210, rate: [6.0, 13.0], baseHp: 750,
    early: { slug: 2, roach: 3, ant: 2 }, late: { slug: 2, centipede: 2, roach: 2, fly: 2, goldmouse: 0.15 },
    bursts: [b(70, 'roach', 60), b(150, 'centipede', 40)] },
  { area: 'bathroom', name: '하수구에서 온 손님', mul: 13.9, duration: 222, rate: [6.4, 13.8], baseHp: 780,
    early: { centipede: 2, mouse: 3, slug: 1 }, late: { centipede: 3, slug: 2, shieldmouse: 1.5, mosquito: 2, goldmouse: 0.15 },
    bursts: [b(80, 'centipede', 50), b(160, 'slug', 30)] },
  { area: 'bathroom', name: '[보스] 거품 욕조의 대왕 두꺼비', mul: 16.8, duration: 234, rate: [6.8, 14.4], baseHp: 820,
    early: { frog: 2, slug: 2, roach: 2 }, late: { frog: 3, slug: 2, centipede: 2, spider: 1 },
    bursts: [b(90, 'frog', 40), b(180, 'centipede', 60)], boss: { kind: 'toadking', count: 1 } },
  { area: 'balcony', name: '빨래 건조대 습격', mul: 16.0, duration: 222, rate: [7.0, 15.0], baseHp: 850,
    early: { wasp: 3, pigeon: 1 }, late: { wasp: 3, pigeon: 2, mosquito: 2, goldmouse: 0.15 },
    bursts: [b(70, 'wasp', 80), b(150, 'pigeon', 30)] },
  { area: 'balcony', name: '화분 뒤의 매복', mul: 18.4, duration: 234, rate: [7.3, 15.6], baseHp: 880,
    early: { frog: 2, spider: 1, wasp: 2 }, late: { frog: 3, spider: 1.6, beetle: 1, wasp: 2, goldmouse: 0.15 },
    bursts: [b(85, 'frog', 50), b(170, 'beetle', 20)] },
  { area: 'balcony', name: '[보스] 난간 위의 까마귀 선장', mul: 19.7, duration: 246, rate: [7.6, 16.2], baseHp: 920,
    early: { pigeon: 2, wasp: 3 }, late: { pigeon: 2, wasp: 3, beetle: 1, centipede: 2 },
    bursts: [b(80, 'wasp', 90), b(170, 'pigeon', 36)], boss: { kind: 'crowboss', count: 1, with: 'roachgen' } },
  { area: 'garden', name: '잔디밭의 두더지굴', mul: 21.5, duration: 234, rate: [8.0, 17.0], baseHp: 950,
    early: { mole: 2, ant: 4 }, late: { mole: 3, ant: 4, beetle: 1.2, centipede: 2, goldmouse: 0.15 },
    bursts: [b(60, 'ant', 110), b(140, 'mole', 40), b(200, 'beetle', 24)] },
  { area: 'garden', name: '창고 옆 뒷골목', mul: 23.5, duration: 246, rate: [8.3, 17.6], baseHp: 980,
    early: { mouse: 3, shieldmouse: 1.5, frog: 2 }, late: { shieldmouse: 2, beetle: 1.5, frog: 2, wasp: 2, mole: 2, goldmouse: 0.15 },
    bursts: [b(90, 'mole', 50), b(180, 'beetle', 30)] },
  { area: 'garden', name: '달밤의 총공격', mul: 25.0, duration: 258, rate: [8.6, 18.2], baseHp: 1000,
    early: { centipede: 3, wasp: 3, slug: 2 }, late: { centipede: 3, pigeon: 2, beetle: 1.6, mole: 2, slug: 2 },
    bursts: [b(70, 'wasp', 100), b(150, 'centipede', 80), b(220, 'beetle', 40)] },
  { area: 'garden', name: '[보스] 쥐 황제의 친정', mul: 26.5, duration: 270, rate: [9.0, 19.0], baseHp: 1050,
    early: { mouse: 3, shieldmouse: 1.5, mole: 1.5 }, late: { shieldmouse: 1.5, beetle: 1.2, mole: 1.5, frog: 2, pigeon: 2 },
    bursts: [b(80, 'mouse', 90), b(160, 'mole', 50), b(240, 'beetle', 48)], boss: { kind: 'ratemperor', count: 1, with: 'ratking' } },
];

export const STAGES: StageDef[] = RAW.map((s, i) => ({
  ...s,
  id: `s${i + 1}`,
  no: i + 1,
  // 2장은 성장 속도를 맞추려고 코인을 더 준다
  reward: { coins: Math.round((200 + 100 * i) * (i >= 10 ? 1.6 : 1)), tuna: i % 3 === 2 || s.boss ? 200 : 100 },
}));

/** 어려움 모드 스테이지 (보통을 깨면 열림): 적 x2.4, 보상 x2 */
export function hardStage(st: StageDef): StageDef {
  return {
    ...st,
    id: `${st.id}h`,
    hard: true,
    mul: st.mul * 2.4,
    rate: [st.rate[0] * 1.1, st.rate[1] * 1.1],
    baseHp: Math.round(st.baseHp * 1.3),
    reward: { coins: st.reward.coins * 2, tuna: Math.round(st.reward.tuna * 1.5) },
  };
}

/** id로 스테이지 찾기 ('s3h' 처럼 h가 붙으면 어려움) */
export function getStage(id: string): StageDef | undefined {
  const hard = id.endsWith('h');
  const base = STAGES.find((s) => s.id === (hard ? id.slice(0, -1) : id));
  return base && hard ? hardStage(base) : base;
}
