export type EnemyKind = 'mouse' | 'roach' | 'ant' | 'mosquito' | 'spider' | 'ratking';

export interface EnemyDef {
  id: EnemyKind;
  name: string;
  hp: number;
  atk: number;
  range: number;
  speed: number;
  atkInterval: number;
  size: number;
  color: string;
  accent: string;
  reward: number;
  projectile?: { speed: number; color: string; radius: number };
  aoe?: number;
  flying?: boolean;
  boss?: boolean;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mouse: { id: 'mouse', name: '생쥐', hp: 95, atk: 11, range: 14, speed: 48, atkInterval: 1.0, size: 15, color: '#a8a3b3', accent: '#f4a7b9', reward: 6 },
  roach: { id: 'roach', name: '바퀴벌레', hp: 60, atk: 9, range: 10, speed: 105, atkInterval: 0.7, size: 13, color: '#7a4a2a', accent: '#4a2a16', reward: 5 },
  ant: { id: 'ant', name: '개미', hp: 34, atk: 6, range: 8, speed: 62, atkInterval: 0.6, size: 9, color: '#3a2a2a', accent: '#c43d3d', reward: 2 },
  mosquito: { id: 'mosquito', name: '모기', hp: 50, atk: 8, range: 12, speed: 72, atkInterval: 0.8, size: 11, color: '#5b5b6b', accent: '#e05b5b', flying: true, reward: 5 },
  spider: { id: 'spider', name: '거미', hp: 190, atk: 20, range: 130, speed: 30, atkInterval: 1.8, size: 17, color: '#3c3346', accent: '#b07bd6', projectile: { speed: 260, color: '#ffffff', radius: 5 }, reward: 14 },
  ratking: { id: 'ratking', name: '대왕쥐', hp: 3200, atk: 65, range: 26, speed: 18, atkInterval: 1.6, size: 34, color: '#6f6878', accent: '#f4a7b9', aoe: 60, reward: 120, boss: true },
};
