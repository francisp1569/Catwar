// 버튼 레이아웃 (렌더링과 입력 판정에서 공통 사용)
import { CAT_ORDER, type CatKind } from './data';

export interface Rect { x: number; y: number; w: number; h: number; }

export type ButtonId =
  | { type: 'cat'; kind: CatKind }
  | { type: 'wallet' }
  | { type: 'pause' }
  | { type: 'speed' };

export interface Button { id: ButtonId; rect: Rect; }

export const BAR_Y = 440;

export function buildButtons(): Button[] {
  const buttons: Button[] = [];
  buttons.push({ id: { type: 'wallet' }, rect: { x: 12, y: BAR_Y + 8, w: 160, h: 84 } });
  CAT_ORDER.forEach((kind, i) => {
    buttons.push({ id: { type: 'cat', kind }, rect: { x: 186 + i * 160, y: BAR_Y + 8, w: 150, h: 84 } });
  });
  buttons.push({ id: { type: 'speed' }, rect: { x: 846, y: 12, w: 46, h: 40 } });
  buttons.push({ id: { type: 'pause' }, rect: { x: 900, y: 12, w: 46, h: 40 } });
  return buttons;
}

export function hit(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
