export type EnemyKind = 'mouse' | 'roach' | 'ant' | 'mosquito' | 'spider' | 'ratking' | 'fly' | 'shieldmouse' | 'roachgen' | 'spiderqueen'
  | 'slug' | 'centipede' | 'pigeon' | 'wasp' | 'mole' | 'frog' | 'goldmouse' | 'beetle' | 'toadking' | 'crowboss' | 'ratemperor';

export interface EnemyDef {
  id: EnemyKind;
  name: string;
  hp: number;
  /** 바리케이드 공격력 */
  atk: number;
  /** 아래로 이동 속도(px/s) */
  speed: number;
  atkInterval: number;
  /** 몸 반지름 */
  size: number;
  xp: number;
  color: string;
  accent: string;
  /** 원거리: 바리케이드에서 이 거리만큼 떨어져 공격 */
  range?: number;
  flying?: boolean;
  boss?: boolean;
  /** 받는 피해 감소 비율 (방패) */
  armor?: number;
  /** 보스가 주기적으로 부하를 부른다 */
  summon?: { kind: EnemyKind; every: number; count: number };
  /** 도감 설명 */
  desc?: string;
  /** 원거리 공격 모양 */
  shot?: 'web' | 'tongue';
  /** 땅속으로 다가오다 바리케이드 앞에서 튀어나옴 (그 전엔 공격 불가) */
  burrow?: boolean;
  /** 폴짝폴짝 뛰어서 이동 */
  hop?: boolean;
  /** 보물 적: 공격하지 않고 잠깐 내려왔다 도망감. 잡으면 코인 */
  flee?: boolean;
  /** 주기적으로 바리케이드에 떨어지는 운석 */
  meteor?: { every: number; dmg: number };
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  ant: { id: 'ant', name: '개미', hp: 14, atk: 3, speed: 46, atkInterval: 0.8, size: 9, xp: 1, color: '#3a2a2a', accent: '#c43d3d' },
  mouse: { id: 'mouse', name: '생쥐', hp: 34, atk: 6, speed: 38, atkInterval: 1.0, size: 15, xp: 2, color: '#a8a3b3', accent: '#f4a7b9' },
  roach: { id: 'roach', name: '바퀴벌레', hp: 24, atk: 5, speed: 82, atkInterval: 0.8, size: 13, xp: 2, color: '#7a4a2a', accent: '#4a2a16' },
  mosquito: { id: 'mosquito', name: '모기', hp: 20, atk: 4, speed: 58, atkInterval: 0.8, size: 12, xp: 2, color: '#5b5b6b', accent: '#e05b5b', flying: true },
  spider: { id: 'spider', name: '거미', hp: 90, atk: 12, speed: 26, atkInterval: 2.0, size: 17, xp: 6, color: '#3c3346', accent: '#b07bd6', range: 190 },
  ratking: { id: 'ratking', name: '대왕쥐', hp: 2600, atk: 50, speed: 14, atkInterval: 1.6, size: 38, xp: 40, color: '#6f6878', accent: '#f4a7b9', boss: true },
  fly: { id: 'fly', name: '파리', hp: 15, atk: 3, speed: 72, atkInterval: 0.6, size: 11, xp: 2, color: '#3f8f5a', accent: '#d04040', flying: true },
  shieldmouse: { id: 'shieldmouse', name: '방패쥐', hp: 110, atk: 9, speed: 24, atkInterval: 1.2, size: 18, xp: 5, color: '#8a6a4a', accent: '#c8c8d0', armor: 0.4 },
  roachgen: { id: 'roachgen', name: '바퀴 장군', hp: 2400, atk: 45, speed: 18, atkInterval: 1.3, size: 36, xp: 40, color: '#6a3a1a', accent: '#5a6a3a', boss: true,
    summon: { kind: 'roach', every: 6, count: 5 } },
  slug: { id: 'slug', name: '해적 민달팽이', hp: 150, atk: 9, speed: 15, atkInterval: 1.4, size: 17, xp: 5, color: '#8fd14f', accent: '#3a6a1a', armor: 0.2 },
  centipede: { id: 'centipede', name: '돌격 지네', hp: 38, atk: 8, speed: 125, atkInterval: 0.7, size: 14, xp: 3, color: '#c8402a', accent: '#5a1a10' },
  pigeon: { id: 'pigeon', name: '복면 비둘기', hp: 110, atk: 10, speed: 40, atkInterval: 1.1, size: 17, xp: 5, color: '#9a9aa8', accent: '#3a3a48', flying: true },
  wasp: { id: 'wasp', name: '비행 말벌', hp: 22, atk: 6, speed: 96, atkInterval: 0.6, size: 12, xp: 2, color: '#e8b830', accent: '#2a2018', flying: true },
  mole: { id: 'mole', name: '광부 두더지', hp: 95, atk: 14, speed: 34, atkInterval: 1.2, size: 17, xp: 6, color: '#7a5034', accent: '#e8b0a0', burrow: true },
  frog: { id: 'frog', name: '깡패 개구리', hp: 60, atk: 9, speed: 48, atkInterval: 0.9, size: 15, xp: 4, color: '#5ab84a', accent: '#c83030', hop: true },
  goldmouse: { id: 'goldmouse', name: '황금쥐', hp: 140, atk: 0, speed: 70, atkInterval: 9, size: 15, xp: 12, color: '#f0c040', accent: '#a07010', flee: true },
  beetle: { id: 'beetle', name: '철갑 사슴벌레', hp: 240, atk: 14, speed: 18, atkInterval: 1.5, size: 22, xp: 9, color: '#3a2a20', accent: '#7a6a60', armor: 0.5 },
  toadking: { id: 'toadking', name: '대왕 두꺼비', hp: 3400, atk: 70, speed: 13, atkInterval: 2.6, size: 42, xp: 50, color: '#a08040', accent: '#ff8fa0', boss: true, range: 130, shot: 'tongue',
    summon: { kind: 'frog', every: 10, count: 3 } },
  crowboss: { id: 'crowboss', name: '까마귀 선장', hp: 3300, atk: 45, speed: 22, atkInterval: 1.2, size: 40, xp: 50, color: '#2a2a34', accent: '#c83030', boss: true, flying: true,
    summon: { kind: 'pigeon', every: 9, count: 2 } },
  ratemperor: { id: 'ratemperor', name: '쥐 황제', hp: 7000, atk: 80, speed: 10, atkInterval: 2, size: 46, xp: 80, color: '#6a5878', accent: '#ffd84d', boss: true,
    summon: { kind: 'ratking', every: 24, count: 1 }, meteor: { every: 6, dmg: 1.4 } },
  spiderqueen: { id: 'spiderqueen', name: '거미 여왕', hp: 3600, atk: 34, speed: 12, atkInterval: 1.8, size: 40, xp: 50, color: '#2e2440', accent: '#c890ff', boss: true, range: 210,
    summon: { kind: 'spider', every: 9, count: 2 } },
};
