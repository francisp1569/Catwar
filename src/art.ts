// 외부 그림(PNG/JPG) 교체 시스템.
// public/art/manifest.json 예시:
//   { "godeungeo": ["back", "face"],                              → godeungeo-back.png, godeungeo-face.png
//     "cheese": { "face": "cheese-face.jpg", "faceFocus": [0.52, 0.6, 0.3] } }
// faceFocus = [얼굴 중심 x, y, 반지름] (그림 가로 대비 비율). 동그란 아이콘으로 자를 때 사용.
export type ArtKind = 'back' | 'face' | 'card';

type Entry = ArtKind[] | Partial<Record<ArtKind, string>> & { faceFocus?: [number, number, number] };

const images = new Map<string, HTMLImageElement>();
const focus = new Map<string, [number, number, number]>();

export async function loadArt(): Promise<void> {
  try {
    const res = await fetch('art/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const manifest = (await res.json()) as Record<string, Entry>;
    const loads: Promise<void>[] = [];
    for (const [id, entry] of Object.entries(manifest)) {
      const files: [ArtKind, string][] = Array.isArray(entry)
        ? entry.map((k) => [k, `${id}-${k}.png`])
        : (['back', 'face', 'card'] as ArtKind[]).filter((k) => typeof entry[k] === 'string').map((k) => [k, entry[k] as string]);
      if (!Array.isArray(entry) && entry.faceFocus) focus.set(id, entry.faceFocus);
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
