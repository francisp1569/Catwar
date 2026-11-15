// 전투 화면 버튼 레이아웃 (렌더링과 입력 판정에서 공통 사용)
export interface Rect { x: number; y: number; w: number; h: number; }

export type ButtonId =
  | { type: 'cat'; id: string; slot: number }
  | { type: 'hero' }
  | { type: 'wallet' }
  | { type: 'pause' }
  | { type: 'speed' }
  | { type: 'resume' }
  | { type: 'quit' };

export interface Button { id: ButtonId; rect: Rect; }

export const BAR_Y = 440;

export function buildButtons(deckIds: string[]): Button[] {
  const buttons: Button[] = [];
  buttons.push({ id: { type: 'wallet' }, rect: { x: 10, y: BAR_Y + 8, w: 150, h: 84 } });
  buttons.push({ id: { type: 'hero' }, rect: { x: 168, y: BAR_Y + 8, w: 132, h: 84 } });
  deckIds.forEach((id, i) => {
    buttons.push({ id: { type: 'cat', id, slot: i }, rect: { x: 308 + i * 162, y: BAR_Y + 8, w: 154, h: 84 } });
  });
  buttons.push({ id: { type: 'speed' }, rect: { x: 846, y: 12, w: 46, h: 40 } });
  buttons.push({ id: { type: 'pause' }, rect: { x: 900, y: 12, w: 46, h: 40 } });
  return buttons;
}

/** 일시정지 화면 전용 버튼 */
export const PAUSE_BUTTONS: Button[] = [
  { id: { type: 'resume' }, rect: { x: 330, y: 270, w: 300, h: 56 } },
  { id: { type: 'quit' }, rect: { x: 330, y: 340, w: 300, h: 56 } },
];

export function hit(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function buttonKey(id: ButtonId): string {
  return id.type === 'cat' ? `cat:${id.id}` : id.type;
}
