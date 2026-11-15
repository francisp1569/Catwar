export type EnemyKind = 'mouse' | 'roach' | 'ant' | 'mosquito' | 'spider' | 'ratking';

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
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  ant: { id: 'ant', name: '개미', hp: 14, atk: 3, speed: 46, atkInterval: 0.8, size: 9, xp: 1, color: '#3a2a2a', accent: '#c43d3d' },
  mouse: { id: 'mouse', name: '생쥐', hp: 34, atk: 6, speed: 38, atkInterval: 1.0, size: 15, xp: 2, color: '#a8a3b3', accent: '#f4a7b9' },
  roach: { id: 'roach', name: '바퀴벌레', hp: 24, atk: 5, speed: 82, atkInterval: 0.8, size: 13, xp: 2, color: '#7a4a2a', accent: '#4a2a16' },
  mosquito: { id: 'mosquito', name: '모기', hp: 20, atk: 4, speed: 58, atkInterval: 0.8, size: 12, xp: 2, color: '#5b5b6b', accent: '#e05b5b', flying: true },
  spider: { id: 'spider', name: '거미', hp: 90, atk: 12, speed: 26, atkInterval: 2.0, size: 17, xp: 6, color: '#3c3346', accent: '#b07bd6', range: 190 },
  ratking: { id: 'ratking', name: '대왕쥐', hp: 2600, atk: 50, speed: 14, atkInterval: 1.6, size: 38, xp: 40, color: '#6f6878', accent: '#f4a7b9', boss: true },
};
