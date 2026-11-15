import type { EnemyKind } from './enemies';

export type Area = 'entrance' | 'living' | 'kitchen' | 'attic';
export const AREA_NAME: Record<Area, string> = { entrance: '현관', living: '거실', kitchen: '부엌', attic: '다락방' };

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
  boss?: { kind: EnemyKind; count: number };
  /** 바리케이드 기본 체력 */
  baseHp: number;
  reward: { coins: number; tuna: number };
}

const b = (t: number, kind: EnemyKind, count: number): Burst => ({ t, kind, count });

type Raw = Omit<StageDef, 'id' | 'no' | 'reward'>;

const RAW: Raw[] = [
  { area: 'entrance', name: '현관 앞 정찰병', mul: 1.0, duration: 150, rate: [2.5, 5.6], baseHp: 400,
    early: { mouse: 3, ant: 2 }, late: { mouse: 3, ant: 3, roach: 1 },
    bursts: [b(75, 'ant', 24), b(133, 'mouse', 20)] },
  { area: 'entrance', name: '신발장의 비밀', mul: 1.3, duration: 162, rate: [3.2, 7.0], baseHp: 400,
    early: { ant: 3, mouse: 2 }, late: { roach: 3, mouse: 2, ant: 2 },
    bursts: [b(65, 'roach', 20), b(138, 'ant', 39)] },
  { area: 'entrance', name: '현관문 사수', mul: 1.7, duration: 174, rate: [3.5, 7.7], baseHp: 450,
    early: { roach: 2, mouse: 2, mosquito: 1 }, late: { roach: 2, mosquito: 2, mouse: 2, spider: 0.4 },
    bursts: [b(79, 'mosquito', 24), b(150, 'roach', 28)] },
  { area: 'living', name: '소파 밑 탐험', mul: 2.1, duration: 186, rate: [3.9, 8.8], baseHp: 450,
    early: { ant: 3, mosquito: 2 }, late: { mosquito: 2, mouse: 2, spider: 0.6, ant: 2 },
    bursts: [b(62, 'ant', 48), b(124, 'mosquito', 28), b(170, 'mouse', 28)] },
  { area: 'living', name: 'TV 뒤 거미줄', mul: 2.9, duration: 198, rate: [4.2, 9.5], baseHp: 500,
    early: { spider: 0.6, mouse: 2, roach: 2 }, late: { spider: 1, roach: 3, mosquito: 2 },
    bursts: [b(74, 'spider', 12), b(148, 'roach', 44)] },
  { area: 'living', name: '[보스] 대왕쥐의 습격', mul: 3.5, duration: 210, rate: [4.6, 9.9], baseHp: 500,
    early: { mouse: 3, ant: 2 }, late: { mouse: 3, roach: 2, spider: 0.6 },
    bursts: [b(105, 'mouse', 33), b(175, 'ant', 57)], boss: { kind: 'ratking', count: 1 } },
  { area: 'kitchen', name: '싱크대 아래', mul: 4.3, duration: 222, rate: [5.3, 11.3], baseHp: 550,
    early: { roach: 4, ant: 2 }, late: { roach: 4, spider: 1, mosquito: 2 },
    bursts: [b(68, 'roach', 48), b(154, 'ant', 72), b(205, 'spider', 15)] },
  { area: 'kitchen', name: '냉장고 뒤편', mul: 5.0, duration: 234, rate: [5.6, 12.0], baseHp: 600,
    early: { mosquito: 3, mouse: 2 }, late: { mosquito: 3, mouse: 3, spider: 1, roach: 2 },
    bursts: [b(84, 'mosquito', 48), b(167, 'mouse', 44), b(217, 'spider', 20)] },
  { area: 'kitchen', name: '쓰레기통 대작전', mul: 5.9, duration: 246, rate: [6.3, 13.4], baseHp: 650,
    early: { roach: 3, ant: 3, mouse: 2 }, late: { roach: 3, spider: 1.2, mosquito: 2, mouse: 2 },
    bursts: [b(74, 'ant', 72), b(156, 'roach', 57), b(221, 'spider', 24)], boss: { kind: 'ratking', count: 1 } },
  { area: 'attic', name: '[보스] 다락방의 쥐왕국', mul: 7.2, duration: 258, rate: [7.0, 14.8], baseHp: 700,
    early: { mouse: 3, ant: 3, mosquito: 2 }, late: { mouse: 3, roach: 3, spider: 1.4, mosquito: 2 },
    bursts: [b(76, 'mouse', 57), b(152, 'mosquito', 57), b(228, 'spider', 28)], boss: { kind: 'ratking', count: 2 } },
];

export const STAGES: StageDef[] = RAW.map((s, i) => ({
  ...s,
  id: `s${i + 1}`,
  no: i + 1,
  reward: { coins: 200 + 100 * i, tuna: i % 3 === 2 || s.boss ? 200 : 100 },
}));
