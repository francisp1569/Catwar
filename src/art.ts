// 외부 그림(PNG/JPG) 교체 시스템.
// public/art/manifest.json 예시:
//   { "godeungeo": ["back", "face"],                              → godeungeo-back.png, godeungeo-face.png
//     "cheese": { "face": "cheese-face.jpg", "faceFocus": [0.52, 0.6, 0.3] } }
// faceFocus = [얼굴 중심 x, y, 반지름] (그림 가로 대비 비율). 동그란 아이콘으로 자를 때 사용.
export type ArtKind = 'back' | 'face' | 'card' | 'full';

type Entry = ArtKind[] | Partial<Record<ArtKind, string>> & { faceFocus?: [number, number, number]; fullFocus?: [number, number, number] };

const images = new Map<string, HTMLImageElement>();
const focus = new Map<string, [number, number, number]>();
const fullFocus = new Map<string, [number, number, number]>();

export async function loadArt(): Promise<void> {
  try {
    const res = await fetch('art/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const manifest = (await res.json()) as Record<string, Entry>;
    const loads: Promise<void>[] = [];
    for (const [id, entry] of Object.entries(manifest)) {
      const files: [ArtKind, string][] = Array.isArray(entry)
        ? entry.map((k) => [k, `${id}-${k}.png`])
        : (['back', 'face', 'card', 'full'] as ArtKind[]).filter((k) => typeof entry[k] === 'string').map((k) => [k, entry[k] as string]);
      if (!Array.isArray(entry) && entry.faceFocus) focus.set(id, entry.faceFocus);
      if (!Array.isArray(entry) && entry.fullFocus) fullFocus.set(id, entry.fullFocus);
      for (const [kind, file] of files) {
        const img = new Image();
        loads.push(new Promise((ok) => { img.onload = () => ok(); img.onerror = () => ok(); }));
        img.src = `art/cats/${file}`;
        images.set(`${id}-${kind}`, img);
      }
    }
    await Promise.all(loads);
  } catch {
    /* 그림이 없으면 코드로 그린 그림 사용 */
  }
}

export function getArt(id: string, kind: ArtKind): HTMLImageElement | null {
  const img = images.get(`${id}-${kind}`);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/** 얼굴 그림을 (cx, cy) 중심 반지름 r 원 안에 얼굴이 꽉 차도록 그린다 */
export function drawFaceArtCircle(ctx: CanvasRenderingContext2D, id: string, img: HTMLImageElement, cx: number, cy: number, r: number): void {
  const [fx, fy, fr] = focus.get(id) ?? [0.5, 0.5, 0.5];
  const scale = r / (fr * img.naturalWidth);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, cx - fx * img.naturalWidth * scale, cy - fy * img.naturalHeight * scale, img.naturalWidth * scale, img.naturalHeight * scale);
  ctx.restore();
}

export function getFocus(id: string): [number, number, number] {
  return focus.get(id) ?? [0.5, 0.5, 0.5];
}

/** 얼굴 중심으로 정사각형을 잘라 (dx,dy,size) 칸에 그린다 */
export function drawFaceArtSquare(ctx: CanvasRenderingContext2D, id: string, img: HTMLImageElement, dx: number, dy: number, size: number): void {
  const [fx, fy, fr] = getFocus(id);
  const side = Math.min(img.naturalWidth, img.naturalHeight, fr * 2.7 * img.naturalWidth);
  const sx = Math.max(0, Math.min(img.naturalWidth - side, fx * img.naturalWidth - side / 2));
  const sy = Math.max(0, Math.min(img.naturalHeight - side, fy * img.naturalHeight - side / 2));
  ctx.drawImage(img, sx, sy, side, side, dx, dy, size, size);
}

/** 전신 일러스트에서 상반신(얼굴~허리)을 잘라 (dx,dy,dw,dh) 칸에 그린다 */
export function drawBustArt(ctx: CanvasRenderingContext2D, id: string, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number): void {
  const [fx, fy, fr] = fullFocus.get(id) ?? getFocus(id);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  let sw = Math.min(W, fr * W * 4.2);
  let sh = (sw * dh) / dw;
  if (sh > H) { sh = H; sw = (sh * dw) / dh; }
  const sx = Math.max(0, Math.min(W - sw, fx * W - sw / 2));
  const sy = Math.max(0, Math.min(H - sh, fy * H - fr * W * 1.25));
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// ───────────── 적·배경·아이콘 그림 (public/art/world) ─────────────
// 파일이 없으면 기존처럼 코드로 그린 그림/이모지를 쓴다.
export const WORLD_FILES: Record<string, string> = {};
const ENEMY_ART = ['ant', 'mouse', 'roach', 'mosquito', 'spider', 'ratking', 'fly', 'shieldmouse', 'roachgen', 'spiderqueen'];
for (const id of ENEMY_ART) WORLD_FILES[`enemy-${id}`] = `enemies/${id}.webp`;
for (const id of ['vacuum', 'web', 'girl-happy', 'girl-worried', 'girl-cry', 'barricade']) WORLD_FILES[id] = `props/${id}.webp`;
for (const id of ['entrance', 'living', 'kitchen', 'attic']) WORLD_FILES[`bg-${id}`] = `bg/${id}.jpg`;
export const ICON_IDS = [
  'coin', 'tuna', 'yarn', 'chest', 'chest-open', 'chest-royal',
  ...['cheese', 'godeungeo', 'huindungi', 'chaos', 'cheesetabby', 'tuxedo', 'samsaek', 'russianblue', 'scottish', 'munchkin',
    'persian', 'mainecoon', 'siamese', 'cow', 'americanshort', 'abyssinian', 'norwegian', 'ragdoll', 'bengal', 'sphynx'].map((c) => `w-${c}`),
  'eq-collar-N', 'eq-collar-R', 'eq-collar-SR', 'eq-collar-SSR', 'eq-hat-N', 'eq-hat-R', 'eq-toy-R', 'eq-toy-SR', 'eq-cushion', 'eq-bowl', 'eq-bell',
];
for (const id of ICON_IDS) WORLD_FILES[id] = `icons/${id}.webp`;

const world = new Map<string, HTMLImageElement>();

export async function loadWorldArt(): Promise<void> {
  await Promise.all(Object.entries(WORLD_FILES).map(([id, file]) => new Promise<void>((ok) => {
    const img = new Image();
    img.onload = () => { world.set(id, img); ok(); };
    img.onerror = () => ok();
    img.src = `art/world/${file}`;
  })));
}

export function getWorld(id: string): HTMLImageElement | null {
  return world.get(id) ?? null;
}

/** DOM용 아이콘 태그 (그림이 없으면 대신 쓸 이모지) */
export function iconHtml(id: string, fallback: string, cls = 'ico-img'): string {
  return world.has(id) ? `<img class="${cls}" src="art/world/${WORLD_FILES[id]}" alt="">` : fallback;
}
