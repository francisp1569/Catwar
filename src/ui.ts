// 전투 화면 버튼 레이아웃 (세로 540x960). 렌더링과 입력 판정에서 공통 사용.
export interface Rect { x: number; y: number; w: number; h: number; }

export type ButtonId =
  | { type: 'pause' }
  | { type: 'speed' }
  | { type: 'rally' }
  | { type: 'card'; index: number }
  | { type: 'reroll' }
  | { type: 'resume' }
  | { type: 'quit' }
  | { type: 'sound' }
  | { type: 'next' }
  | { type: 'retry' }
  | { type: 'lobby' };

export interface Button { id: ButtonId; rect: Rect; }

export const HUD_BUTTONS: Button[] = [
  { id: { type: 'pause' }, rect: { x: 10, y: 10, w: 44, h: 40 } },
  { id: { type: 'speed' }, rect: { x: 484, y: 10, w: 46, h: 40 } },
  { id: { type: 'rally' }, rect: { x: 462, y: 640, w: 68, h: 68 } }, // y는 layoutButtons에서 갱신
];

export const CHOICE_BUTTONS: Button[] = [
  ...[0, 1, 2].map((i) => ({ id: { type: 'card' as const, index: i }, rect: { x: 14 + i * 174, y: 330, w: 164, h: 290 } })),
  { id: { type: 'reroll' }, rect: { x: 150, y: 660, w: 240, h: 62 } },
];

export const PAUSE_BUTTONS: Button[] = [
  { id: { type: 'resume' }, rect: { x: 120, y: 420, w: 300, h: 60 } },
  { id: { type: 'quit' }, rect: { x: 120, y: 500, w: 300, h: 60 } },
  { id: { type: 'sound' }, rect: { x: 120, y: 580, w: 300, h: 60 } },
];

export function hit(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function buttonKey(id: ButtonId): string {
  return id.type === 'card' ? `card:${id.index}` : id.type;
}

/** 결과 화면 버튼: [로비로, 다음 스테이지 또는 다시 도전] */
export const RESULT_BUTTONS: Button[] = [
  { id: { type: 'lobby' }, rect: { x: 40, y: 760, w: 200, h: 64 } },
  { id: { type: 'next' }, rect: { x: 256, y: 760, w: 244, h: 64 } },
];

/** 바닥 기준 버튼 위치 갱신 */
export function layoutButtons(height: number): void {
  const rally = HUD_BUTTONS.find((b) => b.id.type === 'rally')!;
  rally.rect.y = height - 320;
  const off = (height - 960) / 2;
  CHOICE_BUTTONS.forEach((b) => { b.rect.y = (b.id.type === 'reroll' ? 660 : 330) + off; });
  PAUSE_BUTTONS.forEach((b, i) => { b.rect.y = 420 + i * 80 + off; });
  RESULT_BUTTONS.forEach((b) => { b.rect.y = height - 190; });
}
