// 유닛 / 적 / 웨이브 데이터 정의
export type Side = 'cat' | 'enemy';

export type CatKind = 'loaf' | 'yarn' | 'zoomies' | 'boss';
export type EnemyKind = 'mouse' | 'roach' | 'ant' | 'mosquito' | 'spider' | 'ratking';

export interface UnitDef {
  id: string;
  name: string;
  side: Side;
  hp: number;
  atk: number;
  /** 공격 사거리(px, 몸 앞 기준) */
  range: number;
  /** 이동 속도(px/s) */
  speed: number;
  /** 공격 간격(초) */
  atkInterval: number;
  /** 몸 크기(반지름 정도) */
  size: number;
  color: string;
  accent: string;
  /** 투사체 공격이면 설정 */
  projectile?: { speed: number; color: string; radius: number };
  /** 범위 공격 반경 */
  aoe?: number;
  /** 날아다니는 유닛(높이 오프셋) */
  flying?: boolean;
  /** 고양이: 소환 비용 / 재소환 대기 */
  cost?: number;
  cooldown?: number;
  /** 적: 처치 시 츄르 보상 */
  reward?: number;
  desc?: string;
}

export const CATS: Record<CatKind, UnitDef> = {
  loaf: {
    id: 'loaf', name: '식빵냥', side: 'cat',
    hp: 320, atk: 14, range: 18, speed: 32, atkInterval: 1.0, size: 20,
    color: '#f2c38b', accent: '#d9944f',
    cost: 50, cooldown: 2.5, desc: '튼튼한 근접 탱커',
  },
  yarn: {
    id: 'yarn', name: '털뭉치냥', side: 'cat',
    hp: 95, atk: 20, range: 170, speed: 40, atkInterval: 1.4, size: 17,
    color: '#cfd6e4', accent: '#8a95ab',
    projectile: { speed: 340, color: '#ff7eb6', radius: 6 },
    cost: 75, cooldown: 4, desc: '털뭉치 원거리 투척',
  },
  zoomies: {
    id: 'zoomies', name: '우다다냥', side: 'cat',
    hp: 80, atk: 9, range: 14, speed: 115, atkInterval: 0.4, size: 15,
    color: '#3b3b46', accent: '#1f1f27',
    cost: 40, cooldown: 1.5, desc: '빠른 돌격형',
  },
  boss: {
    id: 'boss', name: '대장냥', side: 'cat',
    hp: 650, atk: 48, range: 28, speed: 24, atkInterval: 1.8, size: 28,
    color: '#f5f0e6', accent: '#e08a3c', aoe: 70,
    cost: 220, cooldown: 14, desc: '광역 냥펀치',
  },
};

export const CAT_ORDER: CatKind[] = ['loaf', 'yarn', 'zoomies', 'boss'];

export const ENEMIES: Record<EnemyKind, UnitDef> = {
  mouse: {
    id: 'mouse', name: '생쥐', side: 'enemy',
    hp: 95, atk: 11, range: 14, speed: 48, atkInterval: 1.0, size: 15,
    color: '#a8a3b3', accent: '#f4a7b9', reward: 6,
  },
  roach: {
    id: 'roach', name: '바퀴벌레', side: 'enemy',
    hp: 60, atk: 9, range: 10, speed: 105, atkInterval: 0.7, size: 13,
    color: '#7a4a2a', accent: '#4a2a16', reward: 5,
  },
  ant: {
    id: 'ant', name: '개미', side: 'enemy',
    hp: 34, atk: 6, range: 8, speed: 62, atkInterval: 0.6, size: 9,
    color: '#3a2a2a', accent: '#c43d3d', reward: 2,
  },
  mosquito: {
    id: 'mosquito', name: '모기', side: 'enemy',
    hp: 50, atk: 8, range: 12, speed: 72, atkInterval: 0.8, size: 11,
    color: '#5b5b6b', accent: '#e05b5b', flying: true, reward: 5,
  },
  spider: {
    id: 'spider', name: '거미', side: 'enemy',
    hp: 190, atk: 20, range: 130, speed: 30, atkInterval: 1.8, size: 17,
    color: '#3c3346', accent: '#b07bd6',
    projectile: { speed: 260, color: '#ffffff', radius: 5 }, reward: 14,
  },
  ratking: {
    id: 'ratking', name: '대왕쥐', side: 'enemy',
    hp: 3200, atk: 65, range: 26, speed: 18, atkInterval: 1.6, size: 34,
    color: '#6f6878', accent: '#f4a7b9', aoe: 60, reward: 120,
  },
};

export interface SpawnGroup {
  kind: EnemyKind;
  count: number;
  /** 같은 그룹 내 출현 간격(초) */
  interval: number;
  /** 웨이브 시작 후 지연(초) */
  delay: number;
}

export interface WaveDef {
  name: string;
  groups: SpawnGroup[];
}

export const WAVES: WaveDef[] = [
  { name: '생쥐 정찰대', groups: [{ kind: 'mouse', count: 4, interval: 2.2, delay: 1 }] },
  { name: '개미 행렬', groups: [
    { kind: 'ant', count: 8, interval: 0.8, delay: 0 },
    { kind: 'mouse', count: 2, interval: 3, delay: 4 },
  ] },
  { name: '바퀴 습격', groups: [
    { kind: 'roach', count: 5, interval: 1.4, delay: 0 },
    { kind: 'mouse', count: 3, interval: 2, delay: 3 },
  ] },
  { name: '한밤의 모기', groups: [
    { kind: 'mosquito', count: 6, interval: 1.2, delay: 0 },
    { kind: 'ant', count: 6, interval: 0.6, delay: 5 },
  ] },
  { name: '거미줄 작전', groups: [
    { kind: 'mouse', count: 6, interval: 1.5, delay: 0 },
    { kind: 'spider', count: 2, interval: 5, delay: 3 },
    { kind: 'roach', count: 6, interval: 1, delay: 8 },
  ] },
  { name: '대혼란', groups: [
    { kind: 'ant', count: 16, interval: 0.4, delay: 0 },
    { kind: 'mosquito', count: 8, interval: 1, delay: 3 },
    { kind: 'spider', count: 3, interval: 3.5, delay: 6 },
    { kind: 'roach', count: 9, interval: 0.8, delay: 9 },
  ] },
  { name: '대왕쥐 등장!', groups: [
    { kind: 'mouse', count: 10, interval: 1.2, delay: 0 },
    { kind: 'ratking', count: 1, interval: 1, delay: 5 },
    { kind: 'spider', count: 4, interval: 4, delay: 8 },
    { kind: 'roach', count: 12, interval: 0.9, delay: 12 },
    { kind: 'mosquito', count: 8, interval: 0.8, delay: 16 },
  ] },
];

export const CONFIG = {
  width: 960,
  height: 540,
  laneY: 372,
  houseX: 118,      // 집 앞면(적이 공격하는 위치)
  holeX: 880,       // 적 스폰 위치
  houseHp: 1200,
  waveGap: 4,       // 웨이브 사이 휴식(초)
  wallet: {
    maxLevel: 6,
    capBase: 250, capPerLevel: 120,
    regenBase: 14, regenPerLevel: 7,
    upgradeCostBase: 70,
  },
};
