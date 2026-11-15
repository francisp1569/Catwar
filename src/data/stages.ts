import type { EnemyKind } from './enemies';

export interface SpawnGroup { kind: EnemyKind; count: number; interval: number; delay: number; }
export interface WaveDef { name: string; groups: SpawnGroup[]; }

export type Area = 'entrance' | 'living' | 'kitchen' | 'attic';
export const AREA_NAME: Record<Area, string> = { entrance: '현관', living: '거실', kitchen: '부엌', attic: '다락방' };

export interface StageDef {
  id: string;
  no: number;
  area: Area;
  name: string;
  /** 적 체력/공격력 배율 */
  mul: number;
  houseHp: number;
  waves: WaveDef[];
  reward: { coins: number; tuna: number };
}

const g = (kind: EnemyKind, count: number, interval: number, delay = 0): SpawnGroup => ({ kind, count, interval, delay });
const w = (name: string, ...groups: SpawnGroup[]): WaveDef => ({ name, groups });

const RAW: Omit<StageDef, 'id' | 'no' | 'reward'>[] = [
  { area: 'entrance', name: '현관 앞 정찰병', mul: 1.0, houseHp: 1000, waves: [
    w('생쥐 정찰대', g('mouse', 3, 2.5, 1)),
    w('생쥐 무리', g('mouse', 5, 1.8)),
    w('개미 행렬', g('ant', 8, 0.7), g('mouse', 2, 2, 4)),
  ] },
  { area: 'entrance', name: '신발장의 비밀', mul: 1.1, houseHp: 1000, waves: [
    w('개미 행렬', g('ant', 10, 0.6)),
    w('바퀴 등장', g('roach', 4, 1.5), g('mouse', 3, 2, 3)),
    w('신발장 대공습', g('roach', 6, 1), g('ant', 8, 0.5, 3), g('mouse', 3, 2, 6)),
  ] },
  { area: 'entrance', name: '현관문 사수', mul: 1.15, houseHp: 1100, waves: [
    w('바퀴 습격', g('roach', 5, 1.3), g('mouse', 3, 2, 3)),
    w('한밤의 모기', g('mosquito', 5, 1.3), g('ant', 6, 0.6, 5)),
    w('거미 등장', g('mouse', 4, 1.6), g('spider', 1, 1, 4)),
    w('현관 총공격', g('roach', 5, 1.1), g('mosquito', 4, 1.2, 4), g('spider', 1, 1, 7)),
  ] },
  { area: 'living', name: '소파 밑 탐험', mul: 1.4, houseHp: 1200, waves: [
    w('먼지 속 개미', g('ant', 14, 0.45)),
    w('모기떼', g('mosquito', 8, 0.9), g('mouse', 4, 1.6, 3)),
    w('소파 밑 거미', g('spider', 3, 3.5), g('roach', 6, 1, 3)),
    w('거실 혼전', g('mouse', 8, 1), g('mosquito', 6, 1, 4), g('spider', 2, 4, 8)),
  ] },
  { area: 'living', name: 'TV 뒤 거미줄', mul: 1.6, houseHp: 1200, waves: [
    w('거미줄 작전', g('spider', 3, 3), g('mouse', 6, 1.4, 2)),
    w('바퀴 돌격', g('roach', 12, 0.6)),
    w('거미 둥지', g('spider', 5, 2.5), g('ant', 12, 0.4, 3)),
    w('TV 뒤 총력전', g('roach', 10, 0.7), g('spider', 4, 3, 4), g('mosquito', 8, 0.8, 8)),
  ] },
  { area: 'living', name: '[보스] 대왕쥐의 습격', mul: 1.8, houseHp: 1300, waves: [
    w('선발대', g('mouse', 8, 1.1), g('ant', 10, 0.5, 3)),
    w('호위대', g('roach', 8, 0.8), g('spider', 3, 3, 4)),
    w('대왕쥐 등장!', g('mouse', 8, 1.2), g('ratking', 1, 1, 4), g('mosquito', 8, 0.9, 10)),
  ] },
  { area: 'kitchen', name: '싱크대 아래', mul: 2.1, houseHp: 1400, waves: [
    w('물기 찾는 바퀴', g('roach', 14, 0.55)),
    w('개미 대행진', g('ant', 24, 0.3), g('mouse', 6, 1.2, 4)),
    w('싱크대 침공', g('roach', 12, 0.6), g('spider', 4, 3, 3), g('mosquito', 8, 0.8, 6)),
    w('배수구의 공포', g('mouse', 12, 0.9), g('spider', 5, 2.5, 4), g('roach', 10, 0.6, 9)),
  ] },
  { area: 'kitchen', name: '냉장고 뒤편', mul: 2.4, houseHp: 1500, waves: [
    w('모기 편대', g('mosquito', 14, 0.6)),
    w('생쥐 가족', g('mouse', 14, 0.8), g('ant', 14, 0.35, 3)),
    w('냉장고 습격', g('spider', 6, 2), g('roach', 14, 0.5, 4)),
    w('주방 대혼란', g('mouse', 10, 0.8), g('mosquito', 10, 0.7, 3), g('spider', 5, 2.5, 6), g('roach', 12, 0.5, 10)),
  ] },
  { area: 'kitchen', name: '쓰레기통 대작전', mul: 2.8, houseHp: 1600, waves: [
    w('냄새 맡은 무리', g('roach', 16, 0.5), g('ant', 16, 0.3, 2)),
    w('거미 군단', g('spider', 8, 1.6), g('mosquito', 10, 0.7, 4)),
    w('쓰레기통 왕국', g('mouse', 14, 0.7), g('roach', 14, 0.5, 4), g('spider', 5, 2, 8)),
    w('대왕쥐 재림', g('ratking', 1, 1, 2), g('mouse', 10, 1), g('spider', 4, 3, 6), g('mosquito', 10, 0.7, 10)),
  ] },
  { area: 'attic', name: '[보스] 다락방의 쥐왕국', mul: 3.2, houseHp: 1800, waves: [
    w('다락방 정찰대', g('mouse', 14, 0.7), g('ant', 20, 0.3, 2)),
    w('어둠 속 거미', g('spider', 8, 1.5), g('roach', 16, 0.5, 3)),
    w('모기 폭풍', g('mosquito', 20, 0.45), g('mouse', 10, 0.8, 4)),
    w('쥐왕국 최후의 날', g('ratking', 2, 14, 2), g('mouse', 16, 0.8), g('spider', 6, 2.5, 6), g('roach', 16, 0.5, 12), g('mosquito', 12, 0.6, 16)),
  ] },
];

export const STAGES: StageDef[] = RAW.map((s, i) => ({
  ...s,
  id: `s${i + 1}`,
  no: i + 1,
  reward: { coins: 200 + 100 * i, tuna: i % 3 === 2 || s.name.startsWith('[보스]') ? 200 : 100 },
}));
