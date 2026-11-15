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
  { area: 'entrance', name: '현관 앞 정찰병', mul: 1.0, duration: 90, rate: [1.54, 3.52], baseHp: 400,
    early: { mouse: 3, ant: 2 }, late: { mouse: 3, ant: 3, roach: 1 },
    bursts: [b(45, 'ant', 16), b(80, 'mouse', 13)] },
  { area: 'entrance', name: '신발장의 비밀', mul: 1.3, duration: 100, rate: [1.98, 4.4], baseHp: 400,
    early: { ant: 3, mouse: 2 }, late: { roach: 3, mouse: 2, ant: 2 },
    bursts: [b(40, 'roach', 13), b(85, 'ant', 26)] },
  { area: 'entrance', name: '현관문 사수', mul: 1.7, duration: 110, rate: [2.2, 4.84], baseHp: 450,
    early: { roach: 2, mouse: 2, mosquito: 1 }, late: { roach: 2, mosquito: 2, mouse: 2, spider: 0.4 },
    bursts: [b(50, 'mosquito', 16), b(95, 'roach', 19)] },
  { area: 'living', name: '소파 밑 탐험', mul: 2.1, duration: 120, rate: [2.42, 5.5], baseHp: 450,
    early: { ant: 3, mosquito: 2 }, late: { mosquito: 2, mouse: 2, spider: 0.6, ant: 2 },
    bursts: [b(40, 'ant', 32), b(80, 'mosquito', 19), b(110, 'mouse', 19)] },
  { area: 'living', name: 'TV 뒤 거미줄', mul: 2.6, duration: 120, rate: [2.64, 5.94], baseHp: 500,
    early: { spider: 0.6, mouse: 2, roach: 2 }, late: { spider: 1, roach: 3, mosquito: 2 },
    bursts: [b(45, 'spider', 8), b(90, 'roach', 29)] },
  { area: 'living', name: '[보스] 대왕쥐의 습격', mul: 3.1, duration: 120, rate: [2.86, 6.16], baseHp: 500,
    early: { mouse: 3, ant: 2 }, late: { mouse: 3, roach: 2, spider: 0.6 },
    bursts: [b(60, 'mouse', 22), b(100, 'ant', 38)], boss: { kind: 'ratking', count: 1 } },
  { area: 'kitchen', name: '싱크대 아래', mul: 3.8, duration: 130, rate: [3.3, 7.04], baseHp: 550,
    early: { roach: 4, ant: 2 }, late: { roach: 4, spider: 1, mosquito: 2 },
    bursts: [b(40, 'roach', 32), b(90, 'ant', 48), b(120, 'spider', 10)] },
  { area: 'kitchen', name: '냉장고 뒤편', mul: 4.5, duration: 140, rate: [3.52, 7.48], baseHp: 600,
    early: { mosquito: 3, mouse: 2 }, late: { mosquito: 3, mouse: 3, spider: 1, roach: 2 },
    bursts: [b(50, 'mosquito', 32), b(100, 'mouse', 29), b(130, 'spider', 13)] },
  { area: 'kitchen', name: '쓰레기통 대작전', mul: 5.3, duration: 150, rate: [3.96, 8.36], baseHp: 650,
    early: { roach: 3, ant: 3, mouse: 2 }, late: { roach: 3, spider: 1.2, mosquito: 2, mouse: 2 },
    bursts: [b(45, 'ant', 48), b(95, 'roach', 38), b(135, 'spider', 16)], boss: { kind: 'ratking', count: 1 } },
  { area: 'attic', name: '[보스] 다락방의 쥐왕국', mul: 6.2, duration: 170, rate: [4.4, 9.24], baseHp: 700,
    early: { mouse: 3, ant: 3, mosquito: 2 }, late: { mouse: 3, roach: 3, spider: 1.4, mosquito: 2 },
    bursts: [b(50, 'mouse', 38), b(100, 'mosquito', 38), b(150, 'spider', 19)], boss: { kind: 'ratking', count: 2 } },
];

export const STAGES: StageDef[] = RAW.map((s, i) => ({
  ...s,
  id: `s${i + 1}`,
  no: i + 1,
  reward: { coins: 200 + 100 * i, tuna: i % 3 === 2 || s.boss ? 200 : 100 },
}));
